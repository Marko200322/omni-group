import { config } from '../../../config';
import logger from '../../../utils/logger';

export type RecallBotResult = {
  botId: string;
  status: string;
  raw: Record<string, unknown>;
};

function recallKey(): string {
  return config.liveCallAvatar.recallApiKey.trim();
}

function recallBase(): string {
  return config.liveCallAvatar.recallApiBase.replace(/\/+$/, '');
}

export function isRecallConfigured(): boolean {
  return recallKey().length > 8;
}

/** Recall.ai bot joins Zoom or Google Meet on behalf of the live avatar pipeline. */
export async function createRecallBot(input: {
  meetingUrl: string;
  botName: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<RecallBotResult> {
  if (!isRecallConfigured()) {
    throw new Error('RECALL_API_KEY is not configured');
  }

  const body: Record<string, unknown> = {
    meeting_url: input.meetingUrl,
    bot_name: input.botName.slice(0, 100),
    metadata: input.metadata ?? {},
  };
  if (input.webhookUrl) {
    body.real_time_transcription = { destination_url: input.webhookUrl };
  }

  const res = await fetch(`${recallBase()}/bot/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${recallKey()}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    id?: string;
    status?: string;
  };
  if (!res.ok) {
    const detail = (json.detail as string) ?? (json.message as string) ?? res.statusText;
    throw new Error(`Recall bot create failed: ${detail}`);
  }

  const botId = String(json.id ?? '');
  if (!botId) throw new Error('Recall bot create missing id');

  logger.info('Recall bot created', { botId, meetingUrl: input.meetingUrl.slice(0, 80) });
  return {
    botId,
    status: String(json.status ?? 'created'),
    raw: json,
  };
}

export async function getRecallBot(botId: string): Promise<Record<string, unknown>> {
  if (!isRecallConfigured()) throw new Error('RECALL_API_KEY is not configured');
  const res = await fetch(`${recallBase()}/bot/${encodeURIComponent(botId)}/`, {
    headers: { Authorization: `Token ${recallKey()}` },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Recall bot get failed: ${res.status}`);
  return json;
}

export async function stopRecallBot(botId: string): Promise<void> {
  if (!isRecallConfigured()) return;
  await fetch(`${recallBase()}/bot/${encodeURIComponent(botId)}/leave_call/`, {
    method: 'POST',
    headers: { Authorization: `Token ${recallKey()}` },
  }).catch((err) => {
    logger.warn('Recall bot leave_call', { botId, error: err instanceof Error ? err.message : String(err) });
  });
}
