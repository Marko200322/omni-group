import { DeliverableDocumentGeneratorService } from '../../service/deliverable-document-generator.service';
import { ClientDeliverableBootstrapService } from '../../service/client-deliverable-bootstrap.service';
import { AutonomyOrchestratorService } from '../../../autonomy-loop/service/autonomy-orchestrator.service';
import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import { getDeliverable } from '../deliverable-catalog';
import { persistDeliverablePdf, persistMarkdownBundle } from './artifact-helpers';
import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';
import logger from '../../../../utils/logger';

const docs = new DeliverableDocumentGeneratorService();
const autonomy = new AutonomyOrchestratorService();
const bootstrap = new ClientDeliverableBootstrapService();
const factory = new ProductFactoryService();

async function createRetainerProject(ctx: FulfillmentContext, title: string, description: string) {
  const pipeline = await factory.runAutomatedClientOrder({
    userId: ctx.userId,
    paymentId: ctx.paymentId,
    deliverableId: ctx.deliverableId,
    slug: `retainer-${ctx.paymentId.slice(0, 8)}`,
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

    const projectId = await createRetainerProject(
      ctx,
      doc.title,
      doc.sections.map((s) => `${s.heading}: ${s.body.slice(0, 100)}`).join('\n'),
    );

    const modules = deliverable.modules ?? [];
    const artifacts = [pdf, md];
    let leadGenStats = null as Awaited<ReturnType<typeof bootstrap.runLeadGenKickoff>> | null;
    let crmBootstrap = null as Awaited<ReturnType<typeof bootstrap.seedCrmPipeline>> | null;
    let modulesActivated: string[] = [];
    let supportAutomation: {
      modulesActivated: string[];
      slaHours: number;
      kickoffTicketId?: string;
      ticketCategories?: string[];
    } | null = null;
    let kickoffTicketId: string | undefined;

    if (ctx.deliverableId === 'support-priority' || ctx.deliverableId === 'support-dedicated') {
      supportAutomation = await bootstrap.bootstrapAutomatedSupport({
        userId: ctx.userId,
        clientName: ctx.clientName,
        deliverableId: ctx.deliverableId,
        industryCategory: ctx.industryCategory,
        paymentId: ctx.paymentId,
      });
      modulesActivated = supportAutomation.modulesActivated;
      kickoffTicketId = supportAutomation.kickoffTicketId;
      artifacts.push(
        bootstrap.saveSlaOnboardingPack({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          clientName: ctx.clientName,
          deliverableId: ctx.deliverableId,
          slaHours: supportAutomation.slaHours,
          modulesActivated,
          ticketCategories: supportAutomation.ticketCategories,
          kickoffTicketId,
          industryCategory: ctx.industryCategory,
        }),
        bootstrap.saveSupportFaqSeed({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          clientName: ctx.clientName,
          industryCategory: ctx.industryCategory,
        }),
      );
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
      leadGenStats = {
        ...leadGenStats,
        sampleLeadsSeeded: crmBootstrap.importedLeads,
      };
      kickoffTicketId = await bootstrap.openKickoffSupportTicket({
        userId: ctx.userId,
        clientName: ctx.clientName,
        deliverableId: ctx.deliverableId,
        slaHours: 48,
        industryCategory: ctx.industryCategory,
      });
      artifacts.push(
        bootstrap.saveLeadGenReport({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          pack,
          stats: leadGenStats,
          clientName: ctx.clientName,
          sampleLeadsSeeded: crmBootstrap.importedLeads,
        }),
        bootstrap.saveSlaOnboardingPack({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          clientName: ctx.clientName,
          deliverableId: ctx.deliverableId,
          slaHours: 48,
          modulesActivated: modules,
          kickoffTicketId,
          industryCategory: ctx.industryCategory,
          channelStatuses: leadGenStats.channelStatuses,
          extras: {
            mode: leadGenStats.mode,
            workspaceId: leadGenStats.workspaceId ?? null,
            liveLeadsGenerated: leadGenStats.leadsGenerated,
            sampleLeadsSeeded: crmBootstrap.importedLeads,
          },
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
      artifacts.push(
        aiSetup.setupArtifact,
        bootstrap.saveSlaOnboardingPack({
          userId: ctx.userId,
          paymentId: ctx.paymentId,
          clientName: ctx.clientName,
          deliverableId: ctx.deliverableId,
          slaHours: 24,
          modulesActivated,
          industryCategory: ctx.industryCategory,
          extras: {
            ragSeeded: aiSetup.ragSeeded,
            avatarConfigured: aiSetup.avatarProvision?.configured ?? false,
            avatarProvider: aiSetup.avatarProvision?.provider ?? null,
          },
        }),
      );
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
      projectId,
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
        kickoffTicketId: kickoffTicketId ?? supportAutomation?.kickoffTicketId ?? null,
        retainerWorkspace: true,
      },
    };
  },
};
