import { config } from '../../../config';
import logger from '../../../utils/logger';
import type { LiveAvatarProvider, LiveSessionCredentials, LiveTurnResult } from './live-provider.types';

const DID_API = 'https://api.d-id.com';

function didKey(): string {
  return config.liveCallAvatar.didAgentsApiKey.trim() || config.videoMeetings.avatarMedia.didApiKey.trim();
}

function didAuthHeader(): string {
  const key = didKey();
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
}

async function didFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DID_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: didAuthHeader(),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    const msg = (body as { error?: { message?: string } }).error?.message ?? res.statusText;
    throw new Error(`D-ID Agents ${path}: ${msg}`);
  }
  return body;
}

/** D-ID Agents — conversational live avatar sessions. */
export class DidAgentsLiveProvider implements LiveAvatarProvider {
  readonly id = 'd-id' as const;

  isConfigured(): boolean {
    return didKey().length > 8;
  }

  private agentId(configured?: string): string {
    const id = configured?.trim() || config.liveCallAvatar.didDefaultAgentId.trim();
    if (!id) throw new Error('D-ID agent id required (DID_DEFAULT_AGENT_ID or agent config)');
    return id;
  }

  async createSession(input: {
    agentId: string;
    agentName: string;
    photoUrl: string;
    voiceId: string;
    greeting: string;
  }): Promise<LiveSessionCredentials> {
    const agent = this.agentId(configuredAgentForPersona(input.agentId));
    const chat = await didFetch<{
      id?: string;
      chat_mode?: string;
      stream_id?: string;
      session_id?: string;
    }>(`/agents/${encodeURIComponent(agent)}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        persist: false,
        source: { type: 'agent', agent_id: agent },
      }),
    });

    const chatId = chat.id ?? chat.session_id;
    if (!chatId) throw new Error('D-ID agents chat missing id');

    return {
      provider: 'd-id',
      sessionId: chatId,
      clientConfig: {
        mode: 'did_agents',
        chatId,
        agentId: agent,
        streamId: chat.stream_id,
        agentName: input.agentName,
        greeting: input.greeting,
        photoUrl: input.photoUrl,
        voiceId: input.voiceId,
      },
    };
  }

  async sendTextTurn(input: {
    externalSessionId: string;
    text: string;
    sessionPayload: Record<string, unknown>;
  }): Promise<LiveTurnResult | null> {
    const started = Date.now();
    const agent = String(input.sessionPayload.agentId ?? '');
    if (!agent) return null;

    const res = await didFetch<{
      chat?: { id?: string };
      result?: { text?: string; video_url?: string };
      messages?: Array<{ role?: string; content?: string }>;
    }>(`/agents/${encodeURIComponent(agent)}/chat/${encodeURIComponent(input.externalSessionId)}`, {
      method: 'POST',
      body: JSON.stringify({
        streamId: input.sessionPayload.streamId,
        messages: [{ role: 'user', content: input.text }],
      }),
    });

    const reply =
      res.result?.text ??
      res.messages?.filter((m) => m.role === 'assistant').pop()?.content ??
      '';

    return {
      text: reply || '…',
      videoUrl: res.result?.video_url ?? null,
      latencyMs: Date.now() - started,
      provider: 'd-id',
    };
  }

  async endSession(externalSessionId: string, sessionPayload: Record<string, unknown>): Promise<void> {
    const agent = String(sessionPayload.agentId ?? '');
    if (!agent) return;
    await didFetch(`/agents/${encodeURIComponent(agent)}/chat/${encodeURIComponent(externalSessionId)}`, {
      method: 'DELETE',
    }).catch((err) => {
      logger.warn('D-ID chat end', { error: err instanceof Error ? err.message : String(err) });
    });
  }
}

function configuredAgentForPersona(agentId: string): string | undefined {
  const map = config.liveCallAvatar.didAgentIdByPersona;
  const key = agentId as keyof typeof map;
  return map[key] ?? map.mila;
}

export function isDidAgentsLiveConfigured(): boolean {
  return new DidAgentsLiveProvider().isConfigured();
}
