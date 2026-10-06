import { assertPackageProblemDepth } from '../../modules/billing/lib/package-industry-problems';
import {
  runOmnitrixAudit,
  listOmnitrixPackages,
  buildOmnitrixPackage,
  auditOmnitrixPackage,
  scoreUltrMatrix,
} from '../../modules/billing/lib/omnitrix-spec';

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

  it('website-ecommerce honesty requires HYBRID scope — not full merchant claims', () => {
    const pkg = buildOmnitrixPackage('website-ecommerce', 'M6');
    expect(pkg).not.toBeNull();
    const audit = auditOmnitrixPackage(pkg!);
    const ultra = scoreUltrMatrix(pkg!, audit);
    expect(pkg!.excludes.some((e) => /stripe|inventory|tax|shipping/i.test(e))).toBe(true);
    expect(
      pkg!.claims.some((c) => /hybrid|shop page|catalog|handoff/i.test(c.claim)) ||
        /hybrid|not a full merchant/i.test(
          // description is on delivery spec; claims come from includes
          pkg!.claims.map((c) => c.claim).join(' '),
        ),
    ).toBe(true);
    expect(pkg!.claims.every((c) => !/full\s+merchant\s+stack|live\s+stripe\s+connect/i.test(c.claim))).toBe(
      true,
    );
    expect(ultra.honesty).toBeGreaterThanOrEqual(70);
    expect(audit.contractCoverageOk).toBe(true);
  });
});
