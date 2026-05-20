import { ConflictError, NotFoundError } from '../../../utils/errors';
import {
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  withEcosystemIdempotencyLock,
} from '../../../utils/ecosystem-idempotency';
import {
  CreateLeadScoringDtoType,
  LeadScoringStatusDto,
  LeadScoringStatusDtoType,
  RunLeadScoringDtoType,
} from '../dto/lead-scoring.dto';
import { getAiClient } from '../../../integrations';
import { LeadScoringRepository } from '../repository/lead-scoring.repository';

export class LeadScoringService {
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different lead scoring run parameters';

  private readonly repo = new LeadScoringRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateLeadScoringDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.modelPreset);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunLeadScoringDtoType, rawIdempotencyKey?: string) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Lead Scoring workspace');

    const idempotencyKey = normalizeEcosystemIdempotencyKey(rawIdempotencyKey);

    const execute = async () => {
      const estRevenue = Number(dto.revenueEstimate ?? 50);
      const base = 40 + Math.round(dto.intensity / 2);
      let score = Math.min(100, dto.mode === 'rank' ? base + 5 : dto.mode === 'refresh' ? base - 3 : base);
      const ai = getAiClient();
      let aiBands: string[] | null = null;
      if (dto.mode === 'rank' && ai.isConfigured()) {
        const rec = await ai.fetchRecommendations({ preset: 'lead-scoring', intensity: dto.intensity });
        aiBands = rec?.recommendations ?? null;
        if (aiBands?.length) {
          score = Math.min(100, score + Math.min(15, aiBands.length * 3));
        }
      }
      const band = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

      const outputPayload = {
        score,
        band,
        estimatedRevenue: estRevenue,
        mode: dto.mode,
        intensity: dto.intensity,
        ai_recommendations: aiBands,
        idempotency_key: idempotencyKey || null,
      };

      const { rows } = await this.repo.createRun(systemId, `lead-scoring_${dto.mode}`, outputPayload);
      await this.repo.updateAfterRun(systemId, estRevenue, dto.mode, dto.intensity, band, score);
      return rows[0];
    };

    if (idempotencyKey) {
      return withEcosystemIdempotencyLock(systemId, idempotencyKey, async () => {
        const { rows: existingRuns } = await findRecentEcosystemRunByIdempotencyKey(systemId, idempotencyKey);
        if (existingRuns[0]) {
          this.assertIdempotentPayloadMatches(existingRuns[0], dto);
          return existingRuns[0];
        }
        return execute();
      });
    }

    return execute();
  }

  private assertIdempotentPayloadMatches(row: Record<string, unknown>, dto: RunLeadScoringDtoType) {
    const replayPayload = row.output_payload as
      | { mode?: unknown; intensity?: unknown; estimatedRevenue?: unknown }
      | undefined;
    const sameMode = replayPayload?.mode === dto.mode;
    const sameIntensity = replayPayload?.intensity === dto.intensity;
    const effectiveRevenue = Number(dto.revenueEstimate ?? 50);
    const priorRevenue =
      typeof replayPayload?.estimatedRevenue === 'number' && Number.isFinite(replayPayload.estimatedRevenue)
        ? replayPayload.estimatedRevenue
        : 50;
    const sameRevenue = priorRevenue === effectiveRevenue;
    if (!sameMode || !sameIntensity || !sameRevenue) {
      throw new ConflictError(LeadScoringService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
  }

  async status(): Promise<LeadScoringStatusDtoType> {
    const status = {
      presets: ['standard', 'aggressive', 'conservative'] as const,
      defaultPreset: 'standard' as const,
      scoreRange: { min: 0, max: 100 },
    };
    return LeadScoringStatusDto.parse(status);
  }
}
