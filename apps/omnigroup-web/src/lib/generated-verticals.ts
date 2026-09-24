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

const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isPublicVerticalSlug(slug: string): boolean {
  return PUBLIC_SLUG.test(slug);
}

export function listOnlineVerticalEntries(limit?: number): GeneratedVerticalIndexEntry[] {
  const seen = new Set<string>();
  const entries = getGeneratedVerticalsIndex().verticals.filter((v) => {
    if (!v.hasPage || !isPublicVerticalSlug(v.slug) || seen.has(v.slug)) return false;
    seen.add(v.slug);
    return true;
  });
  if (limit == null || limit <= 0) return entries;
  return entries.slice(0, limit);
}

export function listOnlineVerticalSlugs(limit?: number): string[] {
  return listOnlineVerticalEntries(limit).map((v) => v.slug);
}
