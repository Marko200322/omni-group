import {
  calculateDeliverableQuote,
  computeResourceCostEur,
} from '../../../../modules/billing/lib/dynamic-pricing.engine';

describe('dynamic-pricing.engine', () => {
  it('includes payment fee for stripe', () => {
    const manual = calculateDeliverableQuote({
      deliverableId: 'setup-quick',
      paymentProvider: 'manual',
    });
    const stripe = calculateDeliverableQuote({
      deliverableId: 'setup-quick',
      paymentProvider: 'stripe',
    });
    expect(stripe.clientPriceEur).toBeGreaterThan(manual.clientPriceEur);
    expect(stripe.paymentFeeEur).toBeGreaterThan(0);
  });

  it('raises vertical package price for regulated healthcare category', () => {
    const retail = calculateDeliverableQuote({
      deliverableId: 'vertical-package',
      industryCategory: 'retail',
      paymentProvider: 'manual',
    });
    const healthcare = calculateDeliverableQuote({
      deliverableId: 'vertical-package',
      industryCategory: 'healthcare',
      paymentProvider: 'manual',
      tamEstimateUsd: 120_000,
      competitionScore: 70,
      marketIntensity: 80,
    });
    expect(healthcare.clientPriceEur).toBeGreaterThan(retail.clientPriceEur);
  });

  it('resource cost scales with AI and scraper usage', () => {
    const light = computeResourceCostEur(
      { aiTokensK: 5, scraperRuns: 0, infraHours: 1, supportHours: 1, storageGbMonth: 0, deployComplexity: 1 },
      'one_time',
    );
    const heavy = computeResourceCostEur(
      { aiTokensK: 100, scraperRuns: 20, infraHours: 10, supportHours: 5, storageGbMonth: 5, deployComplexity: 4 },
      'monthly',
    );
    expect(heavy).toBeGreaterThan(light);
  });

  it('scales price by market region (balkan < eu < dach) and defaults to eu', () => {
    const base = { deliverableId: 'ai-receptionist', paymentProvider: 'manual' as const };
    const balkan = calculateDeliverableQuote({ ...base, marketRegion: 'balkan' });
    const eu = calculateDeliverableQuote({ ...base, marketRegion: 'eu' });
    const dach = calculateDeliverableQuote({ ...base, marketRegion: 'dach' });
    const implicit = calculateDeliverableQuote(base);
    expect(balkan.clientPriceEur).toBeLessThan(eu.clientPriceEur);
    expect(dach.clientPriceEur).toBeGreaterThan(eu.clientPriceEur);
    expect(implicit.clientPriceEur).toBe(eu.clientPriceEur);
    expect(implicit.marketRegion).toBe('eu');
    expect(dach.factors.marketRegionFactor).toBeCloseTo(1.8);
    expect(balkan.factors.marketRegionFactor).toBeCloseTo(0.8);
    // DACH anchor floor must lift the yearly price too.
    expect(dach.clientPriceYearlyEur ?? 0).toBeGreaterThan(eu.clientPriceYearlyEur ?? 0);
  });

  it('quotes every catalog deliverable including market-v2 packages', () => {
    for (const id of [
      'ai-receptionist',
      'ai-pilot',
      'billing-automation',
      'compliance-pack',
      'website-care',
      'lead-list',
      'seo-geo-retainer',
      'video-pipeline-retainer',
    ]) {
      const q = calculateDeliverableQuote({ deliverableId: id, paymentProvider: 'manual' });
      expect(q.clientPriceEur).toBeGreaterThan(0);
      expect(q.subtotalEur).toBeGreaterThanOrEqual(q.resourceCostEur);
    }
  });

  it('never prices below anchor-adjusted floor for setup-full', () => {
    const q = calculateDeliverableQuote({
      deliverableId: 'setup-full',
      industryCategory: 'nonprofit',
      paymentProvider: 'manual',
      marketIntensity: 10,
      competitionScore: 90,
    });
    expect(q.clientPriceEur).toBeGreaterThanOrEqual(200);
  });
});
