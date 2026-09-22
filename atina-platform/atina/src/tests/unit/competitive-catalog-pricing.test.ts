import {
  computeCompetitiveClientSubtotal,
  getIndustryCompetitiveFactor,
} from '../../modules/billing/lib/competitive-catalog-pricing';

describe('competitive-catalog-pricing', () => {
  it('budget industry lowers hero SKU vs anchor', () => {
    const { subtotalEur } = computeCompetitiveClientSubtotal({
      effectiveAnchorEur: 419,
      deliverableId: 'setup-quick',
      industryCategory: 'hospitality',
      pricingTier: 'budget',
    });
    expect(subtotalEur).toBeLessThan(419);
    expect(subtotalEur).toBeGreaterThan(300);
  });

  it('regulated industry is above standard for same SKU', () => {
    const std = getIndustryCompetitiveFactor('construction', 'standard');
    const reg = getIndustryCompetitiveFactor('healthcare', 'regulated');
    expect(reg).toBeGreaterThan(std);
  });
});
