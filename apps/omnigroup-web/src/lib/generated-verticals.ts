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

export function listOnlineVerticalSlugs(limit = 50): string[] {
  return getGeneratedVerticalsIndex()
    .verticals.filter((v) => v.hasPage)
    .slice(0, limit)
    .map((v) => v.slug);
}

export function listOnlineVerticalEntries(limit = 50): GeneratedVerticalIndexEntry[] {
  return getGeneratedVerticalsIndex()
    .verticals.filter((v) => v.hasPage)
    .slice(0, limit);
}
