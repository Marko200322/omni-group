export type GeneratedVerticalIndexEntry = {
  slug: string;
  name?: string;
  category?: string;
  valueProp?: string | null;
  hasPage: boolean;
  hasOutreach: boolean;
  updatedAt: string;
  href?: string;
};

export type GeneratedVerticalsIndex = {
  generatedAt: string;
  count: number;
  verticals: GeneratedVerticalIndexEntry[];
};

let cached: GeneratedVerticalsIndex | null = null;

/** Sinhronizuje se sa `npm run sync:generated-verticals` u atina-platform. */
export function getGeneratedVerticalsIndex(): GeneratedVerticalsIndex {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('./generated-verticals-index.json') as GeneratedVerticalsIndex;
    return cached;
  } catch {
    cached = { generatedAt: '', count: 0, verticals: [] };
    return cached;
  }
}

export function listOnlineVerticalEntries(limit?: number): GeneratedVerticalIndexEntry[] {
  const entries = getGeneratedVerticalsIndex().verticals.filter((v) => v.hasPage);
  if (limit == null || limit <= 0) return entries;
  return entries.slice(0, limit);
}

export function listOnlineVerticalSlugs(limit?: number): string[] {
  return listOnlineVerticalEntries(limit).map((v) => v.slug);
}
