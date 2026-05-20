import { ConflictError, NotFoundError } from '../../../utils/errors';
import {
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  withEcosystemIdempotencyLock,
} from '../../../utils/ecosystem-idempotency';
import {
  CreateDealOfferDtoType,
  DealOfferStatusDto,
  DealOfferStatusDtoType,
  RunDealOfferDtoType,
} from '../dto/deal-offer.dto';
import { getAiClient, getCommsClient } from '../../../integrations';
import { DealOfferRepository } from '../repository/deal-offer.repository';

export class DealOfferService {
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different deal offer run parameters';

  private readonly repo = new DealOfferRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateDealOfferDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.mode);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunDealOfferDtoType, rawIdempotencyKey?: string) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Deal Offer workspace');

    const idempotencyKey = normalizeEcosystemIdempotencyKey(rawIdempotencyKey);

    const execute = async () => {
      const inputPayload: Record<string, unknown> = {
        mode: dto.mode,
        intensity: dto.intensity,
      };
      if (dto.revenueEstimate !== undefined) {
        inputPayload.revenueEstimate = dto.revenueEstimate;
      }

      const base = Number(dto.revenueEstimate ?? 40);
      const modeMultiplier = dto.mode === 'draft' ? 0.6 : dto.mode === 'negotiate' ? 1.0 : 1.45;
      const estRevenue = Math.max(1, Math.round(base * modeMultiplier * (dto.intensity / 50)));
      const negotiatedDelta = dto.mode === 'negotiate' || dto.mode === 'close' ? 1 : 0;
      const closedDelta = dto.mode === 'close' ? 1 : 0;
      const winProbability = Math.min(99, 35 + Math.round(dto.intensity / 2));

      const comms = getCommsClient();
      let commsDispatched = false;
      if (comms.isConfigured() && (dto.mode === 'negotiate' || dto.mode === 'close')) {
        await comms.request('POST', '/v1/deal-offer/notify', {
          systemId,
          mode: dto.mode,
          estimatedRevenue: estRevenue,
          intensity: dto.intensity,
        });
        commsDispatched = true;
      }

      const ai = getAiClient();
      let aiRecommendations: string[] | undefined;
      if (ai.isConfigured() && dto.mode === 'negotiate') {
        const rec = await ai.fetchRecommendations({
          module: 'deal-offer',
          mode: dto.mode,
          intensity: dto.intensity,
          estimatedRevenue: estRevenue,
        });
        if (rec?.recommendations?.length) {
          aiRecommendations = rec.recommendations;
        }
      }

      const outputPayload = {
        estimatedRevenue: estRevenue,
        mode: dto.mode,
        intensity: dto.intensity,
        winProbability,
        comms_dispatched: commsDispatched,
        ai_recommendations: aiRecommendations ?? null,
        idempotency_key: idempotencyKey || null,
      };

      const { rows } = await this.repo.createRun(
        systemId,
        `deal-offer_${dto.mode}`,
        inputPayload,
        outputPayload
      );
      await this.repo.updateAfterRun(systemId, estRevenue, dto.mode, dto.intensity, negotiatedDelta, closedDelta);
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

  private assertIdempotentPayloadMatches(row: Record<string, unknown>, dto: RunDealOfferDtoType) {
    const replayPayload = row.output_payload as
      | { mode?: unknown; intensity?: unknown; estimatedRevenue?: unknown }
      | undefined;
    const sameMode = replayPayload?.mode === dto.mode;
    const sameIntensity = replayPayload?.intensity === dto.intensity;
    const base = Number(dto.revenueEstimate ?? 40);
    const modeMultiplier = dto.mode === 'draft' ? 0.6 : dto.mode === 'negotiate' ? 1.0 : 1.45;
    const expectedRevenue = Math.max(1, Math.round(base * modeMultiplier * (dto.intensity / 50)));
    const priorEstimate =
      typeof replayPayload?.estimatedRevenue === 'number' && Number.isFinite(replayPayload.estimatedRevenue)
        ? replayPayload.estimatedRevenue
        : expectedRevenue;
    const sameEstimate = priorEstimate === expectedRevenue;
    if (!sameMode || !sameIntensity || !sameEstimate) {
      throw new ConflictError(DealOfferService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
  }

  async status(): Promise<DealOfferStatusDtoType> {
    const status = {
      modes: ['draft', 'negotiate', 'close'] as const,
      activeMode: 'draft' as const,
      pipeline: {
        maxConcurrentOffers: 200,
        cooldownSeconds: 20,
      },
    };
    return DealOfferStatusDto.parse(status);
  }
}
