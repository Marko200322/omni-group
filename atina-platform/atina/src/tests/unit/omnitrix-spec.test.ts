import { assertPackageProblemDepth } from '../../modules/billing/lib/package-industry-problems';
import { runOmnitrixAudit, listOmnitrixPackages } from '../../modules/billing/lib/omnitrix-spec';

describe('OmniTrix / UltrMatrix package readiness', () => {
  it('every package declares 5–10 client problems', () => {
    const bad = assertPackageProblemDepth(5, 10);
    expect(bad).toEqual([]);
  });

  it('builds OmniTrix claims from delivery includes for all SKUs', () => {
    const pkgs = listOmnitrixPackages('M6');
    expect(pkgs.length).toBeGreaterThanOrEqual(20);
    for (const p of pkgs) {
      expect(p.claims.length).toBeGreaterThanOrEqual(3);
      expect(p.excludes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('OmniTrix audit has no WEAK packages at M6', () => {
    const audit = runOmnitrixAudit('M6');
    const weak = audit.rows.filter((r) => r.status === 'WEAK');
    expect(weak).toEqual([]);
    expect(audit.packageCount).toBeGreaterThanOrEqual(20);
  });
});
