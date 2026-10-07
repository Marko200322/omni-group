import { randomBytes } from 'crypto';
import { AiMemoryService } from '../../ai-memory/service/ai-memory.service';
import { AuthRepository } from '../../auth/repository/auth.repository';
import { CrmService } from '../../crm/service/crm.service';
import { NotificationsService } from '../../notifications/service/notifications.service';
import { TasksService } from '../../tasks/service/tasks.service';
import { TitanisService } from '../../titanis/service/titanis.service';
import { resolveVerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import {
  normalizeCategorySlug,
  resolveVerticalSlug,
} from '../../../shared/industry/industry-catalog';
import { getIndustryCategory } from '../lib/category-pricing';
import type { VerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import { DeliverableArtifactStoreService } from './deliverable-artifact-store.service';
import { LocalInfrastructureService } from '../../autonomy-loop/service/local-infrastructure.service';
import {
  buildMigrationCsv,
  buildProductionDeployRunbook,
  buildTrainingOutlineMarkdown,
} from '../lib/deliverable-handlers/artifact-helpers';
import type { FulfillmentArtifact } from '../lib/deliverable-handlers/types';
import { config } from '../../../config';
import logger from '../../../utils/logger';
import { grantUserModules } from '../../../utils/plan-module-access';
import { isHeygenConfigured } from '../../video-meetings/providers/heygen-video.provider';
import { isDidConfigured } from '../../video-meetings/providers/did-video.provider';
import { getAvatarAgentAsync } from '../../video-meetings/avatar/avatar-agent.config';
import { getSlackNotifier } from '../../../utils/slack-notifier.service';
import { getLeadDatabaseService } from '../../../integrations';
import {
  CRM_PIPELINE_STAGES,
  buildDemoSampleLeads,
  isLiveHarvestOnKickoffEnabled,
  renderPipelineWorkspaceMarkdown,
  resolveLeadGenMode,
  type ChannelConnectionStatus,
  type LeadGenMode,
  type OutreachChannelStatus,
} from '../lib/lead-gen-ops-pack';

export type { ChannelConnectionStatus, LeadGenMode, OutreachChannelStatus };

export type CrmBootstrapResult = {
  clientContactId?: string;
  importedLeads: number;
  pipelineStages: string[];
  /** Demo / industry template samples — never claim live migrated data. */
  sampleKind: 'demo_industry_template';
  labeledDemo: boolean;
};

/** Real portal entitlements (user_modules + org billing) — not task-only theater. */
export type PortalEntitlementResult = {
  modulesActivated: string[];
  userModulesGranted: string[];
  billingAccess: boolean;
  orgRole: string | null;
  notificationSeeded: boolean;
  entitlementSource: 'user_modules+org';
  portalReady: boolean;
};

export type LeadGenBootstrapResult = {
  workspaceId?: string;
  runId?: string;
  /** Live/API-backed leads only — never invented; 0 until real harvest adapter returns contacts. */
  leadsGenerated: number;
  /** Demo CRM samples seeded for kickoff visibility (not live harvest). */
  sampleLeadsSeeded: number;
  estimatedRevenue: number;
  channelStatuses: OutreachChannelStatus[];
  /**
   * kickoff_pack_only — ads/enrichment NOT CONNECTED; ops pack still complete.
   * channels_ready — credentials CONNECTED but no live harvest adapter pulled contacts yet.
   * live_harvest — real enrichment/ads harvest returned contacts (not Titanis theater).
   * Mode is rule-based via resolveLeadGenMode — never random.
   */
  mode: LeadGenMode;
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

  const linkedinAdsCreds =
    envPresent('LINKEDIN_ADS_ACCESS_TOKEN') && envPresent('LINKEDIN_ADS_ACCOUNT_ID');
  const linkedinLive =
    linkedinAdsCreds &&
    ['true', '1', 'yes'].includes((process.env.MARKETING_ADS_LIVE_SYNC ?? '').trim().toLowerCase());

  const apollo = envPresent('APOLLO_API_KEY');
  const email =
    envPresent('RESEND_API_KEY') ||
    (envPresent('SMTP_USER') && envPresent('SMTP_PASSWORD')) ||
    Boolean(config.aggregators?.comms?.url?.trim());

  return [
    {
      channel: 'linkedin',
      status: linkedinLive ? 'CONNECTED' : 'NOT CONNECTED',
      detail: linkedinLive
        ? 'LINKEDIN_ADS_* + MARKETING_ADS_LIVE_SYNC enabled'
        : linkedinAdsCreds
          ? 'Credentials present — set MARKETING_ADS_LIVE_SYNC=true for live pull'
          : 'LINKEDIN_ADS_* incomplete or missing (CONFIGURATION REQUIRED)',
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
  const raw =
    industryCategory?.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') || 'professional';
  const resolved = resolveVerticalSlug(raw);
  if (resolved) {
    return resolveVerticalDeliveryPack({
      slug: resolved.verticalSlug,
      category: resolved.category,
      subtype: resolved.subtype,
      name: resolved.name,
    });
  }
  const category = normalizeCategorySlug(raw);
  const meta = getIndustryCategory(category);
  return resolveVerticalDeliveryPack({
    slug: meta?.slug ?? category,
    category: meta?.slug ?? category,
    subtype: null,
    name: meta?.name ?? category.replace(/_/g, ' '),
  });
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? 'Client', last: parts.slice(1).join(' ') || 'Account' };
}


export class ClientDeliverableBootstrapService {
  private crm = new CrmService();
  private tasks = new TasksService();
  private titanis = new TitanisService();
  private artifacts = new DeliverableArtifactStoreService();
  private authRepo = new AuthRepository();
  private notifications = new NotificationsService();

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

    const samples = buildDemoSampleLeads(pack, 8);
    const bulk = await this.crm.bulkImport(input.userId, { contacts: samples });

    const pipelineStages = [...CRM_PIPELINE_STAGES];
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
      sampleKind: 'demo_industry_template',
      labeledDemo: true,
    };
  }

  /**
   * Grant real portal entitlements:
   * - user_modules rows (checked by plan-module-access)
   * - org membership with billing.read/manage (owner)
   * - welcome notification so notifications inbox is live
   * Tasks are secondary evidence only — never the sole activation signal.
   */
  async grantPortalEntitlements(input: {
    userId: string;
    moduleSlugs: string[];
    clientName: string;
    industryCategory?: string | null;
    seedWelcomeNotification?: boolean;
  }): Promise<PortalEntitlementResult> {
    let userModulesGranted: string[] = [];
    try {
      userModulesGranted = await grantUserModules(input.userId, input.moduleSlugs);
    } catch (err) {
      logger.warn('user_modules grant failed', {
        error: err instanceof Error ? err.message : String(err),
        userId: input.userId,
      });
    }

    let billingAccess = false;
    let orgRole: string | null = null;
    try {
      const org = await this.authRepo.ensureOrganization(input.userId, input.clientName);
      orgRole = org.role ?? null;
      billingAccess = orgRole === 'owner' || orgRole === 'admin' || orgRole === 'operator' || orgRole === 'member';
    } catch (err) {
      logger.warn('Portal billing org ensure failed', {
        error: err instanceof Error ? err.message : String(err),
        userId: input.userId,
      });
    }

    let notificationSeeded = false;
    if (input.seedWelcomeNotification !== false && userModulesGranted.includes('notifications')) {
      try {
        await this.notifications.createNotification({
          userId: input.userId,
          type: 'portal_setup',
          title: `Portal ready — ${input.clientName}`,
          message: [
            'Your client portal entitlements are active.',
            'Billing access and notifications are enabled for your workspace.',
            input.industryCategory ? `Industry: ${input.industryCategory}.` : '',
          ]
            .filter(Boolean)
            .join(' '),
          channel: 'in_app',
          actionUrl: '/dashboard/billing',
          metadata: {
            modules: userModulesGranted,
            source: 'fulfillment-bootstrap',
            industryCategory: input.industryCategory ?? null,
          },
        });
        notificationSeeded = true;
      } catch (err) {
        logger.warn('Welcome notification seed failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    for (const slug of userModulesGranted) {
      try {
        await this.tasks.createTask(input.userId, {
          type: 'module_activation',
          name: `Module entitled: ${slug}`,
          description: `user_modules entitlement granted for ${slug} (${input.clientName}).`,
          payload: {
            moduleSlug: slug,
            automated: true,
            entitlementSource: 'user_modules+org',
            taskTheaterOnly: false,
          },
        });
      } catch {
        /* plan limits — non-fatal; entitlement already in user_modules */
      }
    }

    try {
      const memory = new AiMemoryService();
      await memory.remember(input.userId, {
        namespace: 'portal-entitlements',
        key: 'active',
        value: {
          modules: userModulesGranted,
          billingAccess,
          orgRole,
          notificationSeeded,
          clientName: input.clientName,
          industryCategory: input.industryCategory ?? null,
          grantedAt: new Date().toISOString(),
        },
      });
    } catch {
      /* memory optional */
    }

    const hasCore =
      userModulesGranted.includes('notifications') && userModulesGranted.includes('billing');
    const portalReady = hasCore && billingAccess && notificationSeeded;

    return {
      modulesActivated: userModulesGranted,
      userModulesGranted,
      billingAccess,
      orgRole,
      notificationSeeded,
      entitlementSource: 'user_modules+org',
      portalReady,
    };
  }

  async activateModules(input: {
    userId: string;
    moduleSlugs: string[];
    clientName: string;
    industryCategory?: string | null;
  }): Promise<string[]> {
    const result = await this.grantPortalEntitlements({
      ...input,
      seedWelcomeNotification: input.moduleSlugs.includes('notifications'),
    });
    return result.modulesActivated;
  }

  async runLeadGenKickoff(input: {
    userId: string;
    industryCategory?: string | null;
    pack?: VerticalDeliveryPack;
  }): Promise<LeadGenBootstrapResult> {
    const pack = input.pack ?? resolvePack(input.industryCategory);
    const channelStatuses = resolveLeadGenChannelStatuses();

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

    let runId: string | undefined;
    // Optional planning run — leads_generated stays 0 (Titanis does not invent harvest).
    if (workspaceId) {
      try {
        const run = (await this.titanis.run(workspaceId, input.userId, {
          mode: 'lead-hunt',
          targetCount: 25,
        })) as { id?: string; output_payload?: Record<string, unknown> };
        runId = run?.id;
        const claimed = Number(run?.output_payload?.leads_generated ?? 0);
        if (claimed > 0) {
          logger.warn('Titanis returned non-zero leads_generated — ignored for fulfillment honesty', {
            claimed,
            workspaceId,
          });
        }
      } catch (err) {
        logger.warn('Titanis planning run skipped', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Real harvest path only when opt-in + enrichment providers active — never invent.
    let leadsGenerated = 0;
    if (isLiveHarvestOnKickoffEnabled()) {
      try {
        const leadDb = getLeadDatabaseService();
        if (leadDb.isEnrichmentActive()) {
          const contacts = await leadDb.enrichFromHuntContext({
            verticalSlug: pack.verticalSlug,
            verticalName: pack.displayName,
          });
          leadsGenerated = contacts.length;
          if (leadsGenerated > 0) {
            try {
              await this.crm.bulkImport(input.userId, {
                contacts: contacts.map((c, i) => ({
                  firstName: c.firstName ?? 'Lead',
                  lastName: c.lastName ?? String(i + 1),
                  email: c.email ?? undefined,
                  company: c.company ?? undefined,
                  status: 'lead' as const,
                  source: `live_harvest:${c.provider ?? 'enrichment'}`,
                  tags: [pack.verticalSlug, 'LIVE_HARVEST', c.provider ?? 'unknown'],
                  notes: `[LIVE HARVEST] ${c.title ?? ''} ${c.companyDomain ?? ''}`.trim(),
                })),
              });
            } catch (err) {
              logger.warn('Live harvest CRM import skipped', {
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        } else {
          logger.info('LEAD_LIVE_HARVEST_ON_KICKOFF set but enrichment inactive — leads stay 0', {
            verticalSlug: pack.verticalSlug,
          });
        }
      } catch (err) {
        logger.warn('Live harvest adapter failed — leads_generated stays 0', {
          error: err instanceof Error ? err.message : String(err),
        });
        leadsGenerated = 0;
      }
    }

    const mode = resolveLeadGenMode({ channelStatuses, liveLeadsGenerated: leadsGenerated });

    return {
      workspaceId,
      runId,
      leadsGenerated,
      sampleLeadsSeeded: 0,
      estimatedRevenue: 0,
      channelStatuses,
      mode,
    };
  }

  /** Actionable portal tasks ops can execute in week 1 (not vanity module flags). */
  async seedLeadGenOpsTasks(input: {
    userId: string;
    clientName: string;
    pack: VerticalDeliveryPack;
    channelStatuses: OutreachChannelStatus[];
  }): Promise<string[]> {
    const connected = input.channelStatuses.filter((c) => c.status === 'CONNECTED').map((c) => c.channel);
    const taskDefs = [
      {
        name: 'Week 1 — Confirm ICP + target list',
        description: `Define ICP for ${input.pack.displayName}. Use CRM sample stages; replace demo @example leads with real prospects.`,
        payload: { week: 1, action: 'confirm_icp', verticalSlug: input.pack.verticalSlug },
      },
      {
        name: 'Week 1 — Load sequence templates',
        description: 'Copy sequence templates from pipeline workspace into Outreach; personalize hooks before any send.',
        payload: { week: 1, action: 'load_sequences', hooks: input.pack.outreachHooks.slice(0, 3) },
      },
      {
        name: 'Week 1 — Channel status board review',
        description: connected.length
          ? `Connected: ${connected.join(', ')}. Confirm live sync before claiming harvest.`
          : 'All ads/enrichment channels NOT CONNECTED — execute human/ops outbound from kickoff pack; do not report fake leads.',
        payload: { week: 1, action: 'review_channels', channelStatuses: input.channelStatuses },
      },
      {
        name: 'Week 2 — Pipeline hygiene',
        description: `Move CRM contacts through lead → prospect → customer for ${input.clientName}. Log outcomes on kickoff ticket.`,
        payload: { week: 2, action: 'pipeline_hygiene', stages: ['lead', 'prospect', 'customer'] },
      },
    ];
    const created: string[] = [];
    for (const t of taskDefs) {
      try {
        const task = await this.tasks.createTask(input.userId, {
          type: 'lead_gen_ops',
          name: t.name,
          description: t.description,
          payload: { ...t.payload, automated: true, clientVisible: true, actionable: true },
        });
        const id = (task as { id?: string })?.id;
        if (id) created.push(id);
      } catch {
        /* plan limits */
      }
    }
    return created;
  }

  saveLeadGenPipelineWorkspace(input: {
    userId: string;
    paymentId: string;
    pack: VerticalDeliveryPack;
    clientName: string;
    stats: LeadGenBootstrapResult;
  }): FulfillmentArtifact {
    const { pack, stats, clientName } = input;
    const channels = stats.channelStatuses ?? resolveLeadGenChannelStatuses();
    const content = renderPipelineWorkspaceMarkdown({
      clientName,
      pack,
      mode: stats.mode,
      workspaceId: stats.workspaceId,
      channelStatuses: channels,
      leadsGenerated: stats.leadsGenerated,
    });
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'lead-gen-pipeline-workspace.md',
      content,
      type: 'lead_gen_pipeline_workspace',
      downloadLabel: 'Lead gen pipeline workspace',
    });
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
    const apiV1 = `${apiBase}/api/v1`;

    const webhookEndpoints = {
      paymentCompleted: `${apiV1}/payments/webhooks/stripe`,
      deliverableReady: `${webBase}/api/atina/billing/fulfillment/jobs/${input.paymentId}`,
      customIngress: `${apiV1}/integrations/inbound/${input.userId}`,
    };

    const envMap = {
      STRIPE_WEBHOOK_SECRET: {
        purpose: 'Verify Stripe payment.completed signatures',
        where: 'Stripe Dashboard → Webhooks → Signing secret',
        requiredWhen: 'Card payments enabled',
      },
      STRIPE_SECRET_KEY: {
        purpose: 'Server-side Stripe API calls',
        where: 'Stripe Dashboard → Developers → API keys',
        requiredWhen: 'Card payments enabled',
      },
      OPENROUTER_API_KEY: {
        purpose: 'Optional AI connector (not pre-wired)',
        where: 'OpenRouter account → API keys',
        requiredWhen: 'You enable AI features in your stack',
      },
      SMTP_URL_OR_RESEND_API_KEY: {
        purpose: 'Transactional email from your domain',
        where: 'Your ESP (Resend/SendGrid/SMTP provider)',
        requiredWhen: 'You send mail from your own domain',
      },
      INTEGRATION_WEBHOOK_SECRET: {
        purpose: 'HMAC for customIngress callbacks',
        where: 'Copy webhookSecret from this JSON into your consumer',
        requiredWhen: 'Always — rotate quarterly',
        valueHint: 'Use webhookSecret field in this file (never commit to git)',
      },
      CLIENT_JWT_OR_PORTAL_CREDENTIALS: {
        purpose: 'Bearer auth against Omni REST (login endpoint)',
        where: 'Client portal user for this workspace',
        requiredWhen: 'Calling protected /api/v1 routes',
      },
    };

    const retryPolicy = {
      maxAttempts: 5,
      initialBackoffMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 60_000,
      jitter: true,
      deadLetterAfterAttempts: 5,
      retryOnHttpStatus: [408, 429, 500, 502, 503, 504],
      idempotencyHeader: 'Idempotency-Key',
      note: 'Consumers must return 2xx quickly and process async; retry only on transient failures.',
    };

    const onboardingChecklist = [
      {
        step: 1,
        title: 'Store webhookSecret securely',
        action:
          'Copy webhookSecret from this JSON into your secrets manager as INTEGRATION_WEBHOOK_SECRET. Do not commit it.',
        doneWhen: 'Secret is in vault / env of the consumer only',
      },
      {
        step: 2,
        title: 'Register webhook endpoints',
        action: `Point your Stripe (or payment) webhook at ${webhookEndpoints.paymentCompleted}. Point internal job status consumers at deliverableReady. Use customIngress for your own systems.`,
        doneWhen: 'Provider dashboard shows endpoint + signing secret configured',
      },
      {
        step: 3,
        title: 'Add third-party API keys (only when you go live)',
        action:
          'Fill envMap keys that apply (Stripe, email, OpenRouter, etc.). Keys are NOT pre-connected — this pack documents how to wire them.',
        doneWhen: 'Required env vars set in staging; unused keys left blank',
      },
      {
        step: 4,
        title: 'Verify HMAC + retry policy',
        action:
          'Implement signature check on inbound webhooks; apply retryPolicy (exponential backoff + dead-letter). Send Idempotency-Key on payment-confirm retries.',
        doneWhen: 'Staging echo returns 2xx; failed deliveries land in DLQ after maxAttempts',
      },
      {
        step: 5,
        title: 'Sandbox end-to-end',
        action:
          'Run Auth → CRM contact → payment reference → payment.completed → artifact unlock using sampleEvents payloads.',
        doneWhen: 'E2E green in staging with sandbox keys only',
      },
      {
        step: 6,
        title: 'Production cutover',
        action:
          'Rotate webhookSecret, swap live keys, disable sandbox endpoints, monitor p95 latency and failed fulfillment count for 24h.',
        doneWhen: 'Live purchase produces downloadable artifacts; rollback flag documented',
      },
    ];

    return {
      schema: 'omni-integration-config/v2',
      clientName: input.clientName,
      generatedAt: new Date().toISOString(),
      status: 'DOCUMENTED_NOT_LIVE',
      honestyNote:
        'This package delivers a guide + config for your developer. Third-party tools (Stripe, ERP, CRM, AI, email) are NOT already connected until you add API keys and complete onboardingChecklist.',
      apiBase: apiV1,
      webhooks: webhookEndpoints,
      webhookEndpoints,
      authentication: {
        type: 'Bearer JWT',
        login: `${apiV1}/auth/login`,
        note: 'Use client portal credentials; rotate keys quarterly.',
      },
      envMap,
      retryPolicy,
      onboardingChecklist,
      modules: pack.coreModules,
      webhookSecret: secret,
      sampleEvents: [
        {
          type: 'payment.completed',
          example: {
            event: 'payment.completed',
            paymentId: input.paymentId,
            status: 'completed',
          },
        },
        {
          type: 'deliverable.ready',
          example: {
            event: 'deliverable.ready',
            paymentId: input.paymentId,
            artifactTypes: ['pdf', 'json'],
          },
        },
        {
          type: 'crm.contact.created',
          example: {
            event: 'crm.contact.created',
            email: 'lead@example.com',
            source: pack.verticalSlug,
          },
        },
      ],
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

  saveIntegrationOnboardingChecklist(input: {
    userId: string;
    paymentId: string;
    config: Record<string, unknown>;
  }): FulfillmentArtifact {
    const checklist = Array.isArray(input.config.onboardingChecklist)
      ? (input.config.onboardingChecklist as Array<Record<string, unknown>>)
      : [];
    const lines = [
      '# Integration onboarding checklist',
      '',
      `Client: ${String(input.config.clientName ?? 'Client')}`,
      '',
      'Tools are **not** pre-connected. Execute these steps when you add API keys.',
      '',
      ...checklist.map((item) => {
        const step = item.step ?? '?';
        const title = String(item.title ?? 'Step');
        const action = String(item.action ?? '');
        const doneWhen = String(item.doneWhen ?? '');
        return [`## ${step}. ${title}`, '', action, '', `Done when: ${doneWhen}`, ''].join('\n');
      }),
    ];
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'integration-onboarding-checklist.md',
      content: lines.join('\n'),
      type: 'integration_onboarding_checklist',
      downloadLabel: 'Onboarding checklist (Markdown)',
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
Mode: ${
      stats.mode === 'live_harvest'
        ? 'Live harvest returned contacts'
        : stats.mode === 'channels_ready'
          ? 'Channels CONNECTED — harvest adapter has not pulled contacts yet (leads_generated = 0)'
          : 'Kickoff ops pack only (LinkedIn/Google Ads NOT CONNECTED)'
    }

## Channel connection status (honest)
${channelLines}

## Kickoff results
- Live leads generated: ${stats.leadsGenerated} (never invented by Titanis)
- Sample CRM leads seeded (demo, not live harvest): ${samples}
- Estimated pipeline value (live only): €${stats.estimatedRevenue}
- Workspace: ${stats.workspaceId ?? 'created'}
- Titanis planning run: ${stats.runId ?? 'n/a'} (planning only — not a harvest success metric)

## What you received now
- Pipeline workspace (CRM stages, sequence templates, weekly plan, channel board)
- Outreach workspace in portal + actionable week-1 tasks
- CRM pipeline seed for ${pack.displayName}
- This kickoff report with channel honesty
- Onboarding ticket for first outreach week

## Next 30 days
${pack.workflowSteps.map((s, i) => `${i + 1}. ${s.step} (${s.moduleSlug})`).join('\n')}

## Outreach hooks (planning — not auto-sent to LinkedIn/Ads)
${pack.outreachHooks.map((h) => `- ${h}`).join('\n')}

## Connecting live channels (deterministic — no fake harvest)
1. Google Ads spend sync: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID + MARKETING_ADS_LIVE_SYNC=true
2. LinkedIn Ads: LINKEDIN_ADS_ACCESS_TOKEN + LINKEDIN_ADS_ACCOUNT_ID + MARKETING_ADS_LIVE_SYNC=true
3. Meta Ads: META_ADS_ACCESS_TOKEN + META_ADS_AD_ACCOUNT_ID + MARKETING_ADS_LIVE_SYNC=true
4. Apollo / Hunter live harvest on kickoff: APOLLO_API_KEY (or HUNTER_API_KEY), LEAD_DATABASE_ENABLED=true, LEAD_DATABASE_ROLLOUT_PHASE=F4 (or F3+), LEAD_LIVE_HARVEST_ON_KICKOFF=true
5. Without those flags, mode stays kickoff_pack_only / channels_ready and leads_generated=0
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
    industryCategory?: string | null;
  }): FulfillmentArtifact {
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'crm-migration-template.csv',
      content: buildMigrationCsv(input.clientName, { industryCategory: input.industryCategory }),
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
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'training-outline.md',
      content: buildTrainingOutlineMarkdown({
        clientName: input.clientName,
        industryCategory: input.industryCategory,
      }),
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
    const manifest = buildProductionDeployRunbook({
      clientName: input.clientName,
      deliverableId: 'setup-custom',
      deployPrep: input.deployPrep,
    });
    return this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'production-deploy-manifest.json',
      content: JSON.stringify(manifest, null, 2),
      type: 'production_deploy_manifest',
      downloadLabel: 'Production deploy runbook (JSON)',
    });
  }

  async runProductionDeployPrep(clientName: string): Promise<Record<string, unknown>> {
    const local = new LocalInfrastructureService();
    if (!local.isAvailable()) {
      return {
        skipped: true,
        reason: 'local_infrastructure_unavailable',
        sslProvisioned: false,
        domainConfigured: false,
        backupLive: false,
        monitoringLive: false,
        note: `Deploy prep skipped for ${clientName} — client must execute the production runbook checklist.`,
      };
    }
    try {
      const result = await local.triggerDeploy({
        phase: 'client_setup_custom',
        notes: `Production deploy prep for ${clientName}`,
        skipBlockingSteps: true,
      });
      return {
        skipped: false,
        ...((result && typeof result === 'object' ? result : { result }) as Record<string, unknown>),
        // Prep may run locally — never claim client DNS/SSL live without evidence.
        sslProvisioned: false,
        domainConfigured: false,
        backupLive: false,
        monitoringLive: false,
      };
    } catch (err) {
      return {
        skipped: true,
        error: err instanceof Error ? err.message : String(err),
        sslProvisioned: false,
        domainConfigured: false,
        backupLive: false,
        monitoringLive: false,
      };
    }
  }

  async bootstrapQuickPortal(input: {
    userId: string;
    clientName: string;
    industryCategory?: string | null;
  }): Promise<PortalEntitlementResult> {
    return this.grantPortalEntitlements({
      userId: input.userId,
      moduleSlugs: ['notifications', 'billing'],
      clientName: input.clientName,
      industryCategory: input.industryCategory,
      seedWelcomeNotification: true,
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
      ['Are LinkedIn Ads connected?', 'Only when LINKEDIN_ADS_ACCESS_TOKEN, LINKEDIN_ADS_ACCOUNT_ID, and MARKETING_ADS_LIVE_SYNC are set. Otherwise status is NOT CONNECTED (CONFIGURATION REQUIRED).'],
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
    faqArtifact: FulfillmentArtifact;
    knowledgeBaseArtifact: FulfillmentArtifact;
    avatarProvision: { provider: string; configured: boolean; memoryKey: string };
    configurationRequired: string[];
    kickoffTicketId?: string;
  }> {
    const pack = resolvePack(input.industryCategory);
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

    const faqEntries = [
      {
        q: 'How do I open a support ticket?',
        a: 'Use the portal Support / Tasks inbox. AI support retainer targets 24h first response.',
      },
      {
        q: 'Is the video avatar live?',
        a: 'Only when HeyGen or D-ID keys are configured. Otherwise status is CONFIGURATION REQUIRED / NOT CONNECTED — text RAG still works.',
      },
      {
        q: 'What knowledge is in the AI assistant?',
        a: `Starter KB for ${pack.displayName}: value prop, FAQ seed, and ticket-queue guidance. Add docs via support dashboard.`,
      },
      {
        q: 'Can clients book a meeting/avatar session?',
        a: avatarProvision.configured
          ? 'Yes — open /dashboard/support for the video/avatar path.'
          : 'Meeting/avatar session path is ready in the portal once HeyGen/D-ID keys are set (CONFIGURATION REQUIRED until then).',
      },
      { q: `What is our ${pack.displayName} focus?`, a: pack.valueProp },
    ];

    let ragSeeded = false;
    try {
      const memory = new AiMemoryService();
      await memory.remember(input.userId, {
        namespace: 'support-kb',
        key: input.paymentId.slice(0, 8),
        value: {
          clientName: input.clientName,
          industryCategory: input.industryCategory ?? 'general',
          verticalSlug: pack.verticalSlug,
          valueProp: pack.valueProp,
          faqs: faqEntries,
          note: `Support knowledge base for ${input.clientName} (${pack.displayName}).`,
          meetingPath: '/dashboard/support',
        },
      });
      // Second memory entry = FAQ corpus for retrieval-style usage.
      await memory.remember(input.userId, {
        namespace: 'support-kb-faq',
        key: input.paymentId.slice(0, 8),
        value: { faqs: faqEntries, updatedAt: new Date().toISOString() },
      });
      ragSeeded = true;
    } catch {
      ragSeeded = false;
    }

    const webBase = config.app.webUrl.replace(/\/$/, '');
    const avatarReady = avatarProvision.configured;
    const configurationRequired: string[] = [];
    if (!isHeygenConfigured() && !isDidConfigured()) {
      configurationRequired.push('HEYGEN_API_KEY or DID_API_KEY for video avatar sessions');
    }
    if (!avatarReady) {
      configurationRequired.push('Video avatar provider (HeyGen/D-ID) — CONFIGURATION REQUIRED');
    }

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
      configurationRequired,
      note: avatarReady
        ? 'HeyGen/D-ID configured — video avatar + meeting path available in support dashboard.'
        : 'CONFIGURATION REQUIRED for video avatar (HeyGen/D-ID). Ops pack still complete: RAG knowledge base, FAQ seed, ticket queue, SLA pack.',
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

    const knowledgeBaseArtifact = this.artifacts.saveText({
      userId: input.userId,
      paymentId: input.paymentId,
      filename: 'ai-support-knowledge-base.md',
      content: `# AI Support Knowledge Base — ${input.clientName}

Industry: ${pack.displayName}
RAG seeded: ${ragSeeded}
Avatar: ${avatarReady ? 'CONNECTED' : 'CONFIGURATION REQUIRED / NOT CONNECTED'}

## Value proposition
${pack.valueProp}

## Starter corpus
${faqEntries.map((f, i) => `### ${i + 1}. ${f.q}\n${f.a}`).join('\n\n')}

## Meeting / avatar session path
- Portal: ${webBase}/dashboard/support
- ${
        avatarReady
          ? 'Provider keys present — start avatar/meeting session from support dashboard.'
          : 'CONFIGURATION REQUIRED: add HeyGen or D-ID keys before live video avatar sessions. Ticket queue + FAQ still operational.'
      }

## Ops checklist
1. Review FAQ seed and add client-specific answers
2. Confirm kickoff ticket is open in portal Tasks
3. Route first client questions through support inbox
4. Only claim video avatar live when channelHonesty shows CONNECTED
`,
      type: 'ai_support_knowledge_base',
      downloadLabel: 'AI support knowledge base',
    });

    const faqArtifact = this.saveSupportFaqSeed({
      userId: input.userId,
      paymentId: input.paymentId,
      clientName: input.clientName,
      industryCategory: input.industryCategory,
      pack,
    });

    for (const t of [
      {
        name: 'AI support — ticket queue active',
        description: `Ticket queue + RAG for ${input.clientName}. Reply via portal support inbox.`,
        payload: { actionable: true, queue: 'support', ragSeeded },
      },
      {
        name: avatarReady
          ? 'AI support — test avatar/meeting session'
          : 'AI support — CONFIGURATION REQUIRED: avatar keys',
        description: avatarReady
          ? 'Open /dashboard/support and run a test meeting/avatar session.'
          : 'Add HeyGen or D-ID keys, then re-test avatar path. KB + FAQ already delivered.',
        payload: {
          actionable: true,
          configurationRequired: !avatarReady,
          avatarConfigured: avatarReady,
        },
      },
    ]) {
      try {
        await this.tasks.createTask(input.userId, {
          type: 'ai_support_ops',
          name: t.name,
          description: t.description,
          payload: { ...t.payload, automated: true, clientVisible: true },
        });
      } catch {
        /* plan limits */
      }
    }

    const kickoffTicketId = await this.openKickoffSupportTicket({
      userId: input.userId,
      clientName: input.clientName,
      deliverableId: 'ai-support-retainer',
      slaHours: 24,
      industryCategory: input.industryCategory,
    });

    return {
      modulesActivated: effectiveModules,
      ragSeeded,
      setupArtifact,
      faqArtifact,
      knowledgeBaseArtifact,
      avatarProvision,
      configurationRequired,
      kickoffTicketId,
    };
  }
}
