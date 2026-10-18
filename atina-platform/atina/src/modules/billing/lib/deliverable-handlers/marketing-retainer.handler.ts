import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ClientDeliverableBootstrapService } from '../../service/client-deliverable-bootstrap.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import { getDeliverable } from '../deliverable-catalog';
import {
  buildDocumentQualityMetadata,
  persistDeliverablePdf,
  persistMarkdownBundle,
} from './artifact-helpers';
import {
  attachServiceAndCommercialCompanion,
  mergeServiceCompanion,
} from './commercial-companion';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';
import logger from '../../../../utils/logger';

const docs = new DeliverableDocumentGeneratorService();
const bootstrap = new ClientDeliverableBootstrapService();
const factory = new ProductFactoryService();

async function createRetainerProject(ctx: FulfillmentContext, title: string, description: string) {
  const pipeline = await factory.runAutomatedClientOrder({
    userId: ctx.userId,
    paymentId: ctx.paymentId,
    deliverableId: ctx.deliverableId,
    slug: `mkt-${ctx.deliverableId.replace(/[^a-z0-9-]/gi, '').slice(0, 20)}-${ctx.paymentId.replace(/-/g, '').slice(0, 12)}`,
    name: title,
    description,
    clientName: ctx.clientName,
    clientEmail: ctx.clientEmail ?? null,
    industryCategory: ctx.industryCategory ?? null,
    publishSite: false,
    skipWebsite: true,
    generationHints: ctx.generationHints,
  });
  return pipeline.projectId as string;
}

/**
 * Fulfillment handler for marketing/growth retainer packages:
 * - seo-audit: Technical SEO audit + monthly SEO plan (SERVICE + DOCS)
 * - email-marketing: Campaign strategy + sequence templates (monthly retainer)
 * - reputation-management: Review funnel + response templates (monthly retainer)
 *
 * Quality gates: DOC_SUBSTANCE + commercial invoice + service companion (seo-audit)
 * or kickoff ticket + modules (retainers).
 */
export const marketingRetainerFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['seo-audit', 'email-marketing', 'reputation-management'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const deliverable = getDeliverable(ctx.deliverableId);

    if (ctx.deliverableId === 'seo-audit') {
      return fulfillSeoAudit(ctx);
    }
    if (ctx.deliverableId === 'email-marketing') {
      return fulfillEmailMarketing(ctx, deliverable);
    }
    return fulfillReputationManagement(ctx, deliverable);
  },
};

async function fulfillSeoAudit(ctx: FulfillmentContext): Promise<FulfillmentResult> {
  const doc = await docs.generateSeoAuditReport({
    clientName: ctx.clientName,
    industryCategory: ctx.industryCategory,
    generationHints: ctx.generationHints,
  });
  const pdf = await persistDeliverablePdf({
    ctx,
    doc,
    artifactType: 'seo_audit',
    filename: 'seo-audit-report.pdf',
  });
  const enriched = pdf.doc;
  const md = await persistMarkdownBundle({ ctx, doc: enriched, artifactType: 'seo_audit_md' });
  const meta = buildDocumentQualityMetadata(enriched, ctx, {
    pdfBytes: pdf.pdfBytes,
    pdfPageCount: pdf.pdfPageCount,
  });
  const substanceFailed = meta.documentSubstanceOk === false;
  const base: FulfillmentResult = {
    artifacts: [pdf.artifact, md],
    status: substanceFailed ? 'partial' : 'completed',
    metadata: {
      ...meta,
      seoAuditDelivered: true,
      monthlySeoPlan: true,
      cmsAccessRequired: true,
      ...(substanceFailed ? { reason: 'document_substance_below_threshold' } : {}),
    },
  };
  const companion = await attachServiceAndCommercialCompanion(ctx, base);
  return mergeServiceCompanion(base, companion);
}

