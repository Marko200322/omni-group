import { config } from '../../../config';
import type { AvatarTtsProviderId, AvatarTtsResult } from './avatar-media.types';
import { isCartesiaConfigured, synthesizeCartesiaSpeech } from './cartesia-tts.provider';
import { isElevenLabsConfigured, synthesizeSpeech } from './elevenlabs-tts.provider';

function parseChain(raw: string): AvatarTtsProviderId[] {
  const allowed: AvatarTtsProviderId[] = ['elevenlabs', 'cartesia'];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id): id is AvatarTtsProviderId => allowed.includes(id as AvatarTtsProviderId));
}

function isTtsProviderConfigured(id: AvatarTtsProviderId): boolean {
  if (id === 'elevenlabs') return isElevenLabsConfigured();
  return isCartesiaConfigured();
}

export function listConfiguredTtsProviders(): AvatarTtsProviderId[] {
  const chain = parseChain(config.videoMeetings.avatarMedia.ttsChain);
  return chain.filter(isTtsProviderConfigured);
}

export async function renderAvatarTts(
  text: string,
  voiceId: string
): Promise<AvatarTtsResult | null> {
  const chain = listConfiguredTtsProviders();
  for (const provider of chain) {
    if (provider === 'cartesia') {
      const result = await synthesizeCartesiaSpeech(text, voiceId);
      if (result) return result;
      continue;
    }
    const legacy = await synthesizeSpeech(text, voiceId);
    if (legacy) {
      return {
        audioBase64: legacy.audioBase64,
        mimeType: legacy.mimeType,
        provider: 'elevenlabs',
      };
    }
  }
  return null;
}
