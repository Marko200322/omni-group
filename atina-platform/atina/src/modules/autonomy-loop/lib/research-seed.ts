/** Scrape-friendly seed URLs (avoid Google/LinkedIn bot walls). */
export function buildResearchSeedCandidates(
  category: string,
  name: string,
  slug: string
): string[] {
  const query = `${category} ${name} SaaS software market trends`;
  const wikiTopic = `${name}`.replace(/\s+/g, '_');
  return [
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTopic)}`,
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${category} vertical SaaS CRM`)}`,
    `https://www.crunchbase.com/textsearch?q=${encodeURIComponent(`${category} ${name}`)}`,
  ];
}

export function pickResearchSeedUrl(
  category: string,
  name: string,
  slug: string,
  override?: string
): string {
  if (override?.trim()) return override.trim();
  return buildResearchSeedCandidates(category, name, slug)[0];
}
