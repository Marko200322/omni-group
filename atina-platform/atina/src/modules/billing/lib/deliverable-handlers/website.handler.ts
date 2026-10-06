import { config } from '../../../../config';
import { getDeliverable } from '../deliverable-catalog';
import {
  DeliverableContentGeneratorService,
  isPlaceholderBrand,
  resolveClientBrandName,
} from '../../service/deliverable-content-generator.service';
import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import { resolveVerticalDeliveryPack } from '../../../autonomy-loop/lib/vertical-delivery-resolver';
import { resolveVerticalSlug } from '../../../../shared/industry/industry-catalog';
import logger from '../../../../utils/logger';
import { persistDeliverablePdf, persistMarkdownBundle } from './artifact-helpers';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';

const content = new DeliverableContentGeneratorService();
const docs = new DeliverableDocumentGeneratorService();
const factory = new ProductFactoryService();

const OMNI_CHROME_HTML_RE =
  /ask\s*omi\b|powered by omni|omni group tech(?!\s+intake)|omnigrouptech\.com\/(login|pricing|products|register)\b/i;

function verticalContext(industryCategory?: string | null) {
  const slug = industryCategory?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') ?? 'general-business';
  const resolved = resolveVerticalSlug(slug);
  return resolveVerticalDeliveryPack({
    slug,
    category: resolved?.category ?? 'general_business',
    subtype: resolved?.subtype ?? null,
    name: resolved?.name ?? slug,
  });
}

function absoluteSiteUrl(publicUrl: string): string {
  const base = String(config.app.webUrl || config.app.url || 'https://omnigrouptech.com').replace(/\/+$/, '');
  if (publicUrl.startsWith('http')) return publicUrl;
  return `${base}${publicUrl.startsWith('/') ? '' : '/'}${publicUrl}`;
}

function extractHtmlTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return (m?.[1] ?? '').replace(/\s+/g, ' ').trim();
}

async function assertSiteLive(absoluteUrl: string): Promise<{
  ok: boolean;
  status: number;
  bytes: number;
  detectedTitle: string;
  omniChrome: boolean;
  snippet: string;
}> {
  try {
    const res = await fetch(absoluteUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'text/html' },
    });
    const text = await res.text();
    const bytes = Buffer.byteLength(text, 'utf8');
    const detectedTitle = extractHtmlTitle(text);
    // Judge visible page content, not inherited platform <head>/RSC payload defaults.
    const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const rawBody = bodyMatch?.[1] ?? text;
    const visible = rawBody
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const snippet = visible.slice(0, 4000);
    const omniChrome =
      OMNI_CHROME_HTML_RE.test(snippet) ||
      isPlaceholderBrand(detectedTitle) ||
      /system\s*admin/i.test(detectedTitle);
    return {
      ok: res.status === 200 && bytes >= 800,
      status: res.status,
      bytes,
      detectedTitle,
      omniChrome,
      snippet: snippet.slice(0, 500),
    };
  } catch (err) {
    logger.warn('Site live probe failed', {
      absoluteUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, status: 0, bytes: 0, detectedTitle: '', omniChrome: false, snippet: '' };
  }
}

