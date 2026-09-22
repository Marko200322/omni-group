import { DELIVERABLE_CATALOG } from '../../../../modules/billing/lib/deliverable-catalog';
import {
  assertAllPackagesHaveProblemSpecs,
  getPackageIndustryContext,
  listPackageIndustryMatrix,
  PACKAGE_PROBLEM_SPECS,
} from '../../../../modules/billing/lib/package-industry-problems';
import { getMaintenanceTiersForPackage } from '../../../../modules/billing/lib/package-maintenance-tiers';

describe('package-industry-problems', () => {
  it('covers all catalog packages with problem specs', () => {
    expect(Object.keys(PACKAGE_PROBLEM_SPECS)).toHaveLength(DELIVERABLE_CATALOG.length);
    expect(assertAllPackagesHaveProblemSpecs()).toEqual([]);
    for (const d of DELIVERABLE_CATALOG) {
      expect(PACKAGE_PROBLEM_SPECS[d.id]).toBeDefined();
    }
  });

  it('tailors context per industry with maintenance rules', () => {
    const oneTime = getPackageIndustryContext('landing', 'marketing');
    expect(oneTime).not.toBeNull();
    expect(oneTime!.primaryProblem).toMatch(/marketing/i);
    expect(oneTime!.secondaryProblems.length).toBeGreaterThanOrEqual(3);
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
    expect(matrix).toHaveLength(DELIVERABLE_CATALOG.length);
    const recommended = matrix.filter((p) => p.recommendedForIndustry);
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.some((p) => p.deliverableId === 'integration')).toBe(true);
  });
});
