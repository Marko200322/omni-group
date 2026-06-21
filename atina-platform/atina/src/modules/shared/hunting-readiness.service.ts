import { config } from '../../config';
import { getAiClient, getCommsClient, getScraperClient, getLeadDatabaseService } from '../../integrations';
import { moduleRegistry } from '../../core/ModuleRegistry';
import { OutboundQueueService } from '../autonomy-loop/service/outbound-queue.service';
import { WorkflowChainService } from '../workflow-chain/service/workflow-chain.service';
import { HUNTING_ECOSYSTEM_SLUGS } from './ecosystem-workspace.util';

import { leadRolloutPhaseLabel, type LeadRolloutPhase } from '../../integrations/lead-databases/phased-rollout';

function leadDbHint(): string {
  const st = getLeadDatabaseService().getStatus();
  if (!st.enabled) {
    return 'LEAD_DATABASE_ENABLED=false — F0/F1 scrape only. Enable + phase F3+ when you add API keys.';
  }
  return `Phase ${st.phase} (${leadRolloutPhaseLabel(st.phase as LeadRolloutPhase)}). Add APOLLO/HUNTER/… keys in .env`;
}

export type ReadinessCheck = {
  id: string;
  label: string;
  status: 'ready' | 'partial' | 'missing';
  hint?: string;
};

export class HuntingReadinessService {
  private readonly outbound = new OutboundQueueService();
  private readonly workflow = new WorkflowChainService();
  private readonly leadDb = getLeadDatabaseService();

  private leadDbStatus(): ReadinessCheck['status'] {
    const st = this.leadDb.getStatus();
    if (!st.enabled) return 'partial';
    const anyProvider = Object.values(st.providers).some((p) => p.configured);
    if (st.enrichOnHunt && anyProvider) return 'ready';
    if (anyProvider) return 'partial';
    return 'missing';
  }

  async getReadiness(userId?: string) {
    const scraper = getScraperClient();
    const ai = getAiClient();
    const comms = getCommsClient();
    const outboundStats = await this.outbound.getStats();

    const smtpReady =
      config.smtp.enabled &&
      Boolean(config.smtp.user?.trim()) &&
      Boolean(config.smtp.password?.trim());
    const scraperDirect = config.features.scraper && !scraper.isConfigured();
    const outboundSendReady =
      outboundStats.warmupComplete ||
      config.outreach.devSendToFallback ||
      smtpReady ||
      comms.isConfigured();

    const checks: ReadinessCheck[] = [
      {
        id: 'phase',
        label: 'PHASE (v2+ for hunting)',
        status: 'ready',
        hint: 'Set PHASE=v2 in .env and run phase-launch',
      },
      {
        id: 'scraper',
        label: 'Scraper (lead hunting)',
        status: scraper.isConfigured() ? 'ready' : scraperDirect ? 'partial' : 'missing',
        hint: scraper.isConfigured()
          ? 'Aggregator active'
          : scraperDirect
            ? 'Axios direct fallback (dev) — set SCRAPER_URL for production'
            : 'SCRAPER_URL + SCRAPER_KEY or ENABLE_SCRAPER=true',
      },
      {
        id: 'outbound',
        label: 'Outbound email',
        status: outboundSendReady ? 'ready' : smtpReady || comms.isConfigured() ? 'partial' : 'missing',
        hint: outboundSendReady
          ? 'Sending enabled'
          : 'SMTP_* or COMMS_* + OUTREACH_DEV_SEND_TO_FALLBACK=true (dev)',
      },
      {
        id: 'ai',
        label: 'AI (scoring, copy)',
        status: ai.isConfigured() ? 'ready' : 'partial',
        hint: ai.isConfigured() ? 'AI_URL + AI_KEY' : 'Optional — formula scoring works without AI',
      },
      {
        id: 'crm',
        label: 'CRM module',
        status: config.features.crm ? 'ready' : 'missing',
        hint: 'ENABLE_CRM=true',
      },
      {
        id: 'warmup',
        label: 'Domain warmup',
        status: outboundStats.warmupComplete ? 'ready' : 'partial',
        hint: outboundStats.warmupComplete
          ? 'OUTREACH_DOMAIN_WARMUP_COMPLETE=true'
          : 'Dev: OUTREACH_DEV_SEND_TO_FALLBACK=true until warmup completes',
      },
      {
        id: 'lead_database',
        label: 'Lead databases (Apollo/Hunter…)',
        status: this.leadDbStatus(),
        hint: leadDbHint(),
      },
    ];

    const registered = new Set(moduleRegistry.getAll().map((m) => m.slug));
    const huntingModules = HUNTING_ECOSYSTEM_SLUGS.map((slug) => ({
      slug,
      registered: registered.has(slug),
    }));

    const templates = this.workflow.listTemplates();
    const keyTemplates = ['nurture-loop', 'client-acquisition-pipeline', 'lead-proxy-acquisition-pipeline'];
    const templateStatus = keyTemplates.map((key) => {
      const found = templates.find((t) => t.key === key);
      return {
        key,
        available: Boolean(found),
        minPhase: found?.minPhase ?? null,
        totalSteps: found?.totalSteps ?? 0,
      };
    });

    const readyCount = checks.filter((c) => c.status === 'ready').length;
    const score = Math.round((readyCount / checks.length) * 100);

    return {
      score,
      ready: score >= 80,
      checks,
      huntingModules,
      templates: templateStatus,
      outbound: outboundStats,
      config: {
        realEcosystemRuns: config.autonomy.realEcosystemRuns,
        autonomyEnabled: config.autonomy.enabled,
        scraperEnabled: config.features.scraper,
        devSendToFallback: config.outreach.devSendToFallback,
        leadDatabase: this.leadDb.getStatus(),
      },
      userId: userId ?? null,
    };
  }
}
