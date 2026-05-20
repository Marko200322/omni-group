import { ConflictError, NotFoundError } from '../../../utils/errors';
import {
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  withEcosystemIdempotencyLock,
} from '../../../utils/ecosystem-idempotency';
import {
  OutreachStatusDto,
  OutreachStatusDtoType,
  CreateOutreachDtoType,
  RunOutreachDtoType,
} from '../dto/outreach.dto';
import { getCommsClient } from '../../../integrations';
import { OutreachRepository } from '../repository/outreach.repository';

export class OutreachService {
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different outreach run parameters';

  private readonly repo = new OutreachRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateOutreachDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.channelFocus);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunOutreachDtoType, rawIdempotencyKey?: string) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Outreach workspace');

    const idempotencyKey = normalizeEcosystemIdempotencyKey(rawIdempotencyKey);

    const execute = async () => {
      const estRevenue = Number(dto.revenueEstimate ?? 50);
      const volumeMultiplier = dto.mode === 'send' ? 1.2 : dto.mode === 'sequence' ? 1.0 : 0.85;
      const messagesSent = Math.max(1, Math.round((dto.intensity / 10) * volumeMultiplier));
      const engagementScore = Math.min(100, 55 + Math.round(dto.intensity / 3));
      const comms = getCommsClient();
      let commsDispatched = false;
      if (comms.isConfigured() && (dto.mode === 'send' || dto.mode === 'sequence')) {
        await comms.request('POST', '/v1/outreach/dispatch', {
          systemId,
          mode: dto.mode,
          messagesSent,
          intensity: dto.intensity,
        });
        commsDispatched = true;
      }

      const outputPayload = {
        messagesSent,
        engagementScore,
        estimatedRevenue: estRevenue,
        mode: dto.mode,
        intensity: dto.intensity,
        comms_dispatched: commsDispatched,
        idempotency_key: idempotencyKey || null,
      };

      const { rows } = await this.repo.createRun(systemId, `outreach_${dto.mode}`, outputPayload);
      await this.repo.updateAfterRun(systemId, estRevenue, dto.mode, dto.intensity, messagesSent);
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
      throw new ConflictError(OutreachService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
  }

  async status(): Promise<OutreachStatusDtoType> {
    const status = {
      channels: ['email', 'sms', 'linkedin', 'push'] as const,
      dailyCap: 500,
    };
    return OutreachStatusDto.parse(status);
  }
}
