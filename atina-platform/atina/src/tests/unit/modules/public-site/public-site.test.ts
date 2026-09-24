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
      { id: 'starter-pack', name: 'Starter', priceEur: 49 },
      { id: 'growth-pack', name: 'Growth', priceEur: 99 },
    ],
  };

  it('reprices from the site catalog and ignores client amounts', () => {
    const priced = priceShopItemsFromCatalog(branding, [
      { id: 'starter-pack', name: 'Hacked', priceEur: 1, quantity: 2 },
    ]);
    expect(priced).toEqual([{ id: 'starter-pack', name: 'Starter', priceEur: 49, quantity: 2 }]);
  });

  it('rejects unknown catalog ids', () => {
    expect(() =>
      priceShopItemsFromCatalog(branding, [{ id: 'not-real', name: 'X', priceEur: 1, quantity: 1 }]),
    ).toThrow(ValidationError);
  });
});
