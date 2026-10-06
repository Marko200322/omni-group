import { DELIVERABLE_CATALOG } from '../../modules/billing/lib/deliverable-catalog';
import { getPackageDeliverySpec } from '../../modules/billing/lib/package-delivery-spec';
import { DOC_SUBSTANCE_THRESHOLDS } from '../../modules/billing/lib/deliverable-handlers/artifact-helpers';
import { expectedBundleStepIds } from '../../modules/billing/lib/deliverable-handlers/bundle-steps';

describe('white-label + bundle honesty gates', () => {
  it('catalog does not claim domain delivery for white-label', () => {
    const row = DELIVERABLE_CATALOG.find((d) => d.id === 'white-label-setup');
    expect(row).toBeTruthy();
    expect(row!.description.toLowerCase()).not.toMatch(/\bdomain\b/);
    expect(row!.description.toLowerCase()).toMatch(/landing|brand/);
  });

  it('package-delivery-spec excludes automated custom domain DNS', () => {
    const spec = getPackageDeliverySpec('white-label-setup');
    expect(spec).toBeTruthy();
    expect(spec!.includes.some((i) => /live partner landing/i.test(i))).toBe(true);
    expect(spec!.excludes.some((e) => /custom domain dns/i.test(e) && /not automated/i.test(e))).toBe(
      true,
    );
    expect(spec!.description.toLowerCase()).not.toMatch(/domain delivered|custom domain included/);
  });

  it('white-label brand pack substance floor is substantial', () => {
    const t = DOC_SUBSTANCE_THRESHOLDS['white-label-setup'];
    expect(t.minSections).toBeGreaterThanOrEqual(5);
    expect(t.minTotalChars).toBeGreaterThanOrEqual(1800);
  });

  it('all three bundles require both child steps', () => {
    expect(expectedBundleStepIds('bundle-portal-presence')).toEqual(['setup-quick', 'landing']);
    expect(expectedBundleStepIds('bundle-sales-launch')).toEqual(['landing', 'sales-enablement']);
    expect(expectedBundleStepIds('bundle-ops-clarity')).toEqual(['audit', 'workflow-design']);
  });
});
