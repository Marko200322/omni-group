import { NotFoundError, ValidationError } from '../../../utils/errors';
import { resolveVerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import type {
  CreateClientSiteDtoType,
  ListSolutionsQueryDtoType,
} from '../dto/public-site.dto';
import { PublicSiteRepository } from '../repository/public-site.repository';

const DEFAULT_BUSINESS_PAGES = (title: string, tagline?: string) => [
  {
    slug: 'home',
    title,
    kind: 'home',
    body: tagline ?? `Welcome to ${title}. Professional digital presence powered by Omni Group delivery.`,
  },
  {
    slug: 'services',
    title: 'Services',
    kind: 'services',
    body: 'Overview of services, packages, and how we work together. Contact us for a personalized quote.',
  },
  {
    slug: 'contact',
    title: 'Contact',
    kind: 'contact',
    body: 'Send an inquiry via the form or schedule a consultation. We respond within 24–48 hours.',
  },
];

export class PublicSiteService {
  private readonly repo = new PublicSiteRepository();

  async listSolutions(query: ListSolutionsQueryDtoType) {
    const { rows, total, page, limit } = await this.repo.listPublishedSolutions(query);
    return {
      items: rows.map((r) => {
        const research = r.research_data ?? {};
        const valueProp =
          typeof research.value_proposition === 'string' ? research.value_proposition : null;
        return {
          slug: r.slug,
          name: r.name,
          category: r.category,
          status: r.status,
          valueProp,
          href: `/solutions/${r.slug}`,
          updatedAt: r.updated_at,
        };
      }),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getSolution(slug: string) {
    const vertical = await this.repo.getVerticalBySlug(slug);
    if (!vertical) throw new NotFoundError('Solution vertical');
    const pack = resolveVerticalDeliveryPack({
      slug,
      category: vertical.category,
      name: vertical.name,
      researchData: vertical.research_data ?? {},
    });
    return {
      slug,
      name: vertical.name,
      category: vertical.category,
      status: vertical.status,
      deliveryPack: pack,
    };
  }

  async getClientSite(slug: string) {
    const site = await this.repo.getPublishedClientSite(slug);
    if (!site) throw new NotFoundError('Client public site');
    return this.mapClientSite(site);
  }

  async createClientSite(userId: string, dto: CreateClientSiteDtoType) {
    const pages =
      dto.pages && dto.pages.length > 0
        ? dto.pages
        : DEFAULT_BUSINESS_PAGES(dto.title, dto.tagline);
    const site = await this.repo.createClientSite({
      ownerUserId: userId,
      projectId: dto.projectId ?? null,
      slug: dto.slug,
      title: dto.title,
      tagline: dto.tagline ?? null,
      siteType: dto.siteType ?? 'business',
      branding: dto.branding ?? {},
      pages,
      publish: dto.publish ?? false,
    });
    return this.mapClientSite(site);
  }

  async publishClientSite(userId: string, slug: string, publish: boolean) {
    const site = await this.repo.setClientSiteStatus(slug, userId, publish);
    if (!site) throw new NotFoundError('Client public site');
    return this.mapClientSite(site);
  }

  /** Scaffold from product factory project + optional deliverable type. */
  async scaffoldFromProject(input: {
    userId: string;
    projectId: string;
    slug: string;
    title: string;
    clientName?: string | null;
    deliverableId?: string | null;
    publish?: boolean;
  }) {
    const siteType =
      input.deliverableId === 'website-ecommerce'
        ? 'ecommerce'
        : input.deliverableId === 'landing'
          ? 'landing'
          : 'business';

    const pages =
      siteType === 'landing'
        ? [
            {
              slug: 'home',
              title: input.title,
              kind: 'home' as const,
              body: `${input.clientName ?? input.title} — professional landing page ready for your campaign.`,
            },
          ]
        : siteType === 'ecommerce'
          ? [
              ...DEFAULT_BUSINESS_PAGES(input.title),
              {
                slug: 'shop',
                title: 'Shop',
                kind: 'shop' as const,
                body: 'Product catalog and checkout flow — integrated with manual/Stripe payment.',
              },
            ]
          : [
              ...DEFAULT_BUSINESS_PAGES(input.title),
              { slug: 'about', title: 'About us', kind: 'about' as const, body: `The team behind ${input.title}.` },
              { slug: 'pricing', title: 'Pricing', kind: 'pricing' as const, body: 'Transparent pricing and service packages.' },
            ];

    if (pages.length < 3 && siteType === 'business') {
      throw new ValidationError('Business site requires at least 3 pages');
    }

    const site = await this.repo.createClientSite({
      ownerUserId: input.userId,
      projectId: input.projectId,
      slug: input.slug,
      title: input.title,
      tagline: input.clientName ? `Digital presence — ${input.clientName}` : null,
      siteType,
      branding: { clientName: input.clientName ?? null },
      pages,
      publish: input.publish ?? false,
    });
    return this.mapClientSite(site);
  }

  private mapClientSite(row: import('../repository/public-site.repository').ClientPublicSiteRow) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      tagline: row.tagline,
      siteType: row.site_type,
      branding: row.branding,
      pages: row.pages,
      status: row.status,
      publishedAt: row.published_at,
      customDomain: row.custom_domain,
      publicUrl: `/sites/${row.slug}`,
    };
  }
}
