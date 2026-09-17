import {
  getPlanPriceForCategory,
  resolvePricingTier,
} from '../../../../modules/billing/lib/category-pricing';

describe('category-pricing', () => {
  it('uses standard base prices without category', () => {
    expect(getPlanPriceForCategory('starter', 'monthly', null)).toBe(36);
    expect(getPlanPriceForCategory('pro', 'monthly', null)).toBe(119);
    expect(getPlanPriceForCategory('enterprise', 'monthly', null)).toBe(275);
  });

  it('applies budget tier for retail', () => {
    expect(resolvePricingTier('retail')).toBe('budget');
    expect(getPlanPriceForCategory('pro', 'monthly', 'retail')).toBe(79);
  });

  it('applies regulated tier for healthcare', () => {
    expect(resolvePricingTier('healthcare')).toBe('regulated');
    expect(getPlanPriceForCategory('pro', 'monthly', 'healthcare')).toBe(281);
  });

  it('applies nonprofit discount', () => {
    expect(getPlanPriceForCategory('starter', 'monthly', 'nonprofit')).toBe(16);
  });
});
