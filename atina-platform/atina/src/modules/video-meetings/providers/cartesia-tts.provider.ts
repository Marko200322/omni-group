import axios from 'axios';
import { config } from '../../../config';
import type { AvatarTtsResult } from './avatar-media.types';

export function isCartesiaConfigured(): boolean {
  return Boolean(config.videoMeetings.avatarMedia.cartesiaApiKey.trim());
}

export async function synthesizeCartesiaSpeech(
  text: string,
  voiceId: string
): Promise<AvatarTtsResult | null> {
  const apiKey = config.videoMeetings.avatarMedia.cartesiaApiKey.trim();
  if (!apiKey || !text.trim()) return null;

  const voice =
    voiceId.trim() || config.videoMeetings.avatarMedia.cartesiaVoiceId.trim();
  if (!voice) return null;

  try {
    const res = await axios.post<ArrayBuffer>(
      'https://api.cartesia.ai/tts/bytes',
      {
        model_id: config.videoMeetings.avatarMedia.cartesiaModelId,
        transcript: text.slice(0, 2500),
        voice: { mode: 'id', id: voice },
        output_format: {
          container: 'mp3',
          encoding: 'mp3',
          sample_rate: 44100,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Cartesia-Version': '2024-06-10',
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 45000,
        validateStatus: (s) => s >= 200 && s < 300,
      }
    );

    const buffer = Buffer.from(res.data);
    if (buffer.length === 0) return null;
    return {
      audioBase64: buffer.toString('base64'),
      mimeType: 'audio/mpeg',
      provider: 'cartesia',
    };
  } catch {
    return null;
  }
}
