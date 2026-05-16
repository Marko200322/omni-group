import { computePackagePricingRun } from '../../modules/package-pricing/package-pricing.stub';

describe('package-pricing.stub computePackagePricingRun', () => {
  const ws = 'workspace-uuid-12345678';

  it('list-tiers returns three tiers and metrics patch', () => {
    const r = computePackagePricingRun('list-tiers', { base_price: 100 }, {}, ws);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.revenueDelta).toBe(45);
    expect(r.metricsPatch.tiers_count).toBe(3);
    expect(r.metricsPatch.base_price).toBe(100);
    const tiers = (r.outputPayload.result as { tiers: unknown[] }).tiers;
    expect(tiers).toHaveLength(3);
  });

  it('adjust-price fails when tiers_count < 1', () => {
    const r = computePackagePricingRun('adjust-price', { tiers_count: 0, base_price: 50 }, { adjustmentPct: 10 }, ws);
    expect('error' in r).toBe(true);
    if (!('error' in r)) return;
    expect(r.error.code).toBe('VALIDATION_ERROR');
    expect(r.error.message).toContain('list-tiers');
  });

  it('adjust-price clamps adjustment and updates metrics', () => {
    const r = computePackagePricingRun(
      'adjust-price',
      { tiers_count: 2, base_price: 200 },
      { adjustmentPct: 99 },
      ws
    );
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.metricsPatch.last_adjustment_pct).toBe(25);
    const preview = (r.outputPayload.result as { preview_total: number }).preview_total;
    expect(preview).toBeGreaterThan(200);
  });

  it('adjust-price defaults adjustment when invalid', () => {
    const r = computePackagePricingRun(
      'adjust-price',
      { tiers_count: 1, base_price: 100 },
      { adjustmentPct: 'x' as unknown as number },
      ws
    );
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.metricsPatch.last_adjustment_pct).toBe(5);
  });

  it('bundle fails when tiers_count < 2', () => {
    const r = computePackagePricingRun('bundle', { tiers_count: 1, base_price: 99 }, {}, ws);
    expect('error' in r).toBe(true);
    if (!('error' in r)) return;
    expect(r.error.message).toContain('two tiers');
  });

  it('bundle succeeds when tiers_count >= 2', () => {
    const r = computePackagePricingRun('bundle', { tiers_count: 2, bundles_proposed: 0 }, {}, ws);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.revenueDelta).toBe(160);
    expect(r.metricsPatch.bundles_proposed).toBe(1);
    const bid = (r.outputPayload.result as { bundle_id: string }).bundle_id;
    expect(bid).toContain('bundle_');
  });
});
