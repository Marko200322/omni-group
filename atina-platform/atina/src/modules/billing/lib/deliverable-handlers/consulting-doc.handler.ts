import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ClientDeliverableBootstrapService } from '../../service/client-deliverable-bootstrap.service';
import { persistDeliverablePdf, persistMarkdownBundle } from './artifact-helpers';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';

const docs = new DeliverableDocumentGeneratorService();
const bootstrap = new ClientDeliverableBootstrapService();

async function deliverDocPack(
  ctx: FulfillmentContext,
  type: string,
  filename: string,
  doc: Awaited<ReturnType<DeliverableDocumentGeneratorService['generateAuditReport']>>,
): Promise<FulfillmentResult> {
  const pdf = await persistDeliverablePdf({ ctx, doc, artifactType: type, filename });
  const md = await persistMarkdownBundle({ ctx, doc, artifactType: `${type}_md` });
  return { artifacts: [pdf, md], status: 'completed', metadata: { documentTitle: doc.title } };
}

export const consultingDocFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['audit', 'workflow-design', 'integration'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    if (ctx.deliverableId === 'audit') {
      const doc = await docs.generateAuditReport({
        clientName: ctx.clientName,
        industryCategory: ctx.industryCategory,
        generationHints: ctx.generationHints,
      });
      return deliverDocPack(ctx, 'audit_report', 'technical-audit.pdf', doc);
    }
    if (ctx.deliverableId === 'workflow-design') {
      const doc = await docs.generateWorkflowDesign({
        clientName: ctx.clientName,
        industryCategory: ctx.industryCategory,
        generationHints: ctx.generationHints,
      });
      return deliverDocPack(ctx, 'workflow_design', 'workflow-sop-pack.pdf', doc);
    }
    const doc = await docs.generateIntegrationGuide({
      clientName: ctx.clientName,
      industryCategory: ctx.industryCategory,
      generationHints: ctx.generationHints,
    });
    const pack = bootstrap.resolvePack(ctx.industryCategory);
    const integrationConfig = bootstrap.buildIntegrationConfig({
      userId: ctx.userId,
      clientName: ctx.clientName,
      paymentId: ctx.paymentId,
      pack,
    });
    const configArtifact = bootstrap.saveIntegrationArtifact({
      userId: ctx.userId,
      paymentId: ctx.paymentId,
      config: integrationConfig,
    });
    const base = await deliverDocPack(ctx, 'integration_guide', 'integration-guide.pdf', doc);
    return {
      ...base,
      artifacts: [...base.artifacts, configArtifact],
      metadata: { integrationConfig: { webhookSecret: '***redacted***' } },
    };
  },
};
