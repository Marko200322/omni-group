import axios from 'axios';
import { config } from '../../../config';

export function isElevenLabsConfigured(): boolean {
  return Boolean(config.pipelines.elevenLabsKey.trim());
}

export type TtsResult = {
  audioBase64: string;
  mimeType: string;
};

export async function synthesizeSpeech(text: string, voiceId: string): Promise<TtsResult | null> {
  const apiKey = config.pipelines.elevenLabsKey.trim();
  const voice = voiceId.trim();
  if (!apiKey || !voice || !text.trim()) return null;

  try {
    const res = await axios.post<ArrayBuffer>(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`,
      {
        text: text.slice(0, 2500),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 45000,
        validateStatus: (s) => s >= 200 && s < 300,
      }
    );

    const buffer = Buffer.from(res.data);
    if (buffer.length === 0) return null;
    return { audioBase64: buffer.toString('base64'), mimeType: 'audio/mpeg' };
  } catch {
    return null;
  }
}
