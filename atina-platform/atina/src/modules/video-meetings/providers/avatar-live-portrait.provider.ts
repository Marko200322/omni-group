import { LivePortraitProvider } from '../../apex-predator/providers/live-portrait-provider';

export type AvatarAnimationResult = {
  videoUrl: string | null;
  raw: Record<string, unknown> | null;
};

function extractVideoUrl(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const candidates = [
    payload.video_url,
    payload.videoUrl,
    payload.url,
    payload.output_url,
    payload.outputUrl,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('http')) return c;
  }
  return null;
}

export function isLivePortraitConfigured(): boolean {
  return new LivePortraitProvider().isConfigured();
}

export async function animateAvatarSpeech(input: {
  sourceImageUrl: string;
  audioBase64: string;
  audioMimeType: string;
  sessionId: string;
  agentType: string;
}): Promise<AvatarAnimationResult> {
  const provider = new LivePortraitProvider();
  if (!provider.isConfigured() || !input.sourceImageUrl.trim()) {
    return { videoUrl: null, raw: null };
  }

  const raw = await provider.generate({
    source_image_url: input.sourceImageUrl,
    image_url: input.sourceImageUrl,
    audio_base64: input.audioBase64,
    audio_mime_type: input.audioMimeType,
    session_id: input.sessionId,
    agent_type: input.agentType,
  });

  return { videoUrl: extractVideoUrl(raw), raw };
}
