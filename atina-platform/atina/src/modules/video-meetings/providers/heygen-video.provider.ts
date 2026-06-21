import axios from 'axios';
import { config } from '../../../config';
import type { AvatarVideoResult } from './avatar-media.types';

export function isHeygenConfigured(): boolean {
  return Boolean(config.videoMeetings.avatarMedia.heygenApiKey.trim());
}

async function pollHeygenVideo(videoId: string): Promise<string | null> {
  const apiKey = config.videoMeetings.avatarMedia.heygenApiKey.trim();
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await axios.get<{
      data?: { status?: string; video_url?: string };
    }>(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
      headers: { 'X-Api-Key': apiKey },
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    const status = res.data.data?.status;
    const url = res.data.data?.video_url;
    if (status === 'completed' && url) return url;
    if (status === 'failed') return null;
  }
  return null;
}

export async function renderHeygenTalkingVideo(input: {
  imageUrl: string;
  text: string;
  voiceId?: string;
  heygenAvatarId?: string;
}): Promise<AvatarVideoResult | null> {
  const apiKey = config.videoMeetings.avatarMedia.heygenApiKey.trim();
  if (!apiKey || !input.text.trim()) return null;

  const character = input.heygenAvatarId?.trim()
    ? {
        type: 'avatar',
        avatar_id: input.heygenAvatarId.trim(),
        avatar_style: 'normal',
      }
    : input.imageUrl.trim()
      ? {
          type: 'talking_photo',
          talking_photo_url: input.imageUrl.trim(),
        }
      : null;

  if (!character) return null;

  try {
    const voice: Record<string, unknown> = {
      type: 'text',
      input_text: input.text.slice(0, 2500),
    };
    if (input.voiceId?.trim()) {
      voice.voice_id = input.voiceId.trim();
    }

    const create = await axios.post<{ data?: { video_id?: string } }>(
      'https://api.heygen.com/v2/video/generate',
      {
        video_inputs: [{ character, voice }],
      },
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
        validateStatus: (s) => s >= 200 && s < 300,
      }
    );

    const videoId = create.data.data?.video_id;
    if (!videoId) return null;
    const videoUrl = await pollHeygenVideo(videoId);
    if (!videoUrl) return null;
    return { videoUrl, provider: 'heygen' };
  } catch {
    return null;
  }
}
