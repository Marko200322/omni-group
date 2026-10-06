import { PublicSiteModule } from '../../../../modules/public-site/public-site.module';
import { PublicSiteService, priceShopItemsFromCatalog } from '../../../../modules/public-site/service/public-site.service';
import { ValidationError } from '../../../../utils/errors';

jest.mock('../../../../modules/public-site/repository/public-site.repository', () => ({
  PublicSiteRepository: jest.fn().mockImplementation(() => ({
    listPublishedSolutions: jest.fn().mockResolvedValue({
      rows: [
        {
          slug: 'dev-it-react',
          name: 'Dev IT React',
          category: 'technology',
          status: 'deployed',
          research_data: { value_proposition: 'React dev tools' },
          updated_at: new Date(),
        },
      ],
      total: 1,
      page: 1,
      limit: 24,
    }),
    getVerticalBySlug: jest.fn().mockResolvedValue({
      slug: 'dev-it-react',
      category: 'technology',
      name: 'Dev IT React',
      status: 'deployed',
      research_data: {},
    }),
    getPublishedClientSite: jest.fn().mockResolvedValue(null),
    createClientSite: jest.fn().mockResolvedValue({
      id: 'site-1',
      slug: 'acme',
      title: 'Acme',
      tagline: null,
      site_type: 'business',
      branding: {},
      pages: [],
      status: 'draft',
      published_at: null,
      custom_domain: null,
    }),
  })),
}));

describe('PublicSiteModule', () => {
  it('registers routes after initialize', async () => {
    const m = new PublicSiteModule();
    await m.initialize();
    expect(m.slug).toBe('public-site');
    expect(m.router).toBeDefined();
  });
});

describe('PublicSiteService', () => {
  it('lists solutions with href', async () => {
    const svc = new PublicSiteService();
    const result = await svc.listSolutions({ page: 1, limit: 24 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].href).toBe('/solutions/dev-it-react');
  });

  it('returns delivery pack for vertical', async () => {
    const svc = new PublicSiteService();
    const result = await svc.getSolution('dev-it-react');
    expect(result.slug).toBe('dev-it-react');
    expect(result.deliveryPack.verticalSlug).toBe('dev-it-react');
    expect(result.deliveryPack.recommendedDeliverables.length).toBeGreaterThan(0);
  });
});

describe('priceShopItemsFromCatalog', () => {
  const branding = {
    catalog: [
      { id: 'sku-1', name: 'Everyday essentials set', priceEur: 42, stockQty: 20 },
      { id: 'sku-2', name: 'Signature product', priceEur: 68, stockQty: 20 },
    ],
  };

  it('reprices from the site catalog and ignores client amounts', () => {
    const priced = priceShopItemsFromCatalog(branding, [
      { id: 'sku-1', quantity: 2 },
    ]);
    expect(priced).toEqual([
      { id: 'sku-1', name: 'Everyday essentials set', priceEur: 42, quantity: 2, stockQty: 20 },
    ]);
  });

  it('rejects unknown catalog ids', () => {
    expect(() =>
      priceShopItemsFromCatalog(branding, [{ id: 'not-real', quantity: 1 }]),
    ).toThrow(ValidationError);
  });
});

describe('scaffoldFromProject ecommerce', () => {
  it('seeds industry catalog, shop settings, and shop page (not Omni Starter packs)', async () => {
    const createClientSite = jest.fn().mockResolvedValue({
      id: 'site-1',
      slug: 'harbor',
      title: 'Harbor Goods',
      tagline: 'x',
      site_type: 'ecommerce',
      branding: { catalog: [] },
      pages: [],
      status: 'published',
      published_at: new Date(),
      custom_domain: null,
    });
    const { PublicSiteRepository } = jest.requireMock(
      '../../../../modules/public-site/repository/public-site.repository',
    ) as { PublicSiteRepository: jest.Mock };
    PublicSiteRepository.mockImplementation(() => ({
      createClientSite,
      listPublishedSolutions: jest.fn(),
      getVerticalBySlug: jest.fn(),
      getPublishedClientSite: jest.fn(),
    }));

    const svc = new PublicSiteService();
    await svc.scaffoldFromProject({
      userId: 'u1',
      projectId: 'p1',
      slug: 'harbor',
      title: 'Harbor Goods',
      clientName: 'Harbor Goods',
      deliverableId: 'website-ecommerce',
      industryCategory: 'ecommerce',
      publish: true,
    });

    expect(createClientSite).toHaveBeenCalled();
    const arg = createClientSite.mock.calls[0][0] as {
      siteType: string;
      title: string;
      pages: Array<{ slug: string }>;
      branding: {
        catalog: Array<{ name: string; stockQty?: number }>;
        shopSettings?: { taxRatePercent: number; shippingFlatEur: number };
      };
    };
    expect(arg.siteType).toBe('ecommerce');
    expect(arg.title).toBe('Harbor Goods');
    expect(arg.pages.some((p) => p.slug === 'shop')).toBe(true);
    expect(arg.branding.catalog.length).toBeGreaterThanOrEqual(4);
    expect(arg.branding.catalog.some((p) => /Omni|Starter$/i.test(p.name))).toBe(false);
    expect(arg.branding.catalog.every((p) => typeof p.stockQty === 'number' && p.stockQty > 0)).toBe(
      true,
    );
    expect(arg.branding.shopSettings?.taxRatePercent).toBe(20);
    expect(arg.branding.shopSettings?.shippingFlatEur).toBe(4.9);
  });
});
