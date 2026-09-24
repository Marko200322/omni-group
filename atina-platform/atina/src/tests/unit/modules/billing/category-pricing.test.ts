import {
  getPlanPriceForCategory,
  resolvePricingTier,
} from '../../../../modules/billing/lib/category-pricing';

describe('category-pricing', () => {
  it('uses standard base prices without category', () => {
    expect(getPlanPriceForCategory('starter', 'monthly', null)).toBe(76);
    expect(getPlanPriceForCategory('pro', 'monthly', null)).toBe(239);
    expect(getPlanPriceForCategory('enterprise', 'monthly', null)).toBe(412);
  });

  it('applies budget tier for retail', () => {
    expect(resolvePricingTier('retail')).toBe('budget');
    expect(getPlanPriceForCategory('pro', 'monthly', 'retail')).toBe(188);
  });

  it('applies regulated tier for healthcare', () => {
    expect(resolvePricingTier('healthcare')).toBe('regulated');
    expect(getPlanPriceForCategory('pro', 'monthly', 'healthcare')).toBe(397);
  });

  it('applies nonprofit discount', () => {
    expect(getPlanPriceForCategory('starter', 'monthly', 'nonprofit')).toBe(41);
  });
});
