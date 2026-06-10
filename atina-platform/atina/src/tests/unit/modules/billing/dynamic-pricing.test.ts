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
