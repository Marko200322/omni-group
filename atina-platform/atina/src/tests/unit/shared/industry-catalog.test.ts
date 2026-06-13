import {
  getIndustryCatalog,
  getIndustryCatalogStats,
  getSubIndustriesForCategory,
  getSubIndustryBySlug,
  resetIndustryCatalogCache,
  resolveIndustryContext,
  resolveVerticalSlug,
} from '../../../shared/industry/industry-catalog';

describe('industry-catalog', () => {
  afterEach(() => {
    resetIndustryCatalogCache();
  });

  it('builds catalog with 50 categories and 900+ sub-industries', () => {
    const stats = getIndustryCatalogStats();
    expect(stats.categoryCount).toBe(50);
    expect(stats.subIndustryCount).toBeGreaterThanOrEqual(900);
  });

  it('resolves development-it-web-development vertical', () => {
    const v = resolveVerticalSlug('development-it-web-development');
    expect(v).not.toBeNull();
    expect(v!.category).toBe('development_it');
    expect(v!.subtype).toBe('web-development');
    expect(v!.pricingTier).toBe('premium');
  });

  it('resolves home_services sub-industry slug with hyphen prefix', () => {
    const v = resolveVerticalSlug('home-services-cleaning-home');
    expect(v).not.toBeNull();
    expect(v!.category).toBe('home_services');
    expect(v!.subtype).toBe('cleaning-home');
  });

  it('resolveIndustryContext prefers verticalSlug over category', () => {
    const ctx = resolveIndustryContext({
      industryCategory: 'retail',
      verticalSlug: 'healthcare-dental',
    });
    expect(ctx.industryCategory).toBe('healthcare');
    expect(ctx.verticalSlug).toBe('healthcare-dental');
    expect(ctx.pricingTier).toBe('regulated');
  });

  it('resolves legacy healthcare-dental vertical', () => {
    const v = resolveVerticalSlug('healthcare-dental');
    expect(v).not.toBeNull();
    expect(v!.category).toBe('healthcare');
    expect(v!.pricingTier).toBe('regulated');
  });

  it('lists sub-industries for healthcare', () => {
    const subs = getSubIndustriesForCategory('healthcare');
    expect(subs.length).toBeGreaterThanOrEqual(20);
    expect(subs.some((s) => s.slug === 'healthcare-dental')).toBe(true);
  });

  it('lists sub-industries for development_it', () => {
    const subs = getSubIndustriesForCategory('development_it');
    expect(subs.length).toBeGreaterThanOrEqual(40);
    expect(subs.some((s) => s.slug === 'development-it-web-development')).toBe(true);
  });

  it('getSubIndustryBySlug returns known entry', () => {
    const sub = getSubIndustryBySlug('legal-law-firm');
    expect(sub?.subtype).toBe('law-firm');
    expect(sub?.category).toBe('legal');
  });

  it('getIndustryCatalog nests subIndustries under parent', () => {
    const catalog = getIndustryCatalog();
    const healthcare = catalog.find((c) => c.slug === 'healthcare');
    expect(healthcare?.subIndustries.length).toBeGreaterThanOrEqual(20);
  });
});
