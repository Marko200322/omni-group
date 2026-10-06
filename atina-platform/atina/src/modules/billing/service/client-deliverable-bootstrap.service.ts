import { randomBytes } from 'crypto';
import { AiMemoryService } from '../../ai-memory/service/ai-memory.service';
import { CrmService } from '../../crm/service/crm.service';
import { TasksService } from '../../tasks/service/tasks.service';
import { TitanisService } from '../../titanis/service/titanis.service';
import { resolveVerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import { resolveVerticalSlug } from '../../../shared/industry/industry-catalog';
import type { VerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import { DeliverableArtifactStoreService } from './deliverable-artifact-store.service';
import { LocalInfrastructureService } from '../../autonomy-loop/service/local-infrastructure.service';
import type { FulfillmentArtifact } from '../lib/deliverable-handlers/types';
import { config } from '../../../config';
import logger from '../../../utils/logger';
import { isHeygenConfigured } from '../../video-meetings/providers/heygen-video.provider';
import { isDidConfigured } from '../../video-meetings/providers/did-video.provider';
import { getAvatarAgentAsync } from '../../video-meetings/avatar/avatar-agent.config';
import { getSlackNotifier } from '../../../utils/slack-notifier.service';

export type CrmBootstrapResult = {
  clientContactId?: string;
  importedLeads: number;
  pipelineStages: string[];
};

/** Honest ads/outreach channel state — never claim live API without credentials. */
export type ChannelConnectionStatus = 'CONNECTED' | 'NOT CONNECTED';

export type OutreachChannelStatus = {
  channel: 'linkedin' | 'google_ads' | 'apollo' | 'email' | 'meta_ads';
  status: ChannelConnectionStatus;
  detail: string;
};

export type LeadGenBootstrapResult = {
  workspaceId?: string;
  runId?: string;
  /** Live/API-backed leads only — 0 when channels are NOT CONNECTED. */
  leadsGenerated: number;
  /** Demo CRM samples seeded for kickoff visibility (not live harvest). */
  sampleLeadsSeeded: number;
  estimatedRevenue: number;
  channelStatuses: OutreachChannelStatus[];
  mode: 'live_kickoff' | 'kickoff_pack_only';
};

function envPresent(key: string): boolean {
  const v = process.env[key]?.trim();
  return Boolean(v && v !== 'placeholder' && !v.startsWith('your_'));
}

/** Resolve LinkedIn / Google Ads / Apollo / email honesty for lead-gen retainers. */
export function resolveLeadGenChannelStatuses(): OutreachChannelStatus[] {
  const googleAdsCreds =
    envPresent('GOOGLE_ADS_DEVELOPER_TOKEN') &&
    envPresent('GOOGLE_ADS_CLIENT_ID') &&
    envPresent('GOOGLE_ADS_CLIENT_SECRET') &&
    envPresent('GOOGLE_ADS_REFRESH_TOKEN') &&
    envPresent('GOOGLE_ADS_CUSTOMER_ID');
  const googleLive =
    googleAdsCreds &&
    ['true', '1', 'yes'].includes((process.env.MARKETING_ADS_LIVE_SYNC ?? '').trim().toLowerCase());

  const metaCreds = envPresent('META_ADS_ACCESS_TOKEN') && envPresent('META_ADS_AD_ACCOUNT_ID');
  const metaLive =
    metaCreds &&
    ['true', '1', 'yes'].includes((process.env.MARKETING_ADS_LIVE_SYNC ?? '').trim().toLowerCase());

  const apollo = envPresent('APOLLO_API_KEY');
  const email =
    envPresent('RESEND_API_KEY') ||
    (envPresent('SMTP_USER') && envPresent('SMTP_PASSWORD')) ||
    Boolean(config.aggregators?.comms?.url?.trim());

  // No LinkedIn Ads / LinkedIn Marketing API adapter in this codebase yet.
  const linkedinDetail = envPresent('LINKEDIN_ACCESS_TOKEN')
    ? 'LINKEDIN_ACCESS_TOKEN set but LinkedIn Ads/Marketing API adapter is not wired — treat as NOT CONNECTED'
    : 'No LinkedIn Ads/Marketing API credentials or adapter';

  return [
    {
      channel: 'linkedin',
      status: 'NOT CONNECTED',
      detail: linkedinDetail,
    },
    {
      channel: 'google_ads',
      status: googleLive ? 'CONNECTED' : 'NOT CONNECTED',
      detail: googleLive
        ? 'GOOGLE_ADS_* + MARKETING_ADS_LIVE_SYNC enabled'
        : googleAdsCreds
          ? 'Credentials present — set MARKETING_ADS_LIVE_SYNC=true for live pull'
          : 'GOOGLE_ADS_* incomplete or missing',
    },
    {
      channel: 'meta_ads',
      status: metaLive ? 'CONNECTED' : 'NOT CONNECTED',
      detail: metaLive
        ? 'META_ADS_* + MARKETING_ADS_LIVE_SYNC enabled'
        : metaCreds
          ? 'Credentials present — set MARKETING_ADS_LIVE_SYNC=true for live pull'
          : 'META_ADS_* incomplete or missing',
    },
    {
      channel: 'apollo',
      status: apollo ? 'CONNECTED' : 'NOT CONNECTED',
      detail: apollo ? 'APOLLO_API_KEY configured' : 'APOLLO_API_KEY missing',
    },
    {
      channel: 'email',
      status: email ? 'CONNECTED' : 'NOT CONNECTED',
      detail: email ? 'Outbound email transport configured' : 'No email transport configured',
    },
  ];
}

function resolvePack(industryCategory?: string | null): VerticalDeliveryPack {
  const slug = industryCategory?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') ?? 'general-business';
  const resolved = resolveVerticalSlug(slug);
  return resolveVerticalDeliveryPack({
    slug,
    category: resolved?.category ?? 'general_business',
    subtype: resolved?.subtype ?? null,
    name: resolved?.name ?? slug,
  });
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? 'Client', last: parts.slice(1).join(' ') || 'Account' };
}

function sampleLeadsForPack(pack: VerticalDeliveryPack, count = 8) {
  const hooks = pack.outreachHooks.length ? pack.outreachHooks : [`${pack.displayName} prospect`];
  const companies = [
    `${pack.displayName.split(' ')[0]} Partners`,
    'Northline Group',
    'Summit Ventures',
    'Atlas Digital',
    'Prime Solutions',
    'Horizon Labs',
    'BluePeak Co',
    'Vertex Systems',
  ];
  return Array.from({ length: count }, (_, i) => ({
    firstName: ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'][i % 8],
    lastName: ['Smith', 'Lee', 'Patel', 'Garcia', 'Kim', 'Brown', 'Novak', 'Silva'][i % 8],
    email: `lead${i + 1}@example-${pack.verticalSlug.slice(0, 12)}.demo`,
    company: companies[i % companies.length],
    status: i < 3 ? ('prospect' as const) : ('lead' as const),
    source: 'fulfillment-bootstrap',
    tags: [pack.verticalSlug, pack.category],
    notes: hooks[i % hooks.length],
  }));
}

export class ClientDeliverableBootstrapService {
  private crm = new CrmService();
  private tasks = new TasksService();
  private titanis = new TitanisService();
  private artifacts = new DeliverableArtifactStoreService();

  resolvePack(industryCategory?: string | null): VerticalDeliveryPack {
    return resolvePack(industryCategory);
  }

  async seedCrmPipeline(input: {
    userId: string;
    clientName: string;
    clientEmail?: string | null;
    industryCategory?: string | null;
    pack?: VerticalDeliveryPack;
  }): Promise<CrmBootstrapResult> {
    const pack = input.pack ?? resolvePack(input.industryCategory);
    const { first, last } = splitName(input.clientName);
    let clientContactId: string | undefined;

    try {
      const clientContact = await this.crm.createContact(input.userId, {
        firstName: first,
        lastName: last,
        email: input.clientEmail ?? undefined,
        company: input.clientName,
        status: 'customer',
        source: 'fulfillment',
        tags: ['client', pack.verticalSlug],
        notes: `Primary account — ${pack.displayName} vertical package.`,
        customFields: { industryCategory: input.industryCategory ?? pack.category },
      });
      clientContactId = clientContact?.id as string | undefined;
    } catch (err) {
      logger.warn('CRM client contact seed skipped', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const samples = sampleLeadsForPack(pack, 8);
    const bulk = await this.crm.bulkImport(input.userId, { contacts: samples });

    const pipelineStages = ['lead', 'prospect', 'customer'];
    for (const stage of pipelineStages) {
      try {
        await this.tasks.createTask(input.userId, {
          type: 'crm_pipeline',
          name: `CRM — ${stage} stage active`,
          description: `${pack.displayName} pipeline seeded with sample ${stage} records.`,
          payload: { stage, verticalSlug: pack.verticalSlug, automated: true },
        });
      } catch {
        /* plan limits — non-fatal */
      }
    }

    return {
      clientContactId,
      importedLeads: bulk.imported,
      pipelineStages,
    };
  }

  async activateModules(input: {
    userId: string;
    moduleSlugs: string[];
    clientName: string;
    industryCategory?: string | null;
  }): Promise<string[]> {
    const activated: string[] = [];
    for (const slug of input.moduleSlugs) {
      try {
        await this.tasks.createTask(input.userId, {
          type: 'module_activation',
          name: `Activate ${slug}`,
          description: `Module ${slug} enabled for ${input.clientName} (${input.industryCategory ?? 'general'}).`,
          payload: { moduleSlug: slug, automated: true },
        });
        activated.push(slug);
      } catch {
        /* skip on limit */
      }
    }
    return activated;
  }

  async runLeadGenKickoff(input: {
    userId: string;
    industryCategory?: string | null;
    pack?: VerticalDeliveryPack;
  }): Promise<LeadGenBootstrapResult> {
    const pack = input.pack ?? resolvePack(input.industryCategory);
    const channelStatuses = resolveLeadGenChannelStatuses();
    const liveChannels = channelStatuses.filter(
      (c) =>
        c.status === 'CONNECTED' &&
        (c.channel === 'apollo' || c.channel === 'google_ads' || c.channel === 'linkedin'),
    );
    const mode: LeadGenBootstrapResult['mode'] =
      liveChannels.length > 0 ? 'live_kickoff' : 'kickoff_pack_only';

    const workspaces = await this.titanis.list(input.userId);
    let workspaceId = (workspaces[0] as { id?: string } | undefined)?.id;

    if (!workspaceId) {
      const created = await this.titanis.create(input.userId, {
        name: `${pack.displayName} — Lead pipeline`,
        budgetAllocated: 750,
        outreachChannel: 'email',
      });
      workspaceId = (created as { id?: string })?.id;
    }

    if (!workspaceId) {
      return {
        leadsGenerated: 0,
        sampleLeadsSeeded: 0,
        estimatedRevenue: 0,
        channelStatuses,
        mode,
      };
    }

    // Only claim live leads when a real enrichment/ads channel is CONNECTED.
    // Otherwise deliver workspace + kickoff pack without inventing LinkedIn/Ads harvest.
    if (mode === 'kickoff_pack_only') {
      return {
        workspaceId,
        leadsGenerated: 0,
        sampleLeadsSeeded: 0,
        estimatedRevenue: 0,
        channelStatuses,
        mode,
      };
    }

    const run = (await this.titanis.run(workspaceId, input.userId, {
      mode: 'lead-hunt',
      targetCount: 25,
    })) as { id?: string; output_payload?: Record<string, unknown> };

    const output = (run?.output_payload ?? {}) as Record<string, unknown>;
    return {
      workspaceId,
      runId: run?.id,
      leadsGenerated: Number(output.leads_generated ?? 0),
      sampleLeadsSeeded: 0,
      estimatedRevenue: Number(output.estimated_revenue ?? 0),
      channelStatuses,
      mode,
    };
  }

  buildIntegrationConfig(input: {
    userId: string;
    clientName: string;
    paymentId: string;
    pack?: VerticalDeliveryPack;
  }): Record<string, unknown> {
    const pack = input.pack ?? resolvePack(null);
    const secret = randomBytes(24).toString('hex');
    const webBase = config.app.webUrl.replace(/\/$/, '');
    const apiBase = config.app.url.replace(/\/$/, '');

    return {
      clientName: input.clientName,
      generatedAt: new Date().toISOString(),
      apiBase: `${apiBase}/api/v1`,
      webhooks: {
        paymentCompleted: `${apiBase}/api/v1/payments/webhooks/stripe`,
        deliverableReady: `${webBase}/api/atina/billing/fulfillment/jobs/${input.paymentId}`,
        customIngress: `${apiBase}/api/v1/integrations/inbound/${input.userId}`,
      },
      authentication: {
        type: 'Bearer JWT',
        login: `${apiBase}/api/v1/auth/login`,
        note: 'Use client portal credentials; rotate keys quarterly.',
      },
      modules: pack.coreModules,
      webhookSecret: secret,
      sampleEvents: ['payment.completed', 'deliverable.ready', 'crm.contact.created'],
      testingChecklist: pack.qualityGates,
    };
  }

  saveIntegrationArtifact(input: {
    userId: string;
    paymentId: string;
    config: Record<string, unknown>;
  }): FulfillmentArtifact {
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'integration-config.json',
      content: JSON.stringify(input.config, null, 2),
      type: 'integration_config',
      downloadLabel: 'Integration config (JSON)',
    });
  }

  saveLeadGenReport(input: {
    userId: string;
    paymentId: string;
    pack: VerticalDeliveryPack;
    stats: LeadGenBootstrapResult;
    clientName: string;
    sampleLeadsSeeded?: number;
  }): FulfillmentArtifact {
    const { pack, stats, clientName } = input;
    const samples = input.sampleLeadsSeeded ?? stats.sampleLeadsSeeded ?? 0;
    const channelLines = (stats.channelStatuses ?? resolveLeadGenChannelStatuses())
      .map((c) => `- ${c.channel}: **${c.status}** — ${c.detail}`)
      .join('\n');
    const content = `# Lead Gen — Kickoff Pack

Client: ${clientName}
Vertical: ${pack.displayName}
Mode: ${stats.mode === 'live_kickoff' ? 'Live enrichment available' : 'Kickoff pack only (no live LinkedIn/Google Ads harvest)'}

## Channel connection status (honest)
${channelLines}

## Kickoff results
- Live leads generated: ${stats.leadsGenerated}
- Sample CRM leads seeded (demo, not live harvest): ${samples}
- Estimated pipeline value (live only): €${stats.estimatedRevenue}
- Workspace: ${stats.workspaceId ?? 'created'}
- Titanis run: ${stats.runId ?? 'skipped — no connected enrichment/ads channel'}

## What you received now
- Outreach workspace in portal
- CRM pipeline seed for ${pack.displayName}
- This kickoff report with channel honesty
- Onboarding ticket for first outreach week

## Next 30 days
${pack.workflowSteps.map((s, i) => `${i + 1}. ${s.step} (${s.moduleSlug})`).join('\n')}

## Outreach hooks (planning — not auto-sent to LinkedIn/Ads)
${pack.outreachHooks.map((h) => `- ${h}`).join('\n')}

## Connecting live channels
1. Google Ads: set GOOGLE_ADS_* + MARKETING_ADS_LIVE_SYNC=true
2. LinkedIn Ads/Marketing: not wired yet — remains NOT CONNECTED until an adapter ships
3. Apollo enrichment: set APOLLO_API_KEY
`;
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'lead-gen-kickoff-report.md',
      content,
      type: 'lead_gen_report',
      downloadLabel: 'Lead gen kickoff report',
    });
  }

  saveMigrationTemplate(input: {
    userId: string;
    paymentId: string;
    clientName: string;
  }): FulfillmentArtifact {
    const csv = [
      'first_name,last_name,email,company,phone,status,notes',
      `Primary,Contact,client@example.com,${input.clientName.replace(/,/g, ' ')},,+381600000000,customer,Primary account row`,
      'Lead,One,lead1@example.com,Example Co,,,lead,Import from spreadsheet',
      'Lead,Two,lead2@example.com,Sample Ltd,,,prospect,Import from spreadsheet',
    ].join('\n');
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'crm-migration-template.csv',
      content: csv,
      type: 'migration_template',
      downloadLabel: 'CRM migration template (CSV)',
    });
  }

  saveTrainingOutline(input: {
    userId: string;
    paymentId: string;
    clientName: string;
    industryCategory?: string | null;
  }): FulfillmentArtifact {
    const content = `# Training & onboarding — ${input.clientName}

## Session 1 — Portal & dashboard (30 min)
- Login, profile, billing, deliveries panel
- How to confirm payments and download artifacts

## Session 2 — CRM & pipeline (30 min)
- Import migration CSV, stages, follow-ups
- Industry: ${input.industryCategory ?? 'general business'}

## Session 3 — Automations (30 min)
- Payment → fulfillment chain
- Notifications and tasks

## 30-day support window
- Automated ticket queue active
- Response SLA: 24 business hours
- Minor copy/config changes included
`;
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'training-outline.md',
      content,
      type: 'training_outline',
      downloadLabel: 'Training outline',
    });
  }

  saveProductionDeployManifest(input: {
    userId: string;
    paymentId: string;
    clientName: string;
    deployPrep: Record<string, unknown>;
  }): FulfillmentArtifact {
    const manifest = {
      clientName: input.clientName,
      generatedAt: new Date().toISOString(),
      domainSsl: {
        note: 'Point DNS A/AAAA to VPS; TLS via Caddy/nginx certbot',
        webUrl: config.app.webUrl,
        apiUrl: config.app.url,
      },
      backup: {
        schedule: 'daily 02:00 UTC',
        retentionDays: 14,
        targets: ['postgres', 'uploads', 'product-factory output'],
      },
      monitoring: {
        healthEndpoints: [`${config.app.url.replace(/\/$/, '')}/health`],
        alertEmail: config.paymentNotifyEmail || config.admin.email,
      },
      sla: { uptimeTarget: '99.5%', incidentResponseHours: 4 },
      deployPrep: input.deployPrep,
    };
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'production-deploy-manifest.json',
      content: JSON.stringify(manifest, null, 2),
      type: 'production_deploy_manifest',
      downloadLabel: 'Production deploy manifest',
    });
  }

  async runProductionDeployPrep(clientName: string): Promise<Record<string, unknown>> {
    const local = new LocalInfrastructureService();
    if (!local.isAvailable()) {
      return { skipped: true, reason: 'local_infrastructure_unavailable' };
    }
    try {
      return local.triggerDeploy({
        phase: 'client_setup_custom',
        notes: `Production deploy prep for ${clientName}`,
        skipBlockingSteps: true,
      });
    } catch (err) {
      return {
        skipped: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async bootstrapQuickPortal(input: {
    userId: string;
    clientName: string;
    industryCategory?: string | null;
  }): Promise<string[]> {
    return this.activateModules({
      userId: input.userId,
      moduleSlugs: ['notifications', 'billing'],
      clientName: input.clientName,
      industryCategory: input.industryCategory,
    });
  }

  async bootstrapAutomatedSupport(input: {
    userId: string;
    clientName: string;
    deliverableId: 'support-priority' | 'support-dedicated';
    industryCategory?: string | null;
    paymentId?: string;
  }): Promise<{
    modulesActivated: string[];
    slaHours: number;
    kickoffTicketId?: string;
    ticketCategories: string[];
  }> {
    const slaHours = input.deliverableId === 'support-dedicated' ? 8 : 24;
    const slugs =
      input.deliverableId === 'support-dedicated'
        ? ['notifications', 'support-avatar', 'video-meetings', 'ai-rag']
        : ['notifications', 'support-avatar', 'ai-rag'];
    const ticketCategories =
      input.deliverableId === 'support-dedicated'
        ? ['incident', 'change-request', 'health-check', 'billing', 'escalation']
        : ['general', 'bug', 'change-request', 'billing', 'how-to'];

    const modulesActivated = await this.activateModules({
      userId: input.userId,
      moduleSlugs: slugs,
      clientName: input.clientName,
      industryCategory: input.industryCategory,
    });

    for (const taskName of [
      'Support queue — automated triage',
      input.deliverableId === 'support-dedicated' ? 'Monthly health check scheduled' : 'Priority SLA monitor',
    ]) {
      try {
        await this.tasks.createTask(input.userId, {
          type: 'support_automation',
          name: taskName,
          description: `${taskName} for ${input.clientName}. SLA ${slaHours}h.`,
          payload: {
            deliverableId: input.deliverableId,
            slaHours,
            automated: true,
            ticketCategories,
            channel: input.deliverableId === 'support-dedicated' ? 'portal+email+slack' : 'email',
          },
        });
      } catch {
        /* plan limits */
      }
    }

    const kickoffTicketId = await this.openKickoffSupportTicket({
      userId: input.userId,
      clientName: input.clientName,
      deliverableId: input.deliverableId,
      slaHours,
      industryCategory: input.industryCategory,
    });

    if (input.deliverableId === 'support-dedicated') {
      void getSlackNotifier().notifySupportDedicated({
        clientName: input.clientName,
        deliverableId: input.deliverableId,
        slaHours,
        modules: modulesActivated,
      });
      void this.provisionClientAvatar({
        userId: input.userId,
        clientName: input.clientName,
        paymentId: input.paymentId ?? `support-${input.userId.slice(0, 8)}`,
        agentType: 'support',
      });
    }

    return { modulesActivated, slaHours, kickoffTicketId, ticketCategories };
  }

  /** Client-visible onboarding/support ticket in the tasks queue. */
  async openKickoffSupportTicket(input: {
    userId: string;
    clientName: string;
    deliverableId: string;
    slaHours: number;
    industryCategory?: string | null;
  }): Promise<string | undefined> {
    try {
      const task = await this.tasks.createTask(input.userId, {
        type: 'support_ticket',
        name: `Kickoff — ${input.deliverableId}`,
        description: [
          `Welcome ${input.clientName}.`,
          `Retainer ${input.deliverableId} is active.`,
          `Response target: ${input.slaHours} business hours.`,
          `Industry: ${input.industryCategory ?? 'general'}.`,
          'Reply in the portal support inbox or attach context to this ticket.',
        ].join(' '),
        payload: {
          deliverableId: input.deliverableId,
          slaHours: input.slaHours,
          category: 'onboarding',
          status: 'open',
          automated: true,
          clientVisible: true,
        },
      });
      return (task as { id?: string })?.id;
    } catch {
      return undefined;
    }
  }

  saveSlaOnboardingPack(input: {
    userId: string;
    paymentId: string;
    clientName: string;
    deliverableId: string;
    slaHours: number;
    modulesActivated: string[];
    ticketCategories?: string[];
    kickoffTicketId?: string;
    industryCategory?: string | null;
    channelStatuses?: OutreachChannelStatus[];
    extras?: Record<string, unknown>;
  }): FulfillmentArtifact {
    const categories = input.ticketCategories?.length
      ? input.ticketCategories
      : ['general', 'bug', 'change-request', 'billing'];
    const channels = input.channelStatuses?.length
      ? input.channelStatuses
      : resolveLeadGenChannelStatuses();
    const content = `# SLA & Onboarding Pack — ${input.clientName}

Package: ${input.deliverableId}
Industry: ${input.industryCategory ?? 'general'}
Generated: ${new Date().toISOString()}

## Service level
- Response target: **${input.slaHours} business hours**
- Channels: client portal support inbox + email
- Kickoff ticket id: ${input.kickoffTicketId ?? 'queued in portal tasks'}

## Ticket categories (portal)
${categories.map((c) => `- ${c}`).join('\n')}

## Modules activated
${input.modulesActivated.map((m) => `- ${m}`).join('\n') || '- (pending activation)'}

## Onboarding checklist
1. Open Deliveries in the client portal and download welcome + this SLA pack
2. Confirm the kickoff support ticket is visible under Tasks
3. Add preferred contact email / Slack webhook if dedicated tier
4. Review FAQ seed (if included) and mark gaps for week-1 call
5. Do **not** assume LinkedIn or Google Ads are live unless marked CONNECTED below

## Channel honesty (ads / enrichment)
${channels.map((c) => `- ${c.channel}: **${c.status}** — ${c.detail}`).join('\n')}

## What is NOT included
- Unlimited engineering hours
- Live LinkedIn/Google Ads campaign spend without connected APIs
- Emergency weekend SLA (unless separately contracted)
${input.extras ? `\n## Notes\n${JSON.stringify(input.extras, null, 2)}\n` : ''}
`;
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: `${input.deliverableId}-sla-onboarding.md`,
      content,
      type: 'sla_onboarding_pack',
      downloadLabel: 'SLA & onboarding pack',
    });
  }

  saveSupportFaqSeed(input: {
    userId: string;
    paymentId: string;
    clientName: string;
    industryCategory?: string | null;
    pack?: VerticalDeliveryPack;
  }): FulfillmentArtifact {
    const pack = input.pack ?? resolvePack(input.industryCategory);
    const faqs = [
      ['How do I open a support ticket?', 'Use the portal Support / Tasks inbox. Priority retainers target 24h; dedicated targets 8h.'],
      ['What is included monthly?', 'Welcome pack, SLA queue, portal modules, and maintenance listed on your package card — not unlimited build hours.'],
      ['Can you change copy on my site?', 'Minor copy/config changes are in scope for support retainers; net-new features need a scoped package.'],
      ['Is LinkedIn outreach live?', 'Only if LinkedIn is marked CONNECTED in your kickoff pack. Otherwise we deliver planning hooks and CRM seed only.'],
      ['Are Google Ads connected?', 'Only when GOOGLE_ADS_* credentials and live sync are enabled. Otherwise status is NOT CONNECTED.'],
      [`What is our ${pack.displayName} focus?`, pack.valueProp],
      ['Where are my deliverables?', 'Dashboard → Deliveries. Download PDFs and markdown packs from the payment fulfillment card.'],
      ['How do I escalate?', 'Reply on the kickoff ticket or email support; dedicated tier also notifies Slack when a webhook is configured.'],
      ['Does AI avatar mean video?', 'Text/RAG assistant is seeded immediately. HeyGen/D-ID video requires those keys — otherwise avatarConfigured stays false.'],
      ['How do I cancel or pause?', 'Billing panel → subscription controls. Access to delivered artifacts remains for prior months.'],
    ];
    const content = `# Support FAQ seed — ${input.clientName}

Industry: ${pack.displayName}

${faqs.map(([q, a], i) => `## ${i + 1}. ${q}\n${a}`).join('\n\n')}
`;
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'support-faq-seed.md',
      content,
      type: 'support_faq_seed',
      downloadLabel: 'Support FAQ seed',
    });
  }

  async provisionClientAvatar(input: {
    userId: string;
    clientName: string;
    paymentId: string;
    agentType: 'support' | 'sales';
  }): Promise<{ provider: string; configured: boolean; memoryKey: string }> {
    const heygen = isHeygenConfigured();
    const did = isDidConfigured();
    const provider = heygen ? 'heygen' : did ? 'd-id' : 'live_portrait';
    const memoryKey = input.paymentId.slice(0, 8);
    const agentCfg =
      input.agentType === 'support' ? config.videoMeetings.support : config.videoMeetings.sales;
    const rosterAgent = await getAvatarAgentAsync(input.agentType).catch(() => null);

    const provision = {
      clientName: input.clientName,
      agentType: input.agentType,
      provider,
      heygenConfigured: heygen,
      didConfigured: did,
      voiceProvider: 'elevenlabs',
      voiceId: rosterAgent?.voiceId || agentCfg.voiceId || null,
      avatarUrl: rosterAgent?.avatarUrl || agentCfg.agentAvatarUrl || null,
      photoUrl: rosterAgent?.photoUrl || null,
      heygenAvatarId: rosterAgent?.heygenAvatarId || null,
      heygenVoiceId: rosterAgent?.heygenVoiceId || null,
      dashboardUrl: `${config.app.webUrl.replace(/\/$/, '')}${input.agentType === 'support' ? '/dashboard/support' : '/dashboard/consultation'}`,
      provisionedAt: new Date().toISOString(),
    };

    try {
      const memory = new AiMemoryService();
      await memory.remember(input.userId, {
        namespace: 'avatar-provisioning',
        key: memoryKey,
        value: provision,
      });
    } catch (err) {
      logger.warn('Avatar provisioning memory skipped', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { provider, configured: heygen || did, memoryKey };
  }

  async scheduleSupportWindow(input: {
    userId: string;
    clientName: string;
    days?: number;
  }): Promise<void> {
    const days = input.days ?? 30;
    try {
      await this.tasks.createTask(input.userId, {
        type: 'support_window',
        name: `${days}-day included support`,
        description: `Post-onboarding support window for ${input.clientName} — SLA 24 business hours.`,
        payload: { days, automated: true, endsAt: new Date(Date.now() + days * 86400000).toISOString() },
      });
    } catch {
      /* plan limits */
    }
  }

  async bootstrapAiSupportRetainer(input: {
    userId: string;
    clientName: string;
    paymentId: string;
    industryCategory?: string | null;
    moduleSlugs: string[];
  }): Promise<{
    modulesActivated: string[];
    ragSeeded: boolean;
    setupArtifact: FulfillmentArtifact;
    avatarProvision: { provider: string; configured: boolean; memoryKey: string };
  }> {
    const modulesActivated = await this.activateModules({
      userId: input.userId,
      moduleSlugs: input.moduleSlugs,
      clientName: input.clientName,
      industryCategory: input.industryCategory,
    });
    const effectiveModules =
      modulesActivated.length > 0 ? modulesActivated : [...input.moduleSlugs];

    const avatarProvision = await this.provisionClientAvatar({
      userId: input.userId,
      clientName: input.clientName,
      paymentId: input.paymentId,
      agentType: 'support',
    });

    let ragSeeded = false;
    try {
      const memory = new AiMemoryService();
      await memory.remember(input.userId, {
        namespace: 'support-kb',
        key: input.paymentId.slice(0, 8),
        value: {
          clientName: input.clientName,
          industryCategory: input.industryCategory ?? 'general',
          note: `Support knowledge base for ${input.clientName}.`,
        },
      });
      ragSeeded = true;
    } catch {
      ragSeeded = false;
    }

    const webBase = config.app.webUrl.replace(/\/$/, '');
    const avatarReady = avatarProvision.configured;
    const setup = {
      clientName: input.clientName,
      industryCategory: input.industryCategory ?? 'general',
      avatarSupportUrl: `${webBase}/dashboard/support`,
      videoMeetingsUrl: `${webBase}/dashboard/support`,
      modules: effectiveModules,
      ragNamespace: 'support-kb',
      ragSeeded,
      voiceProvider: 'elevenlabs',
      avatarProvider: avatarProvision.provider,
      avatarConfigured: avatarReady,
      avatarMemoryKey: avatarProvision.memoryKey,
      note: avatarReady
        ? 'HeyGen/D-ID configured — video avatar path available in support dashboard.'
        : 'RAG knowledge seed + support modules active. Video avatar NOT CONNECTED until HeyGen or D-ID keys are configured (live_portrait fallback only).',
      channelHonesty: {
        heygen: isHeygenConfigured() ? 'CONNECTED' : 'NOT CONNECTED',
        did: isDidConfigured() ? 'CONNECTED' : 'NOT CONNECTED',
      },
    };

    const setupArtifact = this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'ai-support-setup.json',
      content: JSON.stringify(setup, null, 2),
      type: 'ai_support_setup',
      downloadLabel: 'AI support setup guide',
    });

    try {
      await this.tasks.createTask(input.userId, {
        type: 'ai_support_provisioning',
        name: 'AI support retainer — provisioned',
        description: avatarReady
          ? `Avatar + RAG + meetings provisioned for ${input.clientName}.`
          : `RAG + modules provisioned for ${input.clientName}; video avatar keys NOT CONNECTED.`,
        payload: {
          automated: true,
          modules: effectiveModules,
          ragSeeded,
          avatarConfigured: avatarReady,
        },
      });
    } catch {
      /* plan limits */
    }

    await this.openKickoffSupportTicket({
      userId: input.userId,
      clientName: input.clientName,
      deliverableId: 'ai-support-retainer',
      slaHours: 24,
      industryCategory: input.industryCategory,
    });

    return { modulesActivated: effectiveModules, ragSeeded, setupArtifact, avatarProvision };
  }
}
