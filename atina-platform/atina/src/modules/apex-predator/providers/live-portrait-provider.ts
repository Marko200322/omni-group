import { config } from '../../../config';
import type { ApexMediaProvider, ApexMediaProviderStatus } from './apex-media-provider';

export class LivePortraitProvider implements ApexMediaProvider {
  readonly id = 'live_portrait' as const;

  isConfigured(): boolean {
    return Boolean(config.apex.livePortraitUrl.trim() && config.apex.livePortraitKey.trim());
  }

  status(): ApexMediaProviderStatus {
    return {
      id: this.id,
      configured: this.isConfigured(),
      message: this.isConfigured()
        ? 'LivePortrait endpoint configured'
        : 'Set APEX_LIVE_PORTRAIT_API_URL and APEX_LIVE_PORTRAIT_API_KEY for avatar video hooks',
    };
  }

  async generate(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured()) return null;
    const base = config.apex.livePortraitUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/v1/animate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apex.livePortraitKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  }
}
