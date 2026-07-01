import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ClientDeliverableBootstrapService } from '../../service/client-deliverable-bootstrap.service';
import { AutonomyOrchestratorService } from '../../../autonomy-loop/service/autonomy-orchestrator.service';
import { persistDeliverablePdf, persistMarkdownBundle } from './artifact-helpers';
import { websiteFulfillmentHandler } from './website.handler';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';
import logger from '../../../../utils/logger';

const docs = new DeliverableDocumentGeneratorService();
const autonomy = new AutonomyOrchestratorService();
const bootstrap = new ClientDeliverableBootstrapService();

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
      artifacts: [pdf, md],
      status: 'completed',
      metadata: {
        documentTitle: doc.title,
        crmBootstrap: crm,
        modulesActivated: modules,
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

    let siteResult: FulfillmentResult | null = null;
    if (ctx.deliverableId === 'white-label-setup') {
      siteResult = await websiteFulfillmentHandler.fulfill({
        ...ctx,
        deliverableId: 'landing',
      });
    }

    return {
      publicUrl: siteResult?.publicUrl ?? null,
      projectId: siteResult?.projectId,
      artifacts: [pdf, md, ...(siteResult?.artifacts ?? [])],
      status: 'completed',
      metadata: {
        includesLanding: ctx.deliverableId === 'white-label-setup',
        salesPackReady: ctx.deliverableId === 'sales-enablement',
      },
    };
  },
};
