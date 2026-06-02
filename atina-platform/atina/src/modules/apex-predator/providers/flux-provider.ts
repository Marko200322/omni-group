import { config } from '../../../config';
import type { ApexMediaProvider, ApexMediaProviderStatus } from './apex-media-provider';

export class FluxProvider implements ApexMediaProvider {
  readonly id = 'flux' as const;

  isConfigured(): boolean {
    return Boolean(config.apex.fluxUrl.trim() && config.apex.fluxKey.trim());
  }

  status(): ApexMediaProviderStatus {
    return {
      id: this.id,
      configured: this.isConfigured(),
      message: this.isConfigured()
        ? 'Flux IP-Adapter endpoint configured'
        : 'Set APEX_FLUX_API_URL and APEX_FLUX_API_KEY for Flux IP-Adapter delivery',
    };
  }

  async generate(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured()) return null;
    const base = config.apex.fluxUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/v1/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apex.fluxKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  }
}
