import type { ApexMediaProvider, ApexMediaProviderStatus } from './apex-media-provider';
import { FluxProvider } from './flux-provider';
import { LivePortraitProvider } from './live-portrait-provider';

export function resolveApexMediaProviders(): ApexMediaProvider[] {
  return [new FluxProvider(), new LivePortraitProvider()];
}

export function apexMediaProviderStatuses(): ApexMediaProviderStatus[] {
  return resolveApexMediaProviders().map((p) => p.status());
}
