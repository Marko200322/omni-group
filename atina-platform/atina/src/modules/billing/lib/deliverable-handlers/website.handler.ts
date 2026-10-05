import config from '../../../../config';
import { getDeliverable } from '../deliverable-catalog';
import { DeliverableContentGeneratorService } from '../../service/deliverable-content-generator.service';
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

async function assertSiteLive(absoluteUrl: string): Promise<{ ok: boolean; status: number; bytes: number }> {
  try {
    const res = await fetch(absoluteUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'text/html' },
    });
    const text = await res.text();
    const bytes = Buffer.byteLength(text, 'utf8');
    return { ok: res.status === 200 && bytes >= 800, status: res.status, bytes };
  } catch (err) {
    logger.warn('Site live probe failed', {
      absoluteUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, status: 0, bytes: 0 };
  }
}

export const websiteFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['landing', 'website-business', 'website-ecommerce'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const deliverable = getDeliverable(ctx.deliverableId)!;
    const pack = verticalContext(ctx.industryCategory);
    const brandTitle = ctx.clientName.trim() || deliverable.name;
    const baseSlug =
      ctx.clientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'site';
    const slug = `${baseSlug}-${ctx.paymentId.slice(0, 8)}`.slice(0, 128);

    const brief = await content.generateProjectBrief({
      deliverableId: ctx.deliverableId,
      clientName: ctx.clientName,
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
      clientName: ctx.clientName,
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

    const pageCount = (pipeline.pageCount as number) ?? null;
    const catalog = pipeline.ecommerceCatalog ?? null;
    const catalogCount = Array.isArray(catalog) ? catalog.length : null;

    const doc = await docs.generateSiteDeliveryPack({
      deliverableId: ctx.deliverableId,
      clientName: ctx.clientName,
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
        ecommerceCatalog: catalog,
        liveProbe: { url: abs, status: live.status, bytes: live.bytes, ok: true },
      },
    };
  },
};
