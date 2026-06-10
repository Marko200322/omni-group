import { buildIndustrySeedEntries, INDUSTRY_SEED_COUNT } from '../../../../modules/autonomy-loop/data/industry-seed';

describe('industry-seed', () => {
  it('defines at least 900 verticals (freelance + legacy SMB)', () => {
    const entries = buildIndustrySeedEntries();
    expect(entries.length).toBeGreaterThanOrEqual(900);
    expect(INDUSTRY_SEED_COUNT).toBe(entries.length);
  });

  it('includes freelance platform verticals', () => {
    const entries = buildIndustrySeedEntries();
    expect(entries.some((e) => e.slug === 'development-it-web-development')).toBe(true);
    expect(entries.some((e) => e.slug === 'marketing-seo')).toBe(true);
  });

  it('produces unique slugs', () => {
    const entries = buildIndustrySeedEntries();
    const slugs = new Set(entries.map((e) => e.slug));
    expect(slugs.size).toBe(entries.length);
  });
});
