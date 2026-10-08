import { BASE_DELIVERABLE_COUNT } from '../../modules/billing/lib/base-deliverable-catalog';
import { INDUSTRY_CATEGORIES } from '../../modules/billing/lib/category-pricing';
import {
  getDeliverable,
  listDeliverables,
  listFullPackageCatalog,
  TARGET_PACKAGE_COUNT,
  thousandPackageCatalogStats,
} from '../../modules/billing/lib/deliverable-catalog';
import { resolveDeliverableFulfillmentHandler } from '../../modules/billing/lib/deliverable-handlers/registry';
import { MIN_PROBLEMS_COVERED, MAX_PROBLEMS_COVERED } from '../../modules/billing/lib/package-industry-problems';
import { runFulfillmentQualityChecklist } from '../../modules/billing/lib/fulfillment-quality-checklist';

describe('thousand-package-catalog', () => {
  it('exposes ~1000 first-class industry packages (not a combinations narrative)', () => {
    const stats = thousandPackageCatalogStats();
    expect(stats.baseCount).toBe(20);
    expect(stats.industryCount).toBe(50);
    expect(stats.targetCount).toBe(1000);
    expect(TARGET_PACKAGE_COUNT).toBe(BASE_DELIVERABLE_COUNT * INDUSTRY_CATEGORIES.length);
    expect(stats.catalogCount).toBe(1000);
    expect(stats.ready).toBe(true);
    expect(stats.minProblems).toBeGreaterThanOrEqual(MIN_PROBLEMS_COVERED);
    expect(stats.maxProblems).toBeLessThanOrEqual(MAX_PROBLEMS_COVERED);
    expect(stats.belowFloor).toBe(0);

    const catalog = listFullPackageCatalog();
    expect(catalog).toHaveLength(1000);
    expect(listDeliverables()).toHaveLength(1000);

    const sample = getDeliverable('landing__healthcare');
    expect(sample).not.toBeNull();
    expect(sample!.isIndustryPackage).toBe(true);
    expect(sample!.baseDeliverableId).toBe('landing');
    expect(sample!.industrySlug).toBe('healthcare');
    expect(sample!.problemsSolved!.length).toBeGreaterThanOrEqual(5);
    expect(sample!.name).toMatch(/Healthcare/i);
  });

  it('maps every industry package to a real fulfillment handler', () => {
    const catalog = listFullPackageCatalog();
    let missing = 0;
    for (const pkg of catalog) {
      if (!resolveDeliverableFulfillmentHandler(pkg.id)) missing += 1;
    }
    expect(missing).toBe(0);
  });

  it('fails checklist when problemsListed < 5', () => {
    const result = {
      status: 'completed' as const,
      artifacts: [{ type: 'pdf', filename: 'x.pdf', downloadLabel: 'PDF', storagePath: '/x' }],
      metadata: {
        problemsCovered: ['only one'],
        problemsCoveredCount: 1,
        problemsEmbeddedInDoc: false,
        industryCategory: 'healthcare',
      },
    };
    const checklist = runFulfillmentQualityChecklist('landing__healthcare', result);
    const gate = checklist.items.find((i) => i.id === 'min_problems_covered');
    expect(gate?.passed).toBe(false);
  });

  it('sample of 20 industry packages each have 5–10 named problems', () => {
    const catalog = listFullPackageCatalog();
    const sample = [
      'landing__healthcare',
      'audit__legal',
      'lead-gen-retainer__retail',
      'setup-quick__marketing',
      'website-business__fitness',
      'vertical-package__development_it',
      'integration__finance',
      'workflow-design__construction',
      'support-priority__hospitality',
      'ai-support-retainer__customer_service',
      'website-ecommerce__ecommerce',
      'sales-enablement__sales',
      'bundle-ops-clarity__professional',
      'custom-software__technology',
      'white-label-setup__media',
      'setup-full__real-estate',
      'setup-custom__manufacturing',
      'support-dedicated__education',
      'bundle-portal-presence__beauty',
      'bundle-sales-launch__automotive',
    ];
    for (const id of sample) {
      const pkg = catalog.find((p) => p.id === id) ?? getDeliverable(id);
      expect(pkg).toBeTruthy();
      const n = pkg!.problemsSolved!.length;
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(10);
      expect(resolveDeliverableFulfillmentHandler(id)).not.toBeNull();
    }
  });
});
