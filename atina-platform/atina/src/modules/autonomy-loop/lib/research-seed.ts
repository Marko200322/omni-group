/** Scrape-friendly seed URLs + freelance-market queries. */
import { getCategoryDeliveryProfile } from './vertical-delivery-profiles';

export function buildResearchSeedCandidates(
  category: string,
  name: string,
  slug: string
): string[] {
  const profile = getCategoryDeliveryProfile(category);
  const focus = profile.researchFocus[0] ?? `${category} market`;
  const query = `${focus} ${name} freelance rates 2026`;
  const wikiTopic = name.split('(')[0]?.trim().replace(/\s+/g, '_') ?? slug;
  const freelanceQuery = `${category.replace(/_/g, ' ')} ${name} upwork fiverr demand`;

  return [
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(freelanceQuery)}`,
    `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTopic)}`,
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${category} vertical SaaS CRM automation`)}`,
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

export function buildResearchQuery(category: string, name: string, slug: string): string {
  const profile = getCategoryDeliveryProfile(category);
  const niche = name.split('(')[0]?.trim() ?? slug.replace(/-/g, ' ');
  return `${profile.researchFocus.join(' ')} ${niche} ${category.replace(/_/g, ' ')}`;
}
