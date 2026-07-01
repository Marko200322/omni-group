import { getDeliverable } from '../deliverable-catalog';
import { DeliverableContentGeneratorService } from '../../service/deliverable-content-generator.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import { resolveVerticalDeliveryPack } from '../../../autonomy-loop/lib/vertical-delivery-resolver';
import { resolveVerticalSlug } from '../../../../shared/industry/industry-catalog';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';

const content = new DeliverableContentGeneratorService();
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

export const websiteFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['landing', 'website-business', 'website-ecommerce'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const deliverable = getDeliverable(ctx.deliverableId)!;
    const pack = verticalContext(ctx.industryCategory);
    const title = `${deliverable.name} — ${ctx.clientName}`;
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
      generationHints: ctx.generationHints,
    });

    const pipeline = await factory.runAutomatedClientOrder({
      userId: ctx.userId,
      paymentId: ctx.paymentId,
      deliverableId: ctx.deliverableId,
      slug,
      name: title,
      description: brief,
      clientName: ctx.clientName,
      clientEmail: ctx.clientEmail ?? null,
      industryCategory: ctx.industryCategory ?? null,
      publishSite: true,
      verticalPack: pack,
      generationHints: ctx.generationHints,
    });

    return {
      projectId: pipeline.projectId as string,
      publicUrl: (pipeline.publicUrl as string) ?? null,
      artifacts: [],
      status: 'completed',
      metadata: {
        verticalSlug: pack.verticalSlug,
        keywords: pack.keywords,
        qualityGates: pack.qualityGates,
        pageCount: (pipeline.pageCount as number) ?? null,
        ecommerceCatalog: pipeline.ecommerceCatalog ?? null,
      },
    };
  },
};
