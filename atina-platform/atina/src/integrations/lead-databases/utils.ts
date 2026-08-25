const SKIP_DOMAINS = new Set([
  'upwork.com',
  'fiverr.com',
  'linkedin.com',
  'duckduckgo.com',
  'wikipedia.org',
  'google.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  // Government / public employment boards — not company domains for B2B enrich
  'arbeitsagentur.de',
  'francetravail.fr',
  'pole-emploi.fr',
  'emploi-store.fr',
  'arbetsformedlingen.se',
  'indeed.com',
  'stepstone.de',
  'xing.com',
  'glassdoor.com',
  'monster.com',
  'monster.de',
  'ziprecruiter.com',
]);

export function extractDomainFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    if (!host.includes('.')) return null;
    for (const skip of SKIP_DOMAINS) {
      if (host === skip || host.endsWith(`.${skip}`)) return null;
    }
    return host;
  } catch {
    return null;
  }
}

export function uniqueDomainsFromLinks(links: string[], max = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const domain = extractDomainFromUrl(link);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    out.push(domain);
    if (out.length >= max) break;
  }
  return out;
}

export function parseNameParts(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = String(fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: 'Lead', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
