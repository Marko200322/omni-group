export type LiveAvatarProviderId = 'heygen' | 'd-id' | 'stub';

export type LiveCallPlatform = 'browser' | 'zoom' | 'google_meet';

export type LiveSessionCredentials = {
  provider: LiveAvatarProviderId;
  sessionToken?: string;
  sessionId?: string;
  websocketUrl?: string;
  sdpOffer?: string;
  accessToken?: string;
  /** Client embed / SDK bootstrap payload */
  clientConfig: Record<string, unknown>;
};

export type LiveProviderStatus = {
  id: LiveAvatarProviderId;
  configured: boolean;
  mode: 'live' | 'stub';
  label: string;
};

export type LiveTurnResult = {
  text: string;
  audioBase64?: string | null;
  audioMime?: string | null;
  videoUrl?: string | null;
  latencyMs: number;
  provider: LiveAvatarProviderId;
};

export interface LiveAvatarProvider {
  id: LiveAvatarProviderId;
  isConfigured(): boolean;
  createSession(input: {
    agentId: string;
    agentName: string;
    photoUrl: string;
    voiceId: string;
    heygenAvatarId?: string;
    heygenVoiceId?: string;
    greeting: string;
  }): Promise<LiveSessionCredentials>;
  sendTextTurn(input: {
    externalSessionId: string;
    text: string;
    sessionPayload: Record<string, unknown>;
  }): Promise<LiveTurnResult | null>;
  endSession(externalSessionId: string, sessionPayload: Record<string, unknown>): Promise<void>;
}
