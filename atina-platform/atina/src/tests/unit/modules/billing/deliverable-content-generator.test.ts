jest.mock('../../../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

import {
  DeliverableContentGeneratorService,
  assessGeneratedSiteQuality,
  englishNicheLabel,
  isPlaceholderBrand,
  resolveClientBrandName,
} from '../../../../modules/billing/service/deliverable-content-generator.service';

describe('deliverable content generator quality', () => {
  const svc = new DeliverableContentGeneratorService();

  it('resolves client brand away from System Admin placeholders', () => {
    expect(isPlaceholderBrand('System Admin')).toBe(true);
    expect(resolveClientBrandName({ clientName: 'System Admin', industryCategory: 'fitness' })).toBe(
      'Fitness Studio',
    );
    expect(resolveClientBrandName({ clientName: 'System Admin', industryCategory: 'ecommerce' })).toBe(
      'Ecommerce Store',
    );
    expect(resolveClientBrandName({ clientName: 'Harbor Goods', industryCategory: 'ecommerce' })).toBe(
      'Harbor Goods',
    );
  });

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
    const shopIdx = pages.findIndex((p) => p.slug === 'shop' || p.kind === 'shop');
    expect(shopIdx).toBeGreaterThanOrEqual(1);
    expect(shopIdx).toBeLessThanOrEqual(2);

    const catalog = svc.generateEcommerceCatalog({
      clientName: 'Harbor Goods',
      industryCategory: 'ecommerce',
    });
    expect(catalog).toHaveLength(8);
    expect(catalog[0]?.name.toLowerCase()).not.toContain('starter package');
    expect(catalog.some((p) => /omni|starter package|growth package/i.test(p.name))).toBe(false);
    expect(catalog.every((p) => p.priceEur > 0)).toBe(true);
    expect(catalog.every((p) => typeof p.stockQty === 'number' && p.stockQty > 0)).toBe(true);
    expect(catalog[0]?.description).toMatch(/Harbor Goods/);
  });

  it('ecommerce pages stay client-branded when fulfillment user is System Admin', async () => {
    const pages = await svc.generateWebsitePages({
      deliverableId: 'website-ecommerce',
      title: 'System Admin',
      clientName: 'System Admin',
      industryCategory: 'ecommerce',
    });
    const home = pages.find((p) => p.kind === 'home' || p.slug === 'home');
    expect(home?.body).toMatch(/Ecommerce Store|Everyday essentials|Signature product|ecommerce/i);
    expect(home?.body).not.toMatch(/System Admin/);
    expect(pages.some((p) => p.slug === 'shop')).toBe(true);
    const shop = pages.find((p) => p.slug === 'shop' || p.kind === 'shop');
    expect(shop?.body.length ?? 0).toBeGreaterThan(220);
    const brand = resolveClientBrandName({
      clientName: 'System Admin',
      industryCategory: 'ecommerce',
    });
    expect(
      assessGeneratedSiteQuality({
        pages,
        brandName: brand,
        deliverableId: 'website-ecommerce',
      }).ok,
    ).toBe(true);
  });

  it('prefers company name over System Admin for brand title', () => {
    expect(
      resolveClientBrandName({
        clientName: 'System Admin',
        companyName: 'North Peak Studio',
        title: 'Landing + copy',
        industryCategory: 'fitness',
      }),
    ).toBe('North Peak Studio');
  });
});
