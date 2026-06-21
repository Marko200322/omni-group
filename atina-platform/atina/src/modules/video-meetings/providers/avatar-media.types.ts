export type AvatarTtsProviderId = 'elevenlabs' | 'cartesia';

export type AvatarVideoProviderId = 'heygen' | 'd-id' | 'live_portrait';

export type AvatarTtsResult = {
  audioBase64: string;
  mimeType: string;
  provider: AvatarTtsProviderId;
};

export type AvatarVideoResult = {
  videoUrl: string;
  provider: AvatarVideoProviderId;
};

export type AvatarMediaProviderStatus = {
  id: string;
  kind: 'tts' | 'video';
  configured: boolean;
  label: string;
};
