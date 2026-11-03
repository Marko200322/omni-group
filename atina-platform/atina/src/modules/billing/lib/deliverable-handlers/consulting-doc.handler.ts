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
  ids: ['audit', 'workflow-design', 'integration', 'ai-pilot', 'compliance-pack', 'billing-automation'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const docInput = {
      clientName: ctx.clientName,
      industryCategory: ctx.industryCategory,
      generationHints: ctx.generationHints,
    };
    if (ctx.deliverableId === 'audit') {
      const doc = await docs.generateAuditReport(docInput);
      return deliverDocPack(ctx, 'audit_report', 'technical-audit.pdf', doc);
    }
    if (ctx.deliverableId === 'workflow-design') {
      const doc = await docs.generateWorkflowDesign(docInput);
      return deliverDocPack(ctx, 'workflow_design', 'workflow-sop-pack.pdf', doc);
    }
    if (ctx.deliverableId === 'ai-pilot') {
      const doc = await docs.generateAiPilotPlan(docInput);
      return deliverDocPack(ctx, 'ai_pilot_plan', 'ai-pilot-30-day-plan.pdf', doc);
    }
    if (ctx.deliverableId === 'compliance-pack') {
      const doc = await docs.generateCompliancePack(docInput);
      return deliverDocPack(ctx, 'compliance_pack', 'gdpr-einvoice-compliance-pack.pdf', doc);
    }
    // 'integration' and 'billing-automation' both ship a guide plus a signed integration config artifact.
    const isBilling = ctx.deliverableId === 'billing-automation';
    const doc = isBilling
      ? await docs.generateBillingAutomationGuide(docInput)
      : await docs.generateIntegrationGuide(docInput);
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
    const base = isBilling
      ? await deliverDocPack(ctx, 'billing_automation_guide', 'billing-automation-guide.pdf', doc)
      : await deliverDocPack(ctx, 'integration_guide', 'integration-guide.pdf', doc);
    return {
      ...base,
      artifacts: [...base.artifacts, configArtifact],
      metadata: { integrationConfig: { webhookSecret: '***redacted***' } },
    };
  },
};
