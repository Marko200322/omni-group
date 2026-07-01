import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ClientDeliverableBootstrapService } from '../../service/client-deliverable-bootstrap.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import { persistDeliverablePdf, persistMarkdownBundle } from './artifact-helpers';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';

const docs = new DeliverableDocumentGeneratorService();
const factory = new ProductFactoryService();
const bootstrap = new ClientDeliverableBootstrapService();

const TIER: Record<string, 'quick' | 'full' | 'custom'> = {
  'setup-quick': 'quick',
  'setup-full': 'full',
  'setup-custom': 'custom',
};

export const setupFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['setup-quick', 'setup-full', 'setup-custom'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const tier = TIER[ctx.deliverableId] ?? 'quick';
    const doc = await docs.generateSetupPack({
      tier,
      clientName: ctx.clientName,
      generationHints: ctx.generationHints,
    });
    const pdf = await persistDeliverablePdf({
      ctx,
      doc,
      artifactType: 'setup_pack',
      filename: `setup-${tier}.pdf`,
    });
    const md = await persistMarkdownBundle({ ctx, doc, artifactType: 'setup_pack_md' });
    const artifacts = [pdf, md];

    const brief = doc.sections.map((s) => `${s.heading}: ${s.body.slice(0, 120)}`).join('\n');
    const pipeline = await factory.runAutomatedClientOrder({
      userId: ctx.userId,
      paymentId: ctx.paymentId,
      deliverableId: ctx.deliverableId,
      slug: `setup-${ctx.paymentId.slice(0, 8)}`,
      name: doc.title,
      description: brief,
      clientName: ctx.clientName,
      clientEmail: ctx.clientEmail ?? null,
      industryCategory: ctx.industryCategory ?? null,
      publishSite: false,
      skipWebsite: true,
      generationHints: ctx.generationHints,
    });

    let crmBootstrap = null;
    let modulesActivated: string[] = [];
    let deployPrep: Record<string, unknown> | null = null;

    if (tier === 'quick') {
      modulesActivated = await bootstrap.bootstrapQuickPortal({
        userId: ctx.userId,
        clientName: ctx.clientName,
        industryCategory: ctx.industryCategory,
      });
    }

    if (tier === 'full' || tier === 'custom') {
      crmBootstrap = await bootstrap.seedCrmPipeline({
        userId: ctx.userId,
        clientName: ctx.clientName,
        clientEmail: ctx.clientEmail,
        industryCategory: ctx.industryCategory,
      });
      modulesActivated = await bootstrap.activateModules({
        userId: ctx.userId,
        moduleSlugs: ['crm', 'automation', 'notifications', 'billing'],
        clientName: ctx.clientName,
        industryCategory: ctx.industryCategory,
      });
    }

    if (tier === 'full') {
      artifacts.push(
        bootstrap.saveMigrationTemplate({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          clientName: ctx.clientName,
        }),
        bootstrap.saveTrainingOutline({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          clientName: ctx.clientName,
          industryCategory: ctx.industryCategory,
        }),
      );
      await bootstrap.scheduleSupportWindow({
        userId: ctx.userId,
        clientName: ctx.clientName,
        days: 30,
      });
    }

    if (tier === 'custom') {
      deployPrep = await bootstrap.runProductionDeployPrep(ctx.clientName);
      artifacts.push(
        bootstrap.saveProductionDeployManifest({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          clientName: ctx.clientName,
          deployPrep,
        }),
      );
    }

    return {
      projectId: pipeline.projectId as string,
      artifacts,
      status: 'completed',
      metadata: {
        setupTier: tier,
        crmBootstrap,
        modulesActivated,
        deployPrep,
        portalReady: tier === 'quick' || tier === 'full' || tier === 'custom',
      },
    };
  },
};
