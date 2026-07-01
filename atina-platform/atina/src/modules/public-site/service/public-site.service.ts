import { NotFoundError, ValidationError } from '../../../utils/errors';
import { config } from '../../../config';
import { resolveVerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import { CrmService } from '../../crm/service/crm.service';
import type {
  CreateClientSiteDtoType,
  ListSolutionsQueryDtoType,
  ClientSiteShopOrderDtoType,
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
  private readonly crm = new CrmService();

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

  async listMyClientSites(userId: string, limit = 20) {
    const rows = await this.repo.listByOwner(userId, limit);
    return { sites: rows.map((r) => this.mapClientSite(r)) };
  }

  async placeShopOrder(slug: string, body: ClientSiteShopOrderDtoType) {
    const site = await this.repo.getPublishedClientSite(slug);
    if (!site || site.site_type !== 'ecommerce') {
      throw new NotFoundError('E-commerce site');
    }

    const total = body.items.reduce((sum, item) => sum + item.priceEur * item.quantity, 0);
    if (total <= 0) throw new ValidationError('Order total must be positive');

    const paymentReference = `SHOP-${slug.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const order = await this.repo.createShopOrder({
      siteId: site.id,
      ownerUserId: site.owner_user_id,
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail,
      buyerPhone: body.buyerPhone ?? null,
      items: body.items,
      totalEur: Math.round(total * 100) / 100,
      paymentReference,
      notes: body.notes ?? null,
    });

    const nameParts = body.buyerName.trim().split(/\s+/);
    try {
      await this.crm.createContact(site.owner_user_id, {
        firstName: nameParts[0] ?? 'Shop',
        lastName: nameParts.slice(1).join(' ') || 'Customer',
        email: body.buyerEmail,
        phone: body.buyerPhone,
        status: 'prospect',
        source: `shop:${slug}`,
        tags: ['shop-order', slug],
        notes: `Order ${paymentReference} — €${total.toFixed(2)}`,
        customFields: { orderId: order.id, paymentReference },
      });
    } catch {
      /* non-fatal */
    }

    const stripeReady =
      Boolean(config.stripe.secretKey.trim()) && config.payments.mode !== 'manual';

    if (stripeReady) {
      try {
        const { PaymentsService } = await import('../../payments/service/payments.service');
        const payments = new PaymentsService();
        const checkout = await payments.createShopCheckoutSession({
          orderId: order.id,
          siteSlug: slug,
          siteTitle: site.title,
          ownerUserId: site.owner_user_id,
          buyerEmail: body.buyerEmail,
          buyerName: body.buyerName,
          items: body.items.map((i) => ({
            name: i.name,
            priceEur: i.priceEur,
            quantity: i.quantity,
          })),
          totalEur: Math.round(total * 100) / 100,
        });
        if (checkout.sessionId) {
          await this.repo.updateShopOrderStripe(order.id, checkout.sessionId);
        }
        return {
          orderId: order.id,
          paymentReference: order.payment_reference,
          totalEur: Number(order.total_eur),
          currency: 'EUR',
          status: order.status,
          paymentMethod: 'stripe',
          checkoutUrl: checkout.url,
          instructions: 'Redirecting to secure card checkout.',
        };
      } catch {
        /* fall through to manual bank transfer */
      }
    }

    return {
      orderId: order.id,
      paymentReference: order.payment_reference,
      totalEur: Number(order.total_eur),
      currency: 'EUR',
      status: order.status,
      paymentMethod: 'manual',
      instructions:
        'Complete payment via bank transfer using the reference above. The store owner will confirm your order.',
    };
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
