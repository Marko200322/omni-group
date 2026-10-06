import { NotFoundError, ValidationError } from '../../../utils/errors';
import { config } from '../../../config';
import { resolveVerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import {
  DeliverableContentGeneratorService,
  englishNicheLabel,
  resolveClientBrandName,
} from '../../billing/service/deliverable-content-generator.service';
import { CrmService } from '../../crm/service/crm.service';
import type {
  CreateClientSiteDtoType,
  ListSolutionsQueryDtoType,
  ClientSiteShopOrderDtoType,
} from '../dto/public-site.dto';
import { PublicSiteRepository } from '../repository/public-site.repository';
import {
  computeShopOrderTotals,
  decrementCatalogStock,
  defaultEcommerceShopSettings,
  priceShopItemsFromCatalog,
  shopSettingsFromBranding,
} from '../lib/shop-order';

const contentGenerator = new DeliverableContentGeneratorService();

export { priceShopItemsFromCatalog } from '../lib/shop-order';

/** Fallback only — prefer content-generator pages. No Omni marketing chrome. */
const DEFAULT_BUSINESS_PAGES = (title: string, tagline?: string) => [
  {
    slug: 'home',
    title,
    kind: 'home',
    body: [
      `# ${title}`,
      '',
      tagline ?? `${title} delivers clear offers, transparent pricing, and a real contact path.`,
      '',
      '## What you get',
      '- Scoped work with written acceptance criteria',
      '- Practical delivery — not tool licenses or slideware',
      '- A single accountable owner from kickoff to handoff',
      '',
      '## Next step',
      'Send a short brief. We reply within one business day with next steps and EUR pricing.',
    ].join('\n'),
  },
  {
    slug: 'services',
    title: 'Services',
    kind: 'services',
    body: [
      '# Services',
      '',
      `${title} focuses on finished outcomes:`,
      '',
      '- Discovery and scoped proposal',
      '- Delivery in visible milestones',
      '- Documentation and handoff you can operate',
      '',
      'Contact us for a personalized quote — every engagement starts with a written plan.',
    ].join('\n'),
  },
  {
    slug: 'contact',
    title: 'Contact',
    kind: 'contact',
    body: [
      `# Contact ${title}`,
      '',
      'Tell us what you need and the outcome you want in the next 30–60 days.',
      '',
      '- Response within one business day',
      '- Written proposal before any paid work',
      '- EUR pricing with a clear invoice reference',
    ].join('\n'),
  },
];

function bankTransferInstructions(paymentReference: string): {
  paymentMethod: 'manual';
  instructions: string;
  bankDetails: {
    accountName: string | null;
    iban: string | null;
    bankName: string | null;
    swift: string | null;
    currency: string;
    reference: string;
  };
} {
  const manual = config.payments.manual;
  const accountName = manual.accountName?.trim() || null;
  const iban = manual.iban?.trim() || null;
  const bankName = manual.bankName?.trim() || null;
  const swift = manual.swift?.trim() || null;
  const currency = manual.currency?.trim() || 'EUR';
  const lines = [
    'Complete payment via bank transfer using the reference above.',
    accountName ? `Account name: ${accountName}` : null,
    iban ? `IBAN: ${iban}` : null,
    bankName ? `Bank: ${bankName}` : null,
    swift ? `SWIFT/BIC: ${swift}` : null,
    'The store owner will confirm your order after funds arrive.',
  ].filter(Boolean);
  return {
    paymentMethod: 'manual',
    instructions: lines.join(' '),
    bankDetails: {
      accountName,
      iban,
      bankName,
      swift,
      currency,
      reference: paymentReference,
    },
  };
}

function mapShopOrderRow(row: {
  id: string;
  site_id: string;
  site_slug: string;
  site_title: string;
  buyer_name: string;
  buyer_email: string;
  items: unknown;
  total_eur: string;
  subtotal_eur: string | null;
  tax_eur: string;
  shipping_eur: string;
  tax_rate_percent: string;
  totals: Record<string, unknown>;
  status: string;
  payment_method: string;
  payment_reference: string | null;
  notes: string | null;
  created_at: Date;
}) {
  return {
    id: row.id,
    siteId: row.site_id,
    siteSlug: row.site_slug,
    siteTitle: row.site_title,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    items: row.items,
    totalEur: Number(row.total_eur),
    subtotalEur: row.subtotal_eur != null ? Number(row.subtotal_eur) : Number(row.total_eur),
    taxEur: Number(row.tax_eur ?? 0),
    shippingEur: Number(row.shipping_eur ?? 0),
    taxRatePercent: Number(row.tax_rate_percent ?? 0),
    totals: row.totals ?? {},
    status: row.status,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

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

  /** Public sitemap/index — slug + title only (no private owner/pages). */
  async listPublishedClientSitesIndex(limit = 100) {
    const rows = await this.repo.listPublishedClientSites(Math.min(200, Math.max(1, limit)));
    return {
      sites: rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        siteType: row.site_type,
        publicUrl: `/sites/${row.slug}`,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
      })),
    };
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

  async replaceClientSiteContent(
    userId: string,
    slug: string,
    input: {
      title: string;
      tagline?: string | null;
      branding?: Record<string, unknown>;
      pages: Array<{ slug: string; title: string; body: string; kind?: string }>;
    },
  ) {
    if (!input.pages?.length) throw new ValidationError('pages required');
    const site = await this.repo.updateClientSiteContent(slug, userId, {
      title: input.title,
      tagline: input.tagline ?? null,
      branding: input.branding,
      pages: input.pages,
    });
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
    industryCategory?: string | null;
    publish?: boolean;
  }) {
    const deliverableId = input.deliverableId ?? 'website-business';
    const siteType =
      deliverableId === 'website-ecommerce'
        ? 'ecommerce'
        : deliverableId === 'landing'
          ? 'landing'
          : 'business';

    const brandTitle = resolveClientBrandName({
      clientName: input.clientName,
      title: input.title,
      industryCategory: input.industryCategory,
    });
    const niche = englishNicheLabel({ industryCategory: input.industryCategory });
    const pageDeliverable =
      siteType === 'ecommerce'
        ? 'website-ecommerce'
        : siteType === 'landing'
          ? 'landing'
          : 'website-business';

    let pages = await contentGenerator.generateWebsitePages({
      deliverableId: pageDeliverable,
      title: brandTitle,
      clientName: brandTitle,
      industryCategory: input.industryCategory,
    });

    if (siteType === 'business' && pages.length < 3) {
      pages = DEFAULT_BUSINESS_PAGES(brandTitle).map((p) => ({
        slug: p.slug,
        title: p.title,
        kind: p.kind,
        body: p.body,
      }));
    }

    const catalog =
      siteType === 'ecommerce'
        ? contentGenerator.generateEcommerceCatalog({
            clientName: brandTitle,
            industryCategory: input.industryCategory ?? null,
          })
        : [];

    const shopSettings = siteType === 'ecommerce' ? defaultEcommerceShopSettings() : null;

    const site = await this.repo.createClientSite({
      ownerUserId: input.userId,
      projectId: input.projectId,
      slug: input.slug,
      title: brandTitle,
      tagline: `${brandTitle} — ${niche.toLowerCase()} with clear offers and a real contact path.`,
      siteType,
      branding: {
        clientName: brandTitle,
        niche,
        ...(catalog.length ? { catalog } : {}),
        ...(shopSettings
          ? {
              shopSettings,
              checkout: {
                currency: shopSettings.currency,
                provider: 'manual_bank_transfer',
                taxRatePercent: shopSettings.taxRatePercent,
                shippingFlatEur: shopSettings.shippingFlatEur,
              },
            }
          : {}),
      },
      pages: pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        body: p.body,
        kind: p.kind,
      })),
      publish: input.publish ?? false,
    });
    return this.mapClientSite(site);
  }

  async listMyClientSites(userId: string, limit = 20) {
    const rows = await this.repo.listByOwner(userId, limit);
    return { sites: rows.map((r) => this.mapClientSite(r)) };
  }

  async listMyShopOrders(userId: string, limit = 50) {
    const rows = await this.repo.listShopOrdersByOwner(userId, limit);
    return { orders: rows.map(mapShopOrderRow) };
  }

  async listSiteShopOrders(userId: string, slug: string, limit = 50) {
    const rows = await this.repo.listShopOrdersBySite(slug, userId, limit);
    return { orders: rows.map(mapShopOrderRow) };
  }

  async placeShopOrder(slug: string, body: ClientSiteShopOrderDtoType) {
    const site = await this.repo.getPublishedClientSite(slug);
    if (!site || site.site_type !== 'ecommerce') {
      throw new NotFoundError('E-commerce site');
    }

    const settings = shopSettingsFromBranding(site.branding);
    const pricedItems = priceShopItemsFromCatalog(site.branding, body.items);
    const totals = computeShopOrderTotals(pricedItems, settings);

    const paymentReference = `SHOP-${slug.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const order = await this.repo.createShopOrder({
      siteId: site.id,
      ownerUserId: site.owner_user_id,
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail,
      buyerPhone: body.buyerPhone ?? null,
      items: pricedItems,
      totalEur: totals.totalEur,
      subtotalEur: totals.subtotalEur,
      taxEur: totals.taxEur,
      shippingEur: totals.shippingEur,
      taxRatePercent: totals.taxRatePercent,
      totals: { ...totals },
      paymentReference,
      notes: body.notes ?? null,
    });

    // Decrement per-SKU stock on the live catalog (simple inventory).
    try {
      const branding =
        site.branding && typeof site.branding === 'object'
          ? (site.branding as Record<string, unknown>)
          : {};
      const nextBranding = decrementCatalogStock(
        branding,
        pricedItems.map((i) => ({ id: i.id, quantity: i.quantity })),
      );
      await this.repo.updateSiteBranding(site.id, nextBranding);
    } catch {
      /* non-fatal — order already recorded */
    }

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
        notes: `Order ${paymentReference} — EUR ${totals.totalEur.toFixed(2)} (subtotal ${totals.subtotalEur.toFixed(2)} + tax ${totals.taxEur.toFixed(2)} + shipping ${totals.shippingEur.toFixed(2)})`,
        customFields: {
          orderId: order.id,
          paymentReference,
          totals,
          items: pricedItems,
        },
      });
    } catch {
      /* non-fatal */
    }

    try {
      const { NotificationsService } = await import(
        '../../notifications/service/notifications.service'
      );
      const notifications = new NotificationsService();
      await notifications.createNotification({
        userId: site.owner_user_id,
        type: 'shop_order',
        title: `New shop order — ${paymentReference}`,
        message: `${body.buyerName} ordered EUR ${totals.totalEur.toFixed(2)} on ${site.title}`,
        actionUrl: '/dashboard/deliveries',
        metadata: {
          orderId: order.id,
          paymentReference,
          siteSlug: slug,
          totalEur: totals.totalEur,
          buyerEmail: body.buyerEmail,
        },
      });
    } catch {
      /* non-fatal */
    }

    const stripeReady = Boolean(config.stripe.secretKey.trim());
    const bank = bankTransferInstructions(order.payment_reference);

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
          items: [
            ...pricedItems.map((i) => ({
              name: i.name,
              priceEur: i.priceEur,
              quantity: i.quantity,
            })),
            ...(totals.taxEur > 0
              ? [{ name: `Tax (${totals.taxRatePercent}%)`, priceEur: totals.taxEur, quantity: 1 }]
              : []),
            ...(totals.shippingEur > 0
              ? [{ name: 'Shipping', priceEur: totals.shippingEur, quantity: 1 }]
              : []),
          ],
          totalEur: totals.totalEur,
        });
        if (checkout.sessionId) {
          await this.repo.updateShopOrderStripe(order.id, checkout.sessionId);
        }
        return {
          orderId: order.id,
          paymentReference: order.payment_reference,
          totalEur: totals.totalEur,
          subtotalEur: totals.subtotalEur,
          taxEur: totals.taxEur,
          shippingEur: totals.shippingEur,
          taxRatePercent: totals.taxRatePercent,
          currency: totals.currency,
          status: order.status,
          paymentMethod: 'stripe',
          checkoutUrl: checkout.url,
          bankTransfer: bank,
          instructions: 'Redirecting to secure card checkout (Stripe TEST/LIVE keys as configured). Bank transfer remains available with the payment reference.',
        };
      } catch {
        /* fall through to manual bank transfer */
      }
    }

    return {
      orderId: order.id,
      paymentReference: order.payment_reference,
      totalEur: totals.totalEur,
      subtotalEur: totals.subtotalEur,
      taxEur: totals.taxEur,
      shippingEur: totals.shippingEur,
      taxRatePercent: totals.taxRatePercent,
      currency: totals.currency,
      status: order.status,
      ...bank,
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
