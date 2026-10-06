import { getAiClient, getCommsClient } from '../../../integrations';
import { AppError, NotFoundError } from '../../../utils/errors';
import { TitanisRepository } from '../repository/titanis.repository';
import { CreateTitanisWorkspaceDtoType, RunTitanisDtoType } from '../dto/titanis.dto';

/**
 * Titanis planning / workspace runner.
 * Never invents live `leads_generated` counts — fulfillment success must not
 * depend on simulated harvest theater. Live leads stay 0 until a real
 * enrichment/ads harvest adapter returns contacts.
 */
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
    // Honest: never invent live harvest. Planning targets stay separate.
    const leads = 0;
    let recommendationsCount = 0;
    const ai = getAiClient();
    if (ai.isConfigured() && dto.mode === 'lead-hunt') {
      const rec = await ai.fetchRecommendations({ mode: dto.mode, channel: outreachChannel, targetCount });
      recommendationsCount = rec?.recommendations?.length ?? 0;
    }
    const comms = getCommsClient();
    let commsDispatched = false;
    if (comms.isConfigured() && dto.mode === 'follow-up') {
      await comms.request('POST', '/v1/outreach/dispatch', {
        systemId,
        channel: outreachChannel,
        // Dispatch planning payload uses target — not invented leads_generated.
        leads: targetCount,
        planning_only: true,
      });
      commsDispatched = true;
    }
    const conversions = 0;
    const revenue = 0;

    const outputPayload = {
      mode: dto.mode,
      target_count: targetCount,
      planning_target: targetCount,
      leads_generated: leads,
      recommendations_count: recommendationsCount,
      conversions,
      estimated_revenue: revenue,
      channel: outreachChannel,
      comms_dispatched: commsDispatched,
      harvest_status: 'NO_LIVE_SOURCE' as const,
      note:
        'Planning run only — leads_generated stays 0 until a connected enrichment/ads harvest adapter returns real contacts.',
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
      harvest_status: 'NO_LIVE_SOURCE',
      leads_generated: 0,
    });
    await this.repo.updateAfterRun(systemId, revenue, dto.mode, leads);
    return rows[0];
  }
}
