import type { LiveAvatarProvider, LiveSessionCredentials, LiveTurnResult } from './live-provider.types';

/** Dev / keyless fallback — simulates live turn latency for E2E without HeyGen/D-ID keys. */
export class StubLiveProvider implements LiveAvatarProvider {
  readonly id = 'stub' as const;

  isConfigured(): boolean {
    return true;
  }

  async createSession(input: {
    agentId: string;
    agentName: string;
    greeting: string;
  }): Promise<LiveSessionCredentials> {
    const sessionId = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return {
      provider: 'stub',
      sessionId,
      externalSessionId: sessionId,
      clientConfig: {
        mode: 'stub',
        agentId: input.agentId,
        agentName: input.agentName,
        greeting: input.greeting,
        message: 'Stub live session — configure HEYGEN_LIVE_API_KEY or DID_AGENTS_API_KEY for real avatar.',
      },
    } as LiveSessionCredentials & { externalSessionId: string };
  }

  async sendTextTurn(input: {
    externalSessionId: string;
    text: string;
  }): Promise<LiveTurnResult | null> {
    const started = Date.now();
    await new Promise((r) => setTimeout(r, 400));
    return {
      text: `[${input.externalSessionId.slice(0, 8)}] Thanks for your message. I heard: "${input.text.slice(0, 200)}". (Stub live — real HeyGen/D-ID pending API keys.)`,
      latencyMs: Date.now() - started,
      provider: 'stub',
    };
  }

  async endSession(_externalSessionId: string): Promise<void> {
    /* noop */
  }
}
