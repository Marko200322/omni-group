import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ClientDeliverableBootstrapService } from '../../service/client-deliverable-bootstrap.service';
import { AutonomyOrchestratorService } from '../../../autonomy-loop/service/autonomy-orchestrator.service';
import { getDeliverable } from '../deliverable-catalog';
import { persistDeliverablePdf, persistMarkdownBundle } from './artifact-helpers';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';
import logger from '../../../../utils/logger';

const docs = new DeliverableDocumentGeneratorService();
const autonomy = new AutonomyOrchestratorService();
const bootstrap = new ClientDeliverableBootstrapService();

export const retainerFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['support-priority', 'support-dedicated', 'lead-gen-retainer', 'ai-support-retainer'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const deliverable = getDeliverable(ctx.deliverableId)!;
    const doc = await docs.generateRetainerWelcome({
      deliverableId: ctx.deliverableId,
      clientName: ctx.clientName,
      industryCategory: ctx.industryCategory,
    });
    const pdf = await persistDeliverablePdf({
      ctx,
      doc,
      artifactType: 'retainer_welcome',
      filename: `${ctx.deliverableId}-welcome.pdf`,
    });
    const md = await persistMarkdownBundle({ ctx, doc, artifactType: 'retainer_welcome_md' });

    const modules = deliverable.modules ?? [];
    const artifacts = [pdf, md];
    let leadGenStats = null;
    let crmBootstrap = null;
    let modulesActivated: string[] = [];
    let supportAutomation: { modulesActivated: string[]; slaHours: number } | null = null;

    if (
      ctx.deliverableId === 'support-priority' ||
      ctx.deliverableId === 'support-dedicated'
    ) {
      supportAutomation = await bootstrap.bootstrapAutomatedSupport({
        userId: ctx.userId,
        clientName: ctx.clientName,
        deliverableId: ctx.deliverableId,
        industryCategory: ctx.industryCategory,
      });
      modulesActivated = supportAutomation.modulesActivated;
    }

    if (ctx.deliverableId === 'lead-gen-retainer') {
      const pack = bootstrap.resolvePack(ctx.industryCategory);
      leadGenStats = await bootstrap.runLeadGenKickoff({
        userId: ctx.userId,
        industryCategory: ctx.industryCategory,
        pack,
      });
      crmBootstrap = await bootstrap.seedCrmPipeline({
        userId: ctx.userId,
        clientName: ctx.clientName,
        clientEmail: ctx.clientEmail,
        industryCategory: ctx.industryCategory,
        pack,
      });
      artifacts.push(
        bootstrap.saveLeadGenReport({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          pack,
          stats: leadGenStats,
          clientName: ctx.clientName,
        }),
      );
      modulesActivated = await bootstrap.activateModules({
        userId: ctx.userId,
        moduleSlugs: modules,
        clientName: ctx.clientName,
        industryCategory: ctx.industryCategory,
      });
    }

    let aiSupportSetup: {
      modulesActivated: string[];
      ragSeeded: boolean;
      avatarProvider?: string;
      avatarConfigured?: boolean;
    } | null = null;

    if (ctx.deliverableId === 'ai-support-retainer') {
      const aiSetup = await bootstrap.bootstrapAiSupportRetainer({
        userId: ctx.userId,
        clientName: ctx.clientName,
        paymentId: ctx.paymentId,
        industryCategory: ctx.industryCategory,
        moduleSlugs: modules,
      });
      modulesActivated = aiSetup.modulesActivated;
      aiSupportSetup = {
        modulesActivated: aiSetup.modulesActivated,
        ragSeeded: aiSetup.ragSeeded,
        avatarProvider: aiSetup.avatarProvision?.provider,
        avatarConfigured: aiSetup.avatarProvision?.configured,
      };
      artifacts.push(aiSetup.setupArtifact);
    }

    if (
      modules.includes('outreach') ||
      modules.includes('client-hunter') ||
      ctx.deliverableId === 'lead-gen-retainer'
    ) {
      try {
        const verticalSlug =
          ctx.industryCategory?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') ?? 'general-business';
        await autonomy.runClosedLoopForVertical(ctx.userId, verticalSlug, { runDeploy: false });
      } catch (err) {
        logger.warn('Retainer autonomy bootstrap skipped', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      artifacts,
      status: 'completed',
      metadata: {
        modulesActivated,
        crmBootstrap,
        billing: deliverable.billing,
        industryCategory: ctx.industryCategory ?? null,
        leadGenStats,
        lastMonthlyLeadGenAt:
          ctx.deliverableId === 'lead-gen-retainer' ? new Date().toISOString() : undefined,
        supportAutomation,
        aiSupportSetup: aiSupportSetup ?? undefined,
      },
    };
  },
};
