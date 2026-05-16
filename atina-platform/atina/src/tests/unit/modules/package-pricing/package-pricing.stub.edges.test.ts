import { computePackagePricingRun } from '../../../../modules/package-pricing/package-pricing.stub';

describe('computePackagePricingRun edge cases', () => {
  const ws = 'abc12345-extra-suffix';

  it('list-tiers treats metrics base_price 0 as falsy and falls back to 99', () => {
    const r = computePackagePricingRun('list-tiers', { base_price: 0 }, {}, ws);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.metricsPatch.base_price).toBe(99);
    const starter = (r.outputPayload.result as { tiers: { unit_price: number }[] }).tiers[0];
    expect(starter.unit_price).toBe(99);
  });

  it('list-tiers uses default base_price 99 when missing', () => {
    const r = computePackagePricingRun('list-tiers', {}, {}, ws);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.metricsPatch.base_price).toBe(99);
    const starter = (r.outputPayload.result as { tiers: { unit_price: number }[] }).tiers[0];
    expect(starter.unit_price).toBe(99);
  });

  it('adjust-price clamps negative adjustment to -15', () => {
    const r = computePackagePricingRun(
      'adjust-price',
      { tiers_count: 1, base_price: 100 },
      { adjustmentPct: -40 },
      ws
    );
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.metricsPatch.last_adjustment_pct).toBe(-15);
  });

  it('adjust-price treats NaN adjustment as default 5', () => {
    const r = computePackagePricingRun(
      'adjust-price',
      { tiers_count: 1, base_price: 80 },
      { adjustmentPct: Number.NaN },
      ws
    );
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.metricsPatch.last_adjustment_pct).toBe(5);
  });

  it('bundle increments bundles_proposed from existing count', () => {
    const r = computePackagePricingRun('bundle', { tiers_count: 3, bundles_proposed: 4 }, {}, ws);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.metricsPatch.bundles_proposed).toBe(5);
    const bid = (r.outputPayload.result as { bundle_id: string }).bundle_id;
    expect(bid).toBe('bundle_abc12345');
  });
});