export const websiteFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['landing', 'website-business', 'website-ecommerce'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const deliverable = getDeliverable(ctx.deliverableId)!;
    const pack = verticalContext(ctx.industryCategory);
    const brandTitle = resolveClientBrandName({
      clientName: ctx.clientName,
      // Never use SKU/catalog names as the client brand.
      title: null,
      industryCategory: ctx.industryCategory,
      verticalPack: pack,
    });
    const baseSlug =
      brandTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'site';
    const slug = `${baseSlug}-${ctx.paymentId.slice(0, 8)}`.slice(0, 128);

    const brief = await content.generateProjectBrief({
      deliverableId: ctx.deliverableId,
      clientName: brandTitle,
      industryCategory: ctx.industryCategory,
      verticalPack: pack,
      generationHints: ctx.generationHints,
    });

    const pipeline = await factory.runAutomatedClientOrder({
      userId: ctx.userId,
      paymentId: ctx.paymentId,
      deliverableId: ctx.deliverableId,
      slug,
      name: brandTitle,
      description: brief,
      clientName: brandTitle,
      clientEmail: ctx.clientEmail ?? null,
      industryCategory: ctx.industryCategory ?? null,
      publishSite: true,
      verticalPack: pack,
      generationHints: ctx.generationHints,
    });

    const publicUrl = (pipeline.publicUrl as string) ?? null;
    if (!publicUrl?.trim()) {
      throw new Error('Website fulfillment published without publicUrl');
    }
    const abs = absoluteSiteUrl(publicUrl);
    const live = await assertSiteLive(abs);
    if (!live.ok) {
      throw new Error(
        `Published site not reachable (http=${live.status}, bytes=${live.bytes}): ${abs}`,
      );
    }
    if (live.omniChrome || isPlaceholderBrand(brandTitle)) {
      throw new Error(
        `Published site rejected: Omni chrome / System Admin brand detected (title=${live.detectedTitle || brandTitle})`,
      );
    }

    const pageCount = (pipeline.pageCount as number) ?? null;
    const catalog = pipeline.ecommerceCatalog ?? null;
    const catalogCount = Array.isArray(catalog) ? catalog.length : null;
    const contentQuality = pipeline.contentQuality as
      | { ok?: boolean; thinPages?: string[]; omniChrome?: boolean; brandInHome?: boolean }
      | null
      | undefined;
    const hasShopPage = Boolean(
      pipeline.hasShopPage === true ||
        (Array.isArray(pipeline.pageSlugs) &&
          (pipeline.pageSlugs as string[]).some((s) => /shop/i.test(String(s)))),
    );
    const catalogVisible =
      ctx.deliverableId === 'website-ecommerce' ? Boolean(catalogCount && catalogCount >= 4) : false;

    if (contentQuality && contentQuality.ok === false) {
      throw new Error(
        `Site content quality failed (thin=${(contentQuality.thinPages ?? []).join(',') || 'n/a'}, brandInHome=${contentQuality.brandInHome}, omniChrome=${contentQuality.omniChrome})`,
      );
    }

    if (ctx.deliverableId === 'website-ecommerce') {
      if (!hasShopPage) {
        throw new Error('E-commerce fulfillment missing shop page');
      }
      if (!catalogVisible) {
        throw new Error('E-commerce fulfillment missing visible catalog (need 4+ products)');
      }
    }

    const doc = await docs.generateSiteDeliveryPack({
      deliverableId: ctx.deliverableId,
      clientName: brandTitle,
      industryCategory: ctx.industryCategory,
      publicUrl,
      absoluteUrl: abs,
      pageCount,
      catalogCount,
    });
    const pdf = await persistDeliverablePdf({
      ctx,
      doc,
      artifactType: 'site_delivery_pack',
      filename: `${ctx.deliverableId}-delivery.pdf`,
    });
    const md = await persistMarkdownBundle({ ctx, doc, artifactType: 'site_delivery_pack_md' });

    return {
      projectId: pipeline.projectId as string,
      publicUrl,
      artifacts: [pdf, md],
      status: 'completed',
      metadata: {
        verticalSlug: pack.verticalSlug,
        keywords: pack.keywords,
        qualityGates: pack.qualityGates,
        pageCount,
        pageSlugs: pipeline.pageSlugs ?? null,
        contentQuality: contentQuality ?? null,
        siteContentOk: contentQuality?.ok !== false,
        ecommerceCatalog: catalog,
        hasShopPage: ctx.deliverableId === 'website-ecommerce' ? hasShopPage : undefined,
        catalogVisible: ctx.deliverableId === 'website-ecommerce' ? catalogVisible : undefined,
        siteTitle: brandTitle,
        brandTitle,
        ecommerceScope: ctx.deliverableId === 'website-ecommerce' ? 'hybrid' : undefined,
        ecommerceHonesty: ctx.deliverableId === 'website-ecommerce' ? true : undefined,
        ecommerceHonestyNote:
          ctx.deliverableId === 'website-ecommerce'
            ? 'HYBRID storefront: live catalog, cart, and order path — not full merchant inventory/tax/Stripe Connect'
            : undefined,
        claimsFullMerchantStore: false,
        liveProbe: {
          url: abs,
          status: live.status,
          bytes: live.bytes,
          ok: true,
          detectedTitle: live.detectedTitle,
          omniChrome: live.omniChrome,
          snippet: live.snippet,
        },
      },
    };
  },
};
