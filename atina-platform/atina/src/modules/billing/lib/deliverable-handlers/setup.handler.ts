import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ClientDeliverableBootstrapService } from '../../service/client-deliverable-bootstrap.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import {
  buildDocumentQualityMetadata,
  persistDeliverablePdf,
  persistMarkdownBundle,
  persistMigrationTemplate,
  persistPortalModulesArtifact,
  persistProductionDeployManifest,
  persistTrainingOutlineMarkdown,
  persistTrainingOutlinePdf,
} from './artifact-helpers';
import type { DeliverableFulfillmentHandler, FulfillmentArtifact, FulfillmentContext, FulfillmentResult } from './types';

const docs = new DeliverableDocumentGeneratorService();
const factory = new ProductFactoryService();
const bootstrap = new ClientDeliverableBootstrapService();

const TIER: Record<string, 'quick' | 'full' | 'custom'> = {
  'setup-quick': 'quick',
  'setup-full': 'full',
  'setup-custom': 'custom',
};

function hasPdf(artifacts: FulfillmentArtifact[]): boolean {
  return artifacts.some((a) => a.filename.toLowerCase().endsWith('.pdf'));
}

function setupStatus(input: {
  tier: 'quick' | 'full' | 'custom';
  projectId?: string;
  artifacts: FulfillmentArtifact[];
  modulesActivated: string[];
  crmImported: number;
}): 'completed' | 'partial' {
  if (!input.projectId?.trim() || !hasPdf(input.artifacts)) return 'partial';
  if (input.tier === 'quick') {
    return input.modulesActivated.length > 0 ? 'completed' : 'partial';
  }
  if (input.crmImported <= 0 || input.modulesActivated.length === 0) return 'partial';
  if (input.tier === 'full') {
    const migration = input.artifacts.some(
      (a) => a.type === 'migration_template' || a.filename.includes('migration'),
    );
    const training = input.artifacts.some(
      (a) => a.type === 'training_outline' || a.filename.includes('training'),
    );
    return migration && training ? 'completed' : 'partial';
  }
  const manifest = input.artifacts.some(
    (a) => a.type === 'production_deploy_manifest' || a.filename.includes('production-deploy'),
  );
  return manifest ? 'completed' : 'partial';
}

export const setupFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['setup-quick', 'setup-full', 'setup-custom'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const tier = TIER[ctx.deliverableId] ?? 'quick';
    const doc = await docs.generateSetupPack({
      tier,
      clientName: ctx.clientName,
      industryCategory: ctx.industryCategory,
      generationHints: ctx.generationHints,
    });
    const pdf = await persistDeliverablePdf({
      ctx,
      doc,
      artifactType: 'setup_pack',
      filename: `setup-${tier}.pdf`,
    });
    const md = await persistMarkdownBundle({ ctx, doc, artifactType: 'setup_pack_md' });
    const artifacts: FulfillmentArtifact[] = [pdf, md];
    const docMeta = buildDocumentQualityMetadata(doc, ctx);

    const brief = doc.sections.map((s) => `${s.heading}: ${s.body.slice(0, 120)}`).join('\n');
    const pipeline = await factory.runAutomatedClientOrder({
      userId: ctx.userId,
      paymentId: ctx.paymentId,
      deliverableId: ctx.deliverableId,
      slug: `setup-${ctx.paymentId.replace(/-/g, '').slice(0, 16)}`,
      name: doc.title,
      description: brief,
      clientName: ctx.clientName,
      clientEmail: ctx.clientEmail ?? null,
      industryCategory: ctx.industryCategory ?? null,
      publishSite: false,
      skipWebsite: true,
      generationHints: ctx.generationHints,
    });
    const projectId = typeof pipeline.projectId === 'string' ? pipeline.projectId : undefined;

    let crmBootstrap: { importedLeads?: number } | null = null;
    let modulesActivated: string[] = [];
    let deployPrep: Record<string, unknown> | null = null;

    if (tier === 'quick') {
      modulesActivated = await bootstrap.bootstrapQuickPortal({
        userId: ctx.userId,
        clientName: ctx.clientName,
        industryCategory: ctx.industryCategory,
      });
      artifacts.push(persistPortalModulesArtifact({ ctx, modulesActivated }));
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
        persistMigrationTemplate({ ctx }),
        persistTrainingOutlineMarkdown({ ctx }),
        await persistTrainingOutlinePdf({ ctx }),
      );
      await bootstrap.scheduleSupportWindow({
        userId: ctx.userId,
        clientName: ctx.clientName,
        days: 30,
      });
    }

    if (tier === 'custom') {
      deployPrep = await bootstrap.runProductionDeployPrep(ctx.clientName);
      artifacts.push(persistProductionDeployManifest({ ctx, deployPrep }));
    }

    const crmImported = Number(crmBootstrap?.importedLeads ?? 0);
    const portalReady = modulesActivated.length > 0;
    let status = setupStatus({
      tier,
      projectId,
      artifacts,
      modulesActivated,
      crmImported,
    });
    if (docMeta.documentSubstanceOk === false) {
      status = 'partial';
    }

    return {
      projectId,
      artifacts,
      status,
      metadata: {
        ...docMeta,
        setupTier: tier,
        crmBootstrap,
        modulesActivated,
        deployPrep,
        portalReady,
        ...(docMeta.documentSubstanceOk === false
          ? { reason: 'document_substance_below_threshold' }
          : {}),
      },
    };
  },
};
