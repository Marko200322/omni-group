import { config } from '../../../config';
import type { AvatarVideoProviderId, AvatarVideoResult } from './avatar-media.types';
import { animateAvatarSpeech, isLivePortraitConfigured } from './avatar-live-portrait.provider';
import { isDidConfigured, renderDidTalkingVideo } from './did-video.provider';
import { isHeygenConfigured, renderHeygenTalkingVideo } from './heygen-video.provider';

function parseChain(raw: string): AvatarVideoProviderId[] {
  const allowed: AvatarVideoProviderId[] = ['heygen', 'd-id', 'live_portrait'];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id): id is AvatarVideoProviderId =>
      allowed.includes(id as AvatarVideoProviderId)
    );
}

function isVideoProviderConfigured(id: AvatarVideoProviderId): boolean {
  if (id === 'heygen') return isHeygenConfigured();
  if (id === 'd-id') return isDidConfigured();
  return isLivePortraitConfigured();
}

export function listConfiguredVideoProviders(): AvatarVideoProviderId[] {
  return parseChain(config.videoMeetings.avatarMedia.videoChain).filter(isVideoProviderConfigured);
}

export function avatarVideoCapable(imageUrl: string): boolean {
  return Boolean(imageUrl.trim()) && listConfiguredVideoProviders().length > 0;
}

export async function renderAvatarVideo(input: {
  imageUrl: string;
  text: string;
  voiceId?: string;
  heygenAvatarId?: string;
  audioBase64?: string;
  audioMimeType?: string;
  sessionId: string;
  agentType: string;
}): Promise<AvatarVideoResult | null> {
  const chain = listConfiguredVideoProviders();
  for (const provider of chain) {
    if (provider === 'heygen') {
      const result = await renderHeygenTalkingVideo({
        imageUrl: input.imageUrl,
        text: input.text,
        voiceId: input.voiceId,
        heygenAvatarId: input.heygenAvatarId,
      });
      if (result) return result;
      continue;
    }
    if (provider === 'd-id') {
      const result = await renderDidTalkingVideo({
        imageUrl: input.imageUrl,
        text: input.text,
        voiceId: input.voiceId,
      });
      if (result) return result;
      continue;
    }
    if (input.audioBase64 && input.audioMimeType && input.imageUrl.trim()) {
      const animated = await animateAvatarSpeech({
        sourceImageUrl: input.imageUrl,
        audioBase64: input.audioBase64,
        audioMimeType: input.audioMimeType,
        sessionId: input.sessionId,
        agentType: input.agentType,
      });
      if (animated.videoUrl) {
        return { videoUrl: animated.videoUrl, provider: 'live_portrait' };
      }
    }
  }
  return null;
}

export function listAvatarMediaStackStatus() {
  const tts = ['elevenlabs', 'cartesia'] as const;
  const video = ['heygen', 'd-id', 'live_portrait'] as const;
  return {
    ttsChain: config.videoMeetings.avatarMedia.ttsChain,
    videoChain: config.videoMeetings.avatarMedia.videoChain,
    configured: {
      tts: tts.filter((id) =>
        id === 'elevenlabs'
          ? Boolean(config.pipelines.elevenLabsKey.trim())
          : Boolean(config.videoMeetings.avatarMedia.cartesiaApiKey.trim())
      ),
      video: video.filter((id) => isVideoProviderConfigured(id)),
    },
    clientMemory: config.videoMeetings.avatarMedia.clientMemoryEnabled,
  };
}
