import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import {
  ClientDeliverableBootstrapService,
  type PortalEntitlementResult,
} from '../../service/client-deliverable-bootstrap.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import {
  buildDocumentQualityMetadata,
  buildMigrationCsv,
  buildTrainingOutlineMarkdown,
  persistDeliverablePdf,
  persistMarkdownBundle,
  persistMigrationTemplate,
  persistPortalModulesArtifact,
  persistProductionDeployManifest,
  persistTrainingOutlineMarkdown,
  persistTrainingOutlinePdf,
  buildProductionDeployRunbook,
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

function portalEntitlementsOk(
  entitlements: PortalEntitlementResult | null,
  tier: 'quick' | 'full' | 'custom' = 'quick',
): boolean {
  if (!entitlements) return false;
  const base =
    entitlements.entitlementSource === 'user_modules+org' &&
    entitlements.billingAccess === true &&
    entitlements.notificationSeeded === true &&
    entitlements.userModulesGranted.includes('notifications') &&
    entitlements.userModulesGranted.includes('billing') &&
    entitlements.portalReady === true;
  if (!base) return false;
  if (tier === 'quick') {
    // Thickness: CRM view access + actionable welcome tasks (never fake automation CONNECTED).
    return (
      entitlements.userModulesGranted.includes('crm') &&
      entitlements.onboardingTasksSeeded === true
    );
  }
  return true;
}

function migrationTrainingSubstantial(ctx: FulfillmentContext, artifacts: FulfillmentArtifact[]): boolean {
  const migration = artifacts.some(
    (a) => a.type === 'migration_template' || a.filename.includes('migration'),
  );
  const training = artifacts.some(
    (a) => a.type === 'training_outline' || a.filename.includes('training'),
  );
  if (!migration || !training) return false;
  const csv = buildMigrationCsv(ctx.clientName, { industryCategory: ctx.industryCategory });
  const md = buildTrainingOutlineMarkdown({
    clientName: ctx.clientName,
    industryCategory: ctx.industryCategory,
  });
  const csvRows = csv.split('\n').filter((l) => l.trim()).length;
  return csvRows >= 10 && csv.includes('DEMO_SAMPLE') && md.length >= 1200 && /NOT CONNECTED/i.test(md);
}

function deployRunbookHonest(deployPrep: Record<string, unknown> | null, ctx: FulfillmentContext): boolean {
  const runbook = buildProductionDeployRunbook({
    clientName: ctx.clientName,
    deliverableId: ctx.deliverableId,
    deployPrep,
  });
  if (runbook.kind !== 'client_executable_runbook') return false;
  if (!runbook.honesty.runbookExecutable) return false;
  if (runbook.honesty.sslProvisioned || runbook.honesty.domainConfigured) return false;
  if (runbook.domainSsl.claimedDone === true) return false;
  if (!Array.isArray(runbook.checklist) || runbook.checklist.length < 4) return false;
  const pendingOk = runbook.checklist.every(
    (c) => c.status === 'PENDING_CLIENT' || c.status === 'PENDING_OMNI' || c.status === 'BLOCKED',
  );
  return pendingOk;
}

