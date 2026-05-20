import { ConflictError, NotFoundError } from '../../../utils/errors';
import {
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  withEcosystemIdempotencyLock,
} from '../../../utils/ecosystem-idempotency';
import {
  CreateFollowUpDtoType,
  FollowUpStatusDto,
  FollowUpStatusDtoType,
  RunFollowUpDtoType,
} from '../dto/follow-up.dto';
import { getCommsClient } from '../../../integrations';
import { FollowUpRepository } from '../repository/follow-up.repository';

export class FollowUpService {
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different follow-up run parameters';

  private readonly repo = new FollowUpRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateFollowUpDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.cadencePreset);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunFollowUpDtoType, rawIdempotencyKey?: string) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Follow-up workspace');

    const idempotencyKey = normalizeEcosystemIdempotencyKey(rawIdempotencyKey);

    const execute = async () => {
      const estRevenue = Number(dto.revenueEstimate ?? 50);
      const touchMultiplier =
        dto.mode === 'schedule' ? 1.15 : dto.mode === 'escalate' ? 1.25 : 0.9;
      const touchpointsScheduled = Math.max(1, Math.round((dto.intensity / 10) * touchMultiplier));
      const completionScore = Math.min(100, 52 + Math.round(dto.intensity / 3));
      const comms = getCommsClient();
      let commsDispatched = false;
      if (comms.isConfigured() && (dto.mode === 'schedule' || dto.mode === 'escalate')) {
        await comms.request('POST', '/v1/follow-up/dispatch', {
          systemId,
          mode: dto.mode,
          touchpointsScheduled,
          intensity: dto.intensity,
        });
        commsDispatched = true;
      }

      const outputPayload = {
        touchpointsScheduled,
        completionScore,
        estimatedRevenue: estRevenue,
        mode: dto.mode,
        intensity: dto.intensity,
        comms_dispatched: commsDispatched,
        idempotency_key: idempotencyKey || null,
      };

      const { rows } = await this.repo.createRun(systemId, `follow-up_${dto.mode}`, outputPayload);
      await this.repo.updateAfterRun(systemId, estRevenue, dto.mode, dto.intensity, touchpointsScheduled);
      return rows[0];
    };

    if (idempotencyKey) {
      return withEcosystemIdempotencyLock(systemId, idempotencyKey, async () => {
        const { rows: existingRuns } = await findRecentEcosystemRunByIdempotencyKey(systemId, idempotencyKey);
        if (existingRuns[0]) {
          this.assertIdempotentPayloadMatches(existingRuns[0], dto.mode, dto.intensity);
          return existingRuns[0];
        }
        return execute();
      });
    }

    return execute();
  }

  private assertIdempotentPayloadMatches(row: Record<string, unknown>, mode: string, intensity: number) {
    const replayPayload = row.output_payload as { mode?: unknown; intensity?: unknown } | undefined;
    const sameMode = replayPayload?.mode === mode;
    const sameIntensity = replayPayload?.intensity === intensity;
    if (!sameMode || !sameIntensity) {
      throw new ConflictError(FollowUpService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
  }

  async status(): Promise<FollowUpStatusDtoType> {
    const status = {
      cadences: ['steady', 'persistent', 'light'] as const,
      activeCadence: 'steady' as const,
      pipelineCapacity: {
        maxTouchpointsPerRun: 400,
        cooldownSeconds: 25,
      },
    };
    return FollowUpStatusDto.parse(status);
  }
}
