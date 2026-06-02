import {
  buildResearchSeedCandidates,
  pickResearchSeedUrl,
} from '../../../../modules/autonomy-loop/lib/research-seed';

describe('research-seed', () => {
  it('prefers DuckDuckGo HTML over Google', () => {
    const url = pickResearchSeedUrl('Agriculture', 'Agri Insurance', 'agriculture-agri-insurance');
    expect(url).toContain('duckduckgo.com/html');
    expect(url).not.toContain('google.com');
  });

  it('returns override when provided', () => {
    expect(
      pickResearchSeedUrl('A', 'B', 'a-b', 'https://example.com/report')
    ).toBe('https://example.com/report');
  });

  it('builds multiple scrape candidates', () => {
    const urls = buildResearchSeedCandidates('Healthcare', 'Clinic Ops', 'healthcare-clinic-ops');
    expect(urls.length).toBeGreaterThanOrEqual(3);
    expect(urls.some((u) => u.includes('wikipedia.org'))).toBe(true);
  });
});
