import { BASE_DELIVERABLE_CATALOG_HONEST } from '../../../../modules/billing/lib/base-deliverable-catalog';
import {
  assertAllPackagesHaveProblemSpecs,
  getPackageIndustryContext,
  listPackageIndustryMatrix,
  listResolvedPackageIndustryProblems,
  PACKAGE_PROBLEM_SPECS,
} from '../../../../modules/billing/lib/package-industry-problems';
import { getMaintenanceTiersForPackage } from '../../../../modules/billing/lib/package-maintenance-tiers';

describe('package-industry-problems', () => {
  it('covers all base capability templates with problem specs', () => {
    expect(Object.keys(PACKAGE_PROBLEM_SPECS)).toHaveLength(BASE_DELIVERABLE_CATALOG_HONEST.length);
    expect(assertAllPackagesHaveProblemSpecs()).toEqual([]);
    for (const d of BASE_DELIVERABLE_CATALOG_HONEST) {
      expect(PACKAGE_PROBLEM_SPECS[d.id]).toBeDefined();
    }
  });

  it('tailors context per industry with maintenance rules', () => {
    const oneTime = getPackageIndustryContext('landing', 'marketing');
    expect(oneTime).not.toBeNull();
    expect(oneTime!.primaryProblem).toMatch(/marketing/i);
    expect(oneTime!.secondaryProblems.length).toBeGreaterThanOrEqual(4);
    // OmniTrix: primary + secondary = 5–10 client problems per package
    for (const d of BASE_DELIVERABLE_CATALOG_HONEST) {
      const spec = PACKAGE_PROBLEM_SPECS[d.id]!;
      const depth = 1 + spec.secondaryProblems.length;
      expect(depth).toBeGreaterThanOrEqual(5);
      expect(depth).toBeLessThanOrEqual(10);
    }
    const industrySkuProblems = listResolvedPackageIndustryProblems('landing__healthcare');
    expect(industrySkuProblems.length).toBeGreaterThanOrEqual(5);
    expect(industrySkuProblems.length).toBeLessThanOrEqual(10);
    expect(oneTime!.industrySolutionPitch.length).toBeGreaterThan(20);
    expect(oneTime!.maintenanceIncludedInPrice).toBe(false);
    expect(oneTime!.optionalMaintenanceTiers).toHaveLength(3);

    const monthly = getPackageIndustryContext('vertical-package', 'marketing');
    expect(monthly!.maintenanceIncludedInPrice).toBe(true);
    expect(monthly!.optionalMaintenanceTiers).toBeNull();
    expect(getMaintenanceTiersForPackage('vertical-package', 'monthly')).toBeNull();
  });

  it('returns full matrix for an industry', () => {
    const matrix = listPackageIndustryMatrix('development_it');
    expect(matrix).toHaveLength(BASE_DELIVERABLE_CATALOG_HONEST.length);
    const recommended = matrix.filter((p) => p.recommendedForIndustry);
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.some((p) => p.deliverableId === 'integration')).toBe(true);
  });

  it('keeps healthcare vs construction problems distinct and free of GTM theater hooks', () => {
    const hc = listResolvedPackageIndustryProblems('landing__healthcare');
    const cn = listResolvedPackageIndustryProblems('landing__construction');
    expect(hc.length).toBeGreaterThanOrEqual(5);
    expect(cn.length).toBeGreaterThanOrEqual(5);
    expect(hc).not.toEqual(cn);
    expect(hc.some((p) => /front-desk|PHI|patient|referral/i.test(p))).toBe(true);
    expect(cn.some((p) => /change order|punch list|budget overrun|closeout/i.test(p))).toBe(true);
    const theater = /SMB market|Turnkey delivery|no platform resale|local lead generation/i;
    expect(hc.some((p) => theater.test(p))).toBe(false);
    expect(cn.some((p) => theater.test(p))).toBe(false);
  });
});
