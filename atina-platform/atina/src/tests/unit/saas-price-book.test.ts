import { getSaaSPrice, normalizeBillingCurrency, SAAS_PRICE_BOOK } from '../../modules/billing/lib/saas-price-book';

describe('saas price book', () => {
  it('keeps yearly prices at ten monthly payments', () => {
    for (const [slug, cycles] of Object.entries(SAAS_PRICE_BOOK)) {
      expect(cycles.yearly.EUR).toBe(cycles.monthly.EUR * 10);
      expect(cycles.yearly.USD).toBe(cycles.monthly.USD * 10);
      expect(cycles.monthly.USD).toBeGreaterThan(cycles.monthly.EUR);
      expect(['starter', 'pro', 'enterprise']).toContain(slug);
    }
  });

  it('returns the requested currency price', () => {
    expect(getSaaSPrice('starter', 'monthly', 'USD')).toBe(89);
    expect(getSaaSPrice('pro', 'yearly', 'EUR')).toBe(2490);
    expect(normalizeBillingCurrency('usd')).toBe('USD');
    expect(normalizeBillingCurrency('anything-else')).toBe('EUR');
  });
});
