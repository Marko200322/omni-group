jest.mock('../../../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

import {
  DeliverableContentGeneratorService,
  englishNicheLabel,
} from '../../../../modules/billing/service/deliverable-content-generator.service';

describe('deliverable content generator quality', () => {
  const svc = new DeliverableContentGeneratorService();

  it('englishNicheLabel strips Serbian parentheticals and prefers subtype', () => {
    expect(
      englishNicheLabel({
        verticalPack: {
          verticalSlug: 'legal-services-contract',
          category: 'legal_services',
          subtype: 'contract-review',
          displayName: 'Services (Pravo)',
          categoryProfile: {} as never,
          keywords: [],
          valueProp: 'x',
          outreachHooks: [],
          researchFocus: [],
          qualityGates: [],
          coreModules: [],
          workflowSteps: [],
          recommendedDeliverables: [],
          verticalPackageQuoteEur: 0,
          marketIntensityDefault: 1,
        },
      }),
    ).toBe('Contract Review');

    expect(englishNicheLabel({ industryCategory: 'fitness' })).toBe('Fitness');
  });

  it('fallback business pages are multi-section and brand-first', async () => {
    const pages = await svc.generateWebsitePages({
      deliverableId: 'website-business',
      title: 'North Peak Studio',
      clientName: 'North Peak Studio',
      industryCategory: 'fitness',
      verticalPack: {
        verticalSlug: 'fitness',
        category: 'fitness',
        subtype: null,
        displayName: 'Fitness',
        categoryProfile: {} as never,
        keywords: ['fitness', 'training'],
        valueProp: 'Coaching that sticks — clear plans, tracked progress.',
        outreachHooks: [],
        researchFocus: [],
        qualityGates: [],
        coreModules: [],
        workflowSteps: [],
        recommendedDeliverables: [],
        verticalPackageQuoteEur: 0,
        marketIntensityDefault: 1,
      },
    });

    expect(pages.length).toBeGreaterThanOrEqual(8);
    const home = pages.find((p) => p.kind === 'home' || p.slug === 'home');
    expect(home?.body.length ?? 0).toBeGreaterThan(280);
    expect(home?.body).toMatch(/North Peak Studio/);
    expect(home?.body).not.toMatch(/Digital presence —/);
    expect(home?.body).not.toMatch(/Pravo/);
  });

  it('ecommerce catalog is niche-specific with shop page', async () => {
    const pages = await svc.generateWebsitePages({
      deliverableId: 'website-ecommerce',
      title: 'Harbor Goods',
      clientName: 'Harbor Goods',
      industryCategory: 'ecommerce',
    });
    expect(pages.some((p) => p.slug === 'shop' || p.kind === 'shop')).toBe(true);

    const catalog = svc.generateEcommerceCatalog({
      clientName: 'Harbor Goods',
      industryCategory: 'ecommerce',
    });
    expect(catalog).toHaveLength(8);
    expect(catalog[0]?.name.toLowerCase()).not.toContain('starter package —');
    expect(catalog.every((p) => p.priceEur > 0)).toBe(true);
  });
});
