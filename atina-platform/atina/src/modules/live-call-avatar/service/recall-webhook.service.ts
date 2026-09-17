import logger from '../../../utils/logger';
import { LiveCallSessionsRepository } from '../repository/live-sessions.repository';

type RecallWebhookPayload = {
  event?: string;
  type?: string;
  data?: Record<string, unknown>;
  bot?: Record<string, unknown>;
};

function eventName(payload: RecallWebhookPayload): string {
  return String(payload.event ?? payload.type ?? 'unknown').trim();
}

function botIdFromPayload(payload: RecallWebhookPayload): string | null {
  const data = payload.data ?? payload.bot ?? {};
  const id = data.id ?? data.bot_id ?? data.botId;
  return id ? String(id) : null;
}

function metadataFromPayload(payload: RecallWebhookPayload): Record<string, unknown> {
  const data = payload.data ?? payload.bot ?? {};
  const meta = data.metadata;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

export class RecallWebhookService {
  private readonly repo = new LiveCallSessionsRepository();

  async handle(payload: RecallWebhookPayload): Promise<{ ok: true; event: string; sessionId?: string }> {
    const event = eventName(payload);
    const botId = botIdFromPayload(payload);
    const meta = metadataFromPayload(payload);
    const liveSessionId =
      typeof meta.liveSessionId === 'string' ? meta.liveSessionId : null;

    logger.info('Recall webhook', { event, botId, liveSessionId });

    let sessionId = liveSessionId;
    if (!sessionId && botId) {
      const { rows } = await this.repo.findByRecallBotId(botId);
      sessionId = rows[0]?.id ?? null;
    }

    if (sessionId) {
      await this.repo.mergeMetadata(sessionId, {
        recall: {
          lastEvent: event,
          lastEventAt: new Date().toISOString(),
          botId,
          payloadSummary: {
            status: payload.data?.status ?? payload.data?.state ?? null,
          },
        },
      });

      const status = String(payload.data?.status ?? payload.data?.state ?? '').toLowerCase();
      if (status === 'done' || status === 'fatal' || event.includes('call_ended')) {
        await this.repo.updateStatus(sessionId, 'ended').catch(() => undefined);
      }
    }

    return { ok: true, event, sessionId: sessionId ?? undefined };
  }
}
