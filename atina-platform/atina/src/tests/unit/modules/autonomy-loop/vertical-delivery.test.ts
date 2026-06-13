import {
  FREELANCE_CATEGORY_ROLLOUT_ORDER,
  FULL_INDUSTRY_ROLLOUT_ORDER,
  CATEGORY_DELIVERY_PROFILES,
  getCategoryDeliveryProfile,
  listCategoryDeliveryProfiles,
} from '../../../../modules/autonomy-loop/lib/vertical-delivery-profiles';
import { resolveVerticalDeliveryPack } from '../../../../modules/autonomy-loop/lib/vertical-delivery-resolver';
import {
  deliveryPackToTemplateVars,
  renderOutreachEmailMarkdown,
  renderQualityChecklistJson,
  renderVerticalModuleTs,
  renderVerticalWorkflowJson,
} from '../../../../modules/autonomy-loop/templates/vertical-templates';

describe('vertical delivery pack', () => {
  it('defines 25 freelance category profiles in order', () => {
    expect(FREELANCE_CATEGORY_ROLLOUT_ORDER).toHaveLength(25);
    expect(listCategoryDeliveryProfiles()).toHaveLength(50);
    expect(CATEGORY_DELIVERY_PROFILES.development_it).toBeDefined();
    expect(CATEGORY_DELIVERY_PROFILES.real_estate_services).toBeDefined();
    expect(FREELANCE_CATEGORY_ROLLOUT_ORDER[0]).toBe('development_it');
    expect(FREELANCE_CATEGORY_ROLLOUT_ORDER[24]).toBe('real_estate_services');
    expect(FULL_INDUSTRY_ROLLOUT_ORDER).toHaveLength(50);
    expect(FULL_INDUSTRY_ROLLOUT_ORDER[25]).toBe('healthcare');
  });

  it('resolves development_it web development pack with deliverables and workflow', () => {
    const pack = resolveVerticalDeliveryPack({
      slug: 'development-it-web-development',
      category: 'development_it',
      name: 'Web Development (Development & IT)',
    });
    expect(pack.category).toBe('development_it');
    expect(pack.subtype).toBe('web-development');
    expect(pack.coreModules).toContain('craftor');
    expect(pack.workflowSteps.length).toBeGreaterThanOrEqual(5);
    expect(pack.recommendedDeliverables.length).toBeGreaterThanOrEqual(3);
    expect(pack.verticalPackageQuoteEur).toBeGreaterThan(9);
    expect(pack.qualityGates.length).toBeGreaterThanOrEqual(4);
  });

  it('uses category profile for marketing SEO niche', () => {
    const profile = getCategoryDeliveryProfile('marketing');
    expect(profile.primaryDeliverables).toContain('lead-gen-retainer');
    const pack = resolveVerticalDeliveryPack({
      slug: 'marketing-seo',
      category: 'marketing',
      name: 'SEO (Marketing)',
    });
    expect(pack.keywords.some((k) => k.includes('seo') || k.includes('marketing'))).toBe(true);
    expect(pack.outreachHooks.length).toBeGreaterThan(0);
  });

  it('resolves legacy SMB healthcare profile', () => {
    const profile = getCategoryDeliveryProfile('healthcare');
    expect(profile.slug).toBe('healthcare');
    expect(profile.nameSr).toBe('Zdravstvo');
    expect(profile.coreModules).toContain('crm');
    expect(profile.marketIntensityDefault).toBeGreaterThan(0);
  });

  it('generates rich artifacts from delivery pack', () => {
    const pack = resolveVerticalDeliveryPack({
      slug: 'ai-data-llm-development',
      category: 'ai_data',
      name: 'LLM Development (AI & Data)',
    });
    const vars = deliveryPackToTemplateVars(pack);
    const moduleTs = renderVerticalModuleTs(vars);
    expect(moduleTs).toContain('ai-data-llm-development');
    expect(moduleTs).toContain('coreModules');

    const workflow = renderVerticalWorkflowJson(pack);
    expect(workflow).toContain('ai-data-llm-development');
    expect(workflow).toContain('client-hunter');

    const outreach = renderOutreachEmailMarkdown(pack);
    expect(outreach).toContain('Subject A');
    expect(outreach).toContain('draft');

    const quality = renderQualityChecklistJson(pack);
    expect(quality).toContain('gates');
    expect(quality).toContain('ownerApproved');
  });
});
