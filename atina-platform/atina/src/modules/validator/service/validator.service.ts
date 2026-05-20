import { ConflictError, NotFoundError } from '../../../utils/errors';
import {
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  withEcosystemIdempotencyLock,
} from '../../../utils/ecosystem-idempotency';
import {
  CreateValidatorDtoType,
  RunValidatorDtoType,
  ValidatorStatusDto,
  ValidatorStatusDtoType,
} from '../dto/validator.dto';
import { getAiClient } from '../../../integrations';
import { ValidatorRepository } from '../repository/validator.repository';

export class ValidatorService {
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different validator run parameters';

  private readonly repo = new ValidatorRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateValidatorDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.profile);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunValidatorDtoType, rawIdempotencyKey?: string) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Validator workspace');

    const idempotencyKey = normalizeEcosystemIdempotencyKey(rawIdempotencyKey);

    const execute = async () => {
      const estValue = Number(dto.valueEstimate ?? 45);
      const modeMultiplier = dto.mode === 'validate' ? 1.2 : dto.mode === 'sanitize' ? 1.0 : 0.85;
      const itemsProcessed = Math.max(1, Math.round((dto.intensity / 10) * modeMultiplier));
      const qualityScore = Math.min(100, 52 + Math.round(dto.intensity / 3));

      const ai = getAiClient();
      let aiEnriched = false;
      if (ai.isConfigured() && dto.mode === 'enrich') {
        await ai.fetchRecommendations({
          module: 'validator',
          mode: dto.mode,
          itemsProcessed,
          intensity: dto.intensity,
        });
        aiEnriched = true;
      }

      const outputPayload = {
        itemsProcessed,
        qualityScore,
        estimatedValue: estValue,
        mode: dto.mode,
        intensity: dto.intensity,
        ai_enriched: aiEnriched,
        idempotency_key: idempotencyKey || null,
      };

      const { rows } = await this.repo.createRun(systemId, `validator_${dto.mode}`, outputPayload);
      await this.repo.updateAfterRun(systemId, estValue, dto.mode, dto.intensity, itemsProcessed);
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

  private assertIdempotentPayloadMatches(row: Record<string, unknown>, dto: RunValidatorDtoType) {
    const replayPayload = row.output_payload as
      | { mode?: unknown; intensity?: unknown; estimatedValue?: unknown }
      | undefined;
    const sameMode = replayPayload?.mode === dto.mode;
    const sameIntensity = replayPayload?.intensity === dto.intensity;
    const effectiveEstimate = Number(dto.valueEstimate ?? 45);
    const priorEstimate =
      typeof replayPayload?.estimatedValue === 'number' && Number.isFinite(replayPayload.estimatedValue)
        ? replayPayload.estimatedValue
        : 45;
    const sameEstimate = priorEstimate === effectiveEstimate;
    if (!sameMode || !sameIntensity || !sameEstimate) {
      throw new ConflictError(ValidatorService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
  }

  async status(): Promise<ValidatorStatusDtoType> {
    const status = {
      modes: ['validate', 'sanitize', 'enrich'] as const,
      activeMode: 'validate' as const,
      pipelineCapacity: {
        maxItemsPerRun: 750,
        cooldownSeconds: 20,
      },
    };
    return ValidatorStatusDto.parse(status);
  }
}
