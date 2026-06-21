import axios from 'axios';
import { config } from '../../../config';
import type { AvatarVideoResult } from './avatar-media.types';

export function isDidConfigured(): boolean {
  return Boolean(config.videoMeetings.avatarMedia.didApiKey.trim());
}

function authHeader(): string {
  const key = config.videoMeetings.avatarMedia.didApiKey.trim();
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
}

async function pollTalk(talkId: string): Promise<string | null> {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await axios.get<{ status?: string; result_url?: string }>(
      `https://api.d-id.com/talks/${encodeURIComponent(talkId)}`,
      {
        headers: { Authorization: authHeader() },
        timeout: 15000,
        validateStatus: (s) => s >= 200 && s < 300,
      }
    );
    if (res.data.status === 'done' && res.data.result_url) {
      return res.data.result_url;
    }
    if (res.data.status === 'error' || res.data.status === 'rejected') {
      return null;
    }
  }
  return null;
}

export async function renderDidTalkingVideo(input: {
  imageUrl: string;
  text: string;
  voiceId?: string;
}): Promise<AvatarVideoResult | null> {
  if (!isDidConfigured() || !input.imageUrl.trim() || !input.text.trim()) return null;

  try {
    const script: Record<string, unknown> = {
      type: 'text',
      input: input.text.slice(0, 2500),
    };
    if (input.voiceId?.trim() && isElevenLabsVoiceBridge()) {
      script.provider = { type: 'elevenlabs', voice_id: input.voiceId.trim() };
    }

    const create = await axios.post<{ id?: string }>(
      'https://api.d-id.com/talks',
      { source_url: input.imageUrl.trim(), script },
      {
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        validateStatus: (s) => s >= 200 && s < 300,
      }
    );

    const talkId = create.data.id;
    if (!talkId) return null;
    const videoUrl = await pollTalk(talkId);
    if (!videoUrl) return null;
    return { videoUrl, provider: 'd-id' };
  } catch {
    return null;
  }
}

function isElevenLabsVoiceBridge(): boolean {
  return Boolean(config.pipelines.elevenLabsKey.trim());
}