function setupStatus(input: {
  tier: 'quick' | 'full' | 'custom';
  projectId?: string;
  artifacts: FulfillmentArtifact[];
  entitlements: PortalEntitlementResult | null;
  crmImported: number;
  crmLabeledDemo: boolean;
  deployPrep: Record<string, unknown> | null;
  ctx: FulfillmentContext;
}): 'completed' | 'partial' {
  if (!input.projectId?.trim() || !hasPdf(input.artifacts)) return 'partial';
  if (!portalEntitlementsOk(input.entitlements, input.tier)) return 'partial';

  if (input.tier === 'quick') {
    return 'completed';
  }

  if (input.crmImported <= 0 || !input.crmLabeledDemo) return 'partial';

  if (input.tier === 'full') {
    return migrationTrainingSubstantial(input.ctx, input.artifacts) ? 'completed' : 'partial';
  }

  // setup-custom: deploy prep may be skipped — completed only with honest client-executable runbook
  const hasManifest = input.artifacts.some(
    (a) => a.type === 'production_deploy_manifest' || a.filename.includes('production-deploy'),
  );
  if (!hasManifest) return 'partial';
  return deployRunbookHonest(input.deployPrep, input.ctx) ? 'completed' : 'partial';
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
    const artifacts: FulfillmentArtifact[] = [pdf.artifact, md];
    const docMeta = buildDocumentQualityMetadata(doc, ctx, {
      pdfBytes: pdf.pdfBytes,
      pdfPageCount: pdf.pdfPageCount,
    });

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

    let crmBootstrap: {
      importedLeads?: number;
      labeledDemo?: boolean;
      sampleKind?: string;
    } | null = null;
    let entitlements: PortalEntitlementResult | null = null;
    let deployPrep: Record<string, unknown> | null = null;
    let automationHonesty: Record<string, unknown> | null = null;

    if (tier === 'quick') {
      entitlements = await bootstrap.bootstrapQuickPortal({
        userId: ctx.userId,
        clientName: ctx.clientName,
        industryCategory: ctx.industryCategory,
      });
      artifacts.push(
        persistPortalModulesArtifact({
          ctx,
          modulesActivated: entitlements.modulesActivated,
          portalEntitlements: entitlements,
        }),
      );
    }

    if (tier === 'full' || tier === 'custom') {
      crmBootstrap = await bootstrap.seedCrmPipeline({
        userId: ctx.userId,
        clientName: ctx.clientName,
        clientEmail: ctx.clientEmail,
        industryCategory: ctx.industryCategory,
      });
      entitlements = await bootstrap.grantPortalEntitlements({
        userId: ctx.userId,
        moduleSlugs: ['crm', 'automation', 'notifications', 'billing'],
        clientName: ctx.clientName,
        industryCategory: ctx.industryCategory,
        seedWelcomeNotification: true,
      });
      automationHonesty = {
        automationModuleEnabled: entitlements.userModulesGranted.includes('automation'),
        automationConnected: false,
        status: 'MODULE_ENABLED_NOT_CONNECTED',
        note: 'Automation module entitled in portal — external automations remain NOT CONNECTED.',
      };
      artifacts.push(
        persistPortalModulesArtifact({
          ctx,
          modulesActivated: entitlements.modulesActivated,
          portalEntitlements: entitlements,
        }),
      );
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

    let deployHonesty: Record<string, unknown> | null = null;
    if (tier === 'custom') {
      deployPrep = await bootstrap.runProductionDeployPrep(ctx.clientName);
      const runbook = buildProductionDeployRunbook({
        clientName: ctx.clientName,
        deliverableId: ctx.deliverableId,
        deployPrep,
      });
      deployHonesty = { ...runbook.honesty, deployPrepStatus: runbook.deployPrepStatus };
      artifacts.push(persistProductionDeployManifest({ ctx, deployPrep }));
    }

    const modulesActivated = entitlements?.modulesActivated ?? [];
    const crmImported = Number(crmBootstrap?.importedLeads ?? 0);
    const crmLabeledDemo = crmBootstrap?.labeledDemo === true;
    const portalReady = entitlements?.portalReady === true;
    let status = setupStatus({
      tier,
      projectId,
      artifacts,
      entitlements,
      crmImported,
      crmLabeledDemo,
      deployPrep,
      ctx,
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
        portalEntitlements: entitlements,
        deployPrep,
        deployHonesty,
        automationHonesty,
        portalReady,
        ...(docMeta.documentSubstanceOk === false
          ? { reason: 'document_substance_below_threshold' }
          : !portalEntitlementsOk(entitlements, tier)
            ? { reason: 'portal_entitlements_incomplete' }
            : tier === 'custom' && deployPrep?.skipped === true
              ? { reason: 'deploy_prep_skipped_runbook_delivered', deployPrepSkipped: true }
              : {}),
      },
    };
  },
};