async function fulfillEmailMarketing(
  ctx: FulfillmentContext,
  deliverable: ReturnType<typeof getDeliverable>,
): Promise<FulfillmentResult> {
  const doc = await docs.generateEmailMarketingPack({
    clientName: ctx.clientName,
    industryCategory: ctx.industryCategory,
    generationHints: ctx.generationHints,
  });
  const pdf = await persistDeliverablePdf({
    ctx,
    doc,
    artifactType: 'email_marketing',
    filename: 'email-marketing-strategy.pdf',
  });
  const enriched = pdf.doc;
  const md = await persistMarkdownBundle({ ctx, doc: enriched, artifactType: 'email_marketing_md' });
  const docMeta = buildDocumentQualityMetadata(enriched, ctx, {
    pdfBytes: pdf.pdfBytes,
    pdfPageCount: pdf.pdfPageCount,
  });

  const projectId = await createRetainerProject(
    ctx,
    enriched.title,
    enriched.sections.map((s) => `${s.heading}: ${s.body.slice(0, 100)}`).join('\n'),
  );

  const modules = deliverable?.modules ?? ['email-campaigns', 'sms-outreach'];
  const modulesActivated = await bootstrap.activateModules({
    userId: ctx.userId,
    moduleSlugs: modules,
    clientName: ctx.clientName,
    industryCategory: ctx.industryCategory,
  });

  const kickoffTicketId = await bootstrap.openKickoffSupportTicket({
    userId: ctx.userId,
    clientName: ctx.clientName,
    deliverableId: ctx.deliverableId,
    slaHours: 48,
    industryCategory: ctx.industryCategory,
  });

  const slaPack = bootstrap.saveSlaOnboardingPack({
    userId: ctx.userId,
    paymentId: ctx.paymentId,
    clientName: ctx.clientName,
    deliverableId: ctx.deliverableId,
    slaHours: 48,
    modulesActivated,
    kickoffTicketId,
    industryCategory: ctx.industryCategory,
    extras: {
      sendInfrastructure: 'CONFIGURATION REQUIRED — Resend/Twilio API keys needed for live sends',
      sequenceTemplatesDelivered: true,
      note: 'Campaign blueprints + sequence templates delivered. Sending infrastructure NOT CONNECTED until API keys configured.',
    },
  });

  const ticketOk = Boolean(kickoffTicketId);
  return {
    projectId,
    artifacts: [pdf.artifact, md, slaPack],
    status: docMeta.documentSubstanceOk === false || !ticketOk ? 'partial' : 'completed',
    metadata: {
      ...docMeta,
      modulesActivated,
      kickoffTicketId: kickoffTicketId ?? null,
      emailMarketingDelivered: true,
      sendInfrastructureConnected: false,
      sendInfrastructureStatus: 'CONFIGURATION REQUIRED',
      billing: 'monthly',
      retainerWorkspace: true,
      ...(ticketOk ? {} : { reason: 'kickoff_ticket_missing' }),
    },
  };
}

async function fulfillReputationManagement(
  ctx: FulfillmentContext,
  deliverable: ReturnType<typeof getDeliverable>,
): Promise<FulfillmentResult> {
  const doc = await docs.generateReputationManagementPack({
    clientName: ctx.clientName,
    industryCategory: ctx.industryCategory,
    generationHints: ctx.generationHints,
  });
  const pdf = await persistDeliverablePdf({
    ctx,
    doc,
    artifactType: 'reputation_management',
    filename: 'reputation-management-plan.pdf',
  });
  const enriched = pdf.doc;
  const md = await persistMarkdownBundle({ ctx, doc: enriched, artifactType: 'reputation_management_md' });
  const docMeta = buildDocumentQualityMetadata(enriched, ctx, {
    pdfBytes: pdf.pdfBytes,
    pdfPageCount: pdf.pdfPageCount,
  });

  const projectId = await createRetainerProject(
    ctx,
    enriched.title,
    enriched.sections.map((s) => `${s.heading}: ${s.body.slice(0, 100)}`).join('\n'),
  );

  const modules = deliverable?.modules ?? ['review-automation', 'reputation-monitor'];
  const modulesActivated = await bootstrap.activateModules({
    userId: ctx.userId,
    moduleSlugs: modules,
    clientName: ctx.clientName,
    industryCategory: ctx.industryCategory,
  });

  const kickoffTicketId = await bootstrap.openKickoffSupportTicket({
    userId: ctx.userId,
    clientName: ctx.clientName,
    deliverableId: ctx.deliverableId,
    slaHours: 48,
    industryCategory: ctx.industryCategory,
  });

  const slaPack = bootstrap.saveSlaOnboardingPack({
    userId: ctx.userId,
    paymentId: ctx.paymentId,
    clientName: ctx.clientName,
    deliverableId: ctx.deliverableId,
    slaHours: 48,
    modulesActivated,
    kickoffTicketId,
    industryCategory: ctx.industryCategory,
    extras: {
      reviewAutomation: 'CONFIGURATION REQUIRED — Google Business / Yelp API keys needed',
      responseTemplatesDelivered: true,
      monitoringDashboard: true,
      note: 'Review funnel + response templates + monitoring dashboard delivered. Automated review requests NOT CONNECTED until API keys configured.',
    },
  });

  const ticketOk = Boolean(kickoffTicketId);
  return {
    projectId,
    artifacts: [pdf.artifact, md, slaPack],
    status: docMeta.documentSubstanceOk === false || !ticketOk ? 'partial' : 'completed',
    metadata: {
      ...docMeta,
      modulesActivated,
      kickoffTicketId: kickoffTicketId ?? null,
      reputationManagementDelivered: true,
      reviewAutomationConnected: false,
      reviewAutomationStatus: 'CONFIGURATION REQUIRED',
      billing: 'monthly',
      retainerWorkspace: true,
      ...(ticketOk ? {} : { reason: 'kickoff_ticket_missing' }),
    },
  };
}
