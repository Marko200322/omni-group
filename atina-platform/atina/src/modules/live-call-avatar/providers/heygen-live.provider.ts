import { config } from '../../../config';
import logger from '../../../utils/logger';
import type { LiveAvatarProvider, LiveSessionCredentials, LiveTurnResult } from './live-provider.types';

const HEYGEN_API = 'https://api.heygen.com';

function heygenKey(): string {
  return (
    config.liveCallAvatar.heygenLiveApiKey.trim() ||
    config.videoMeetings.avatarMedia.heygenApiKey.trim()
  );
}

async function heygenFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = heygenKey();
  const res = await fetch(`${HEYGEN_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': key,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) {
    const msg = (body as { message?: string }).message ?? (body as { error?: string }).error ?? res.statusText;
    throw new Error(`HeyGen live ${path}: ${msg}`);
  }
  return body;
}

/** HeyGen Interactive / Streaming Avatar (real-time WebRTC). */
export class HeygenLiveProvider implements LiveAvatarProvider {
  readonly id = 'heygen' as const;

  isConfigured(): boolean {
    return heygenKey().length > 8;
  }

  async createSession(input: {
    agentId: string;
    agentName: string;
    photoUrl: string;
    voiceId: string;
    heygenAvatarId?: string;
    heygenVoiceId?: string;
    greeting: string;
  }): Promise<LiveSessionCredentials> {
    const tokenRes = await heygenFetch<{ data?: { token?: string } }>('/v1/streaming.create_token', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const token = tokenRes.data?.token;
    if (!token) throw new Error('HeyGen streaming.create_token missing token');

    const avatarName = input.heygenAvatarId?.trim() || config.liveCallAvatar.heygenDefaultAvatarId.trim();
    const payload: Record<string, unknown> = {
      quality: 'high',
      voice: {
        voice_id: input.heygenVoiceId?.trim() || input.voiceId,
      },
    };
    if (avatarName) {
      payload.avatar_name = avatarName;
    } else if (input.photoUrl.startsWith('http')) {
      payload.talking_photo_url = input.photoUrl;
    }

    const sessionRes = await heygenFetch<{
      data?: {
        session_id?: string;
        url?: string;
        access_token?: string;
        sdp?: { type?: string; sdp?: string };
      };
    }>('/v1/streaming.new', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    const data = sessionRes.data;
    if (!data?.session_id) throw new Error('HeyGen streaming.new missing session_id');

    await heygenFetch('/v1/streaming.start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_id: data.session_id }),
    }).catch((err) => {
      logger.warn('HeyGen streaming.start warning', { error: err instanceof Error ? err.message : String(err) });
    });

    return {
      provider: 'heygen',
      sessionId: data.session_id,
      sessionToken: token,
      websocketUrl: data.url,
      accessToken: data.access_token,
      sdpOffer: data.sdp?.sdp,
      clientConfig: {
        mode: 'heygen_webrtc',
        sessionId: data.session_id,
        token,
        url: data.url,
        accessToken: data.access_token,
        sdp: data.sdp,
        agentName: input.agentName,
        greeting: input.greeting,
      },
    };
  }

  async sendTextTurn(input: {
    externalSessionId: string;
    text: string;
    sessionPayload: Record<string, unknown>;
  }): Promise<LiveTurnResult | null> {
    const started = Date.now();
    const token = String(input.sessionPayload.sessionToken ?? input.sessionPayload.token ?? '');
    if (!token) return null;

    await heygenFetch('/v1/streaming.task', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        session_id: input.externalSessionId,
        text: input.text,
        task_type: 'repeat',
      }),
    });

    return {
      text: input.text,
      latencyMs: Date.now() - started,
      provider: 'heygen',
    };
  }

  async endSession(externalSessionId: string, sessionPayload: Record<string, unknown>): Promise<void> {
    const token = String(sessionPayload.sessionToken ?? sessionPayload.token ?? '');
    if (!token) return;
    await heygenFetch('/v1/streaming.stop', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_id: externalSessionId }),
    }).catch((err) => {
      logger.warn('HeyGen streaming.stop', { error: err instanceof Error ? err.message : String(err) });
    });
  }
}

export function isHeygenLiveConfigured(): boolean {
  return new HeygenLiveProvider().isConfigured();
}
