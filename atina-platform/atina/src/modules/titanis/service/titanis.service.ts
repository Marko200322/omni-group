import { getAiClient, getCommsClient } from '../../../integrations';
import { AppError, NotFoundError } from '../../../utils/errors';
import { TitanisRepository } from '../repository/titanis.repository';
import { CreateTitanisWorkspaceDtoType, RunTitanisDtoType } from '../dto/titanis.dto';

export class TitanisService {
  private readonly repo = new TitanisRepository();
  private static readonly DEFAULT_CHANNEL = 'mixed';

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateTitanisWorkspaceDtoType) {
    const { rows } = await this.repo.create(
      userId,
      dto.name,
      dto.budgetAllocated,
      dto.outreachChannel
    );
    const row = rows[0];
    if (row?.id) {
      await this.repo.auditWorkspaceCreated(userId, row.id as string, { name: dto.name });
    }
    return row;
  }

  async run(systemId: string, userId: string, dto: RunTitanisDtoType) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Titanis workspace');

    const cfg = ((found[0] as Record<string, unknown>).config ?? {}) as Record<string, unknown>;
    const outreachChannel =
      typeof cfg.outreach_channel === 'string' ? cfg.outreach_channel : TitanisService.DEFAULT_CHANNEL;

    const targetCount = Math.floor(dto.targetCount);
    let leads = dto.mode === 'lead-hunt' ? targetCount : Math.ceil(targetCount * 0.5);
    const ai = getAiClient();
    if (ai.isConfigured() && dto.mode === 'lead-hunt') {
      const rec = await ai.fetchRecommendations({ mode: dto.mode, channel: outreachChannel, targetCount });
      if (rec?.recommendations?.length) {
        leads = Math.min(targetCount * 2, leads + rec.recommendations.length);
      }
    }
    const comms = getCommsClient();
    let commsDispatched = false;
    if (comms.isConfigured() && dto.mode === 'follow-up') {
      await comms.request('POST', '/v1/outreach/dispatch', {
        systemId,
        channel: outreachChannel,
        leads,
      });
      commsDispatched = true;
    }
    const conversions = dto.mode === 'close' ? Math.ceil(leads * 0.18) : Math.ceil(leads * 0.08);
    const revenue = conversions * (dto.mode === 'close' ? 120 : 55);

    const outputPayload = {
      mode: dto.mode,
      target_count: targetCount,
      leads_generated: leads,
      conversions,
      estimated_revenue: revenue,
      channel: outreachChannel,
      comms_dispatched: commsDispatched,
      state: {
        previous: 'ready',
        current: 'completed',
      },
    };

    const { rows } = await this.repo.createRun(systemId, `titanis_${dto.mode}`, outputPayload);
    if (!rows[0]) {
      throw new AppError('Failed to persist titanis run', 500, 'TITANIS_RUN_PERSIST_FAILED');
    }
    await this.repo.auditRunCompleted(userId, rows[0].id as string, {
      mode: dto.mode,
      systemId,
    });
    await this.repo.updateAfterRun(systemId, revenue, dto.mode, leads);
    return rows[0];
  }
}
