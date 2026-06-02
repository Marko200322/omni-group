import { buildIndustrySeedEntries, INDUSTRY_SEED_COUNT } from '../../../../modules/autonomy-loop/data/industry-seed';

describe('industry-seed', () => {
  it('defines at least 500 verticals', () => {
    const entries = buildIndustrySeedEntries();
    expect(entries.length).toBeGreaterThanOrEqual(500);
    expect(INDUSTRY_SEED_COUNT).toBe(entries.length);
  });

  it('produces unique slugs', () => {
    const entries = buildIndustrySeedEntries();
    const slugs = new Set(entries.map((e) => e.slug));
    expect(slugs.size).toBe(entries.length);
  });
});
