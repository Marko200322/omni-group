import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ClientDeliverableBootstrapService } from '../../service/client-deliverable-bootstrap.service';
import { AutonomyOrchestratorService } from '../../../autonomy-loop/service/autonomy-orchestrator.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import {
  buildDocumentQualityMetadata,
  persistDeliverablePdf,
  persistMarkdownBundle,
} from './artifact-helpers';
import { websiteFulfillmentHandler } from './website.handler';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';
import logger from '../../../../utils/logger';

const docs = new DeliverableDocumentGeneratorService();
const autonomy = new AutonomyOrchestratorService();
const bootstrap = new ClientDeliverableBootstrapService();
const factory = new ProductFactoryService();

export const verticalPackFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['vertical-package'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const doc = await docs.generateVerticalPackBrief({
      clientName: ctx.clientName,
      industryCategory: ctx.industryCategory,
    });
    const pdf = await persistDeliverablePdf({
      ctx,
      doc,
      artifactType: 'vertical_pack',
      filename: 'vertical-solution-pack.pdf',
    });
    const md = await persistMarkdownBundle({ ctx, doc, artifactType: 'vertical_pack_md' });

    const pipeline = await factory.runAutomatedClientOrder({
      userId: ctx.userId,
      paymentId: ctx.paymentId,
      deliverableId: ctx.deliverableId,
      slug: `vertical-${ctx.paymentId.replace(/-/g, '').slice(0, 16)}`,
      name: doc.title,
      description: doc.sections.map((s) => `${s.heading}: ${s.body.slice(0, 100)}`).join('\n'),
      clientName: ctx.clientName,
      clientEmail: ctx.clientEmail ?? null,
      industryCategory: ctx.industryCategory ?? null,
      publishSite: false,
      skipWebsite: true,
      generationHints: ctx.generationHints,
    });

    const pack = bootstrap.resolvePack(ctx.industryCategory);
    const crm = await bootstrap.seedCrmPipeline({
      userId: ctx.userId,
      clientName: ctx.clientName,
      clientEmail: ctx.clientEmail,
      industryCategory: ctx.industryCategory,
      pack,
    });
    const modules = await bootstrap.activateModules({
      userId: ctx.userId,
      moduleSlugs: ['crm', 'automation', 'support-avatar', 'billing'],
      clientName: ctx.clientName,
      industryCategory: ctx.industryCategory,
    });

    const kickoffTicketId = await bootstrap.openKickoffSupportTicket({
      userId: ctx.userId,
      clientName: ctx.clientName,
      deliverableId: 'vertical-package',
      slaHours: 48,
      industryCategory: ctx.industryCategory,
    });

    const faqPack = bootstrap.saveSupportFaqSeed({
      userId: ctx.userId,
      paymentId: ctx.paymentId,
      clientName: ctx.clientName,
      industryCategory: ctx.industryCategory,
      pack,
    });

    const slaPack = bootstrap.saveSlaOnboardingPack({
      userId: ctx.userId,
      paymentId: ctx.paymentId,
      clientName: ctx.clientName,
      deliverableId: 'vertical-package',
      slaHours: 48,
      modulesActivated: modules,
      kickoffTicketId,
      industryCategory: ctx.industryCategory,
      extras: {
        crmImportedLeads: crm.importedLeads,
        verticalSlug: pack.verticalSlug,
        note: 'Vertical CRM/automation ops pack complete — LinkedIn/Google Ads remain NOT CONNECTED until APIs are wired (CONFIGURATION REQUIRED).',
      },
    });

    try {
      const verticalSlug =
        ctx.industryCategory?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') ?? 'general-business';
      await autonomy.runClosedLoopForVertical(ctx.userId, verticalSlug, { runDeploy: false });
    } catch (err) {
      logger.warn('Vertical pack autonomy loop skipped', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      projectId: pipeline.projectId as string,
      artifacts: [pdf, md, slaPack, faqPack],
      status: 'completed',
      metadata: {
        ...buildDocumentQualityMetadata(doc, ctx),
        crmBootstrap: crm,
        modulesActivated: modules,
        kickoffTicketId: kickoffTicketId ?? null,
        retainerWorkspace: true,
      },
    };
  },
};

export const growthFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['white-label-setup', 'sales-enablement'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const doc =
      ctx.deliverableId === 'white-label-setup'
        ? await docs.generateWhiteLabelPack({
            clientName: ctx.clientName,
            industryCategory: ctx.industryCategory,
          })
        : await docs.generateSalesEnablement({
            clientName: ctx.clientName,
            industryCategory: ctx.industryCategory,
          });

    const pdf = await persistDeliverablePdf({
      ctx,
      doc,
      artifactType: ctx.deliverableId,
      filename: `${ctx.deliverableId}.pdf`,
    });
    const md = await persistMarkdownBundle({ ctx, doc, artifactType: `${ctx.deliverableId}_md` });
    const docMeta = buildDocumentQualityMetadata(doc, ctx);

    let siteResult: FulfillmentResult | null = null;
    if (ctx.deliverableId === 'white-label-setup') {
      try {
        siteResult = await websiteFulfillmentHandler.fulfill({
          ...ctx,
          deliverableId: 'landing',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('White-label partner landing failed', {
          paymentId: ctx.paymentId,
          error: message,
        });
        siteResult = {
          artifacts: [],
          status: 'partial',
          metadata: { stepError: message, deliverableId: 'landing' },
        };
      }
    }

    // Brand pack alone is not enough — partner landing must be live.
    const landingOk =
      ctx.deliverableId !== 'white-label-setup' ||
      (siteResult?.status === 'completed' && Boolean(siteResult.publicUrl?.trim()));

    return {
      publicUrl: siteResult?.publicUrl ?? null,
      projectId: siteResult?.projectId,
      artifacts: [pdf, md, ...(siteResult?.artifacts ?? [])],
      status: landingOk ? 'completed' : 'partial',
      metadata: {
        ...(siteResult?.metadata ?? {}),
        ...docMeta,
        includesLanding: ctx.deliverableId === 'white-label-setup',
        salesPackReady: ctx.deliverableId === 'sales-enablement',
        ...(landingOk
          ? {}
          : {
              reason: 'white_label_landing_required',
              landingStatus: siteResult?.status ?? 'missing',
            }),
      },
    };
  },
};
