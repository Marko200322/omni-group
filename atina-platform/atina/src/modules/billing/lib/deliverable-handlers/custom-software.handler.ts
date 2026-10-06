import { getDeliverable } from '../deliverable-catalog';
import { DeliverableContentGeneratorService } from '../../service/deliverable-content-generator.service';
import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import {
  buildDocumentQualityMetadata,
  persistDeliverablePdf,
  persistMarkdownBundle,
} from './artifact-helpers';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';

const content = new DeliverableContentGeneratorService();
const docs = new DeliverableDocumentGeneratorService();
const factory = new ProductFactoryService();

export const customSoftwareFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['custom-software'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const deliverable = getDeliverable(ctx.deliverableId)!;
    const slug = `app-${ctx.paymentId.replace(/-/g, '').slice(0, 20)}-${Date.now().toString(36)}`;
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
      name: `${deliverable.name} — ${ctx.clientName}`,
      description: brief,
      clientName: ctx.clientName,
      clientEmail: ctx.clientEmail ?? null,
      industryCategory: ctx.industryCategory ?? null,
      publishSite: false,
      skipWebsite: true,
      enhancedGreenfield: true,
      generationHints: ctx.generationHints,
    });

    const outputDir = (pipeline.outputDir as string) ?? 'product-factory output';
    const handoff = await docs.generateSoftwareHandoff({
      clientName: ctx.clientName,
      projectName: deliverable.name,
      description: brief,
      outputDir,
      industryCategory: ctx.industryCategory,
      generationHints: ctx.generationHints,
    });
    const pdf = await persistDeliverablePdf({
      ctx,
      doc: handoff,
      artifactType: 'software_handoff',
      filename: 'software-handoff.pdf',
    });
    const md = await persistMarkdownBundle({ ctx, doc: handoff, artifactType: 'software_handoff_md' });
    const docMeta = buildDocumentQualityMetadata(handoff, ctx, {
      pdfBytes: pdf.pdfBytes,
      pdfPageCount: pdf.pdfPageCount,
    });
    const testsPassed =
      pipeline.testsPassed === true || pipeline.testPassed === true
        ? true
        : pipeline.testsPassed === false || pipeline.testPassed === false
          ? false
          : false;
    const buildStatus =
      typeof pipeline.buildStatus === 'string' && pipeline.buildStatus.trim()
        ? String(pipeline.buildStatus)
        : testsPassed
          ? 'completed'
          : 'unknown';

    return {
      projectId: pipeline.projectId as string,
      artifacts: [pdf.artifact, md],
      status: docMeta.documentSubstanceOk === false ? 'partial' : 'completed',
      metadata: {
        ...docMeta,
        outputDir,
        stack: 'node-api-spa',
        testsPassed,
        buildStatus,
      },
    };
  },
};
