import type { AggregatorCredentials } from './types';

export function normalizeProviderUrl(url: string): string {
  return url.trim().replace(/\/$/, '').toLowerCase();
}

export function isOpenRouterProvider(creds: AggregatorCredentials): boolean {
  const u = normalizeProviderUrl(creds.url);
  return u.includes('openrouter.ai');
}

export function isApifyProvider(creds: AggregatorCredentials): boolean {
  const u = normalizeProviderUrl(creds.url);
  return u.includes('apify.com');
}

/** Custom Omni aggregator gateway (not a public vendor API root). */
export function isAggregatorGatewayProvider(creds: AggregatorCredentials): boolean {
  const u = normalizeProviderUrl(creds.url);
  if (!u) return false;
  if (isOpenRouterProvider(creds) || isApifyProvider(creds)) return false;
  return u.includes('aggregator') || u.includes('atina') || u.includes('/v1') || u.includes('localhost');
}
