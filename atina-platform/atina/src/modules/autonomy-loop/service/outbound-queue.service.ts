import { config } from '../../../config';
import { assertFactoryModule } from '../../billing/lib/factory-phase-guard';
import { getAiClient } from '../../../integrations';
import type { LeadRecord } from '../../../integrations/lead-databases/types';
import { NotificationsService } from '../../notifications/service/notifications.service';
import { resolveVerticalDeliveryPack } from '../lib/vertical-delivery-resolver';
import { renderOutreachEmailMarkdown } from '../templates/vertical-templates';
import { OutboundQueueRepository, type OutboundMessageRow, type OutboundStatus } from '../repository/outbound-queue.repository';
import {
  generateJobHuntEmail,
  isJobPostingContext,
  jobHuntToOutboundMarkdown,
  normalizeJobPostingContext,
} from '../../client-hunter/lib/job-hunt-copy';
import { getJobBoardPlatform } from '../../client-hunter/data/job-board-catalog';
import { getInstantlyClient } from '../../../integrations/instantly-client';
import { isCompanyEmail } from '../../client-hunter/lib/company-email';

function splitLeadName(full?: string | null): { firstName?: string; lastName?: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export type OutboundQueueStats = {
  emailProvider: string;
  instantlyConfigured: boolean;
  warmupComplete: boolean;
  warmupMode: boolean;
  dailyCap: number;
  sentToday: number;
  remainingToday: number;
  byStatus: Record<string, number>;
};

function parseOutreachMarkdown(md: string): { subject: string; bodyText: string; bodyHtml: string } {
  const subjectMatch =
    md.match(/\*\*Subject A:\*\*\s*(.+)/) ?? md.match(/\*\*Betreff:\*\*\s*(.+)/);
  const subject = subjectMatch?.[1]?.trim() ?? 'Angebot — Atina Automatisierung';
  const parts = md.split('---');
  const bodySection = parts.length >= 2 ? parts[1] : md;
  const bodyText = bodySection
    .replace(/\*\*Subject [AB]:\*\*.*\n/g, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .trim();
  const bodyHtml = bodyText
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
  return { subject, bodyText, bodyHtml };
}

export class OutboundQueueService {
  private readonly repo = new OutboundQueueRepository();
  private readonly notifications = new NotificationsService();

  async getStats(): Promise<OutboundQueueStats> {
    const sentTodayResult = await this.repo.countSentToday();
    const sentToday = parseInt(sentTodayResult.rows[0]?.count ?? '0', 10);
    const statusRows = await this.repo.countByStatus();
    const byStatus: Record<string, number> = {};
    for (const row of statusRows.rows as Array<{ status?: string; count: string }>) {
      if (row.status) byStatus[row.status] = parseInt(row.count, 10);
    }
    const dailyCap = config.outreach.dailyCap;
    const instantly = getInstantlyClient();
    return {
      emailProvider: config.outreach.emailProvider,
      instantlyConfigured: instantly.isConfigured(),
      warmupComplete: config.outreach.domainWarmupComplete,
      warmupMode: config.outreach.warmupMode,
      dailyCap,
      sentToday,
      remainingToday: Math.max(0, dailyCap - sentToday),
      byStatus,
    };
  }

  async createDraftFromVertical(input: {
    userId?: string | null;
    verticalSlug: string;
    category: string;
    name: string;
    researchData?: Record<string, unknown> | null;
    leadEmail?: string | null;
    leadName?: string | null;
    leadCompany?: string | null;
    source?: string;
    scrapeContext?: Record<string, unknown>;
  }): Promise<OutboundMessageRow> {
    const pack = resolveVerticalDeliveryPack({
      slug: input.verticalSlug,
      category: input.category,
      name: input.name,
      researchData: input.researchData ?? null,
    });

    let markdown = renderOutreachEmailMarkdown(pack);
    const ai = getAiClient();
    if (input.scrapeContext && isJobPostingContext(input.scrapeContext)) {
      const jobCtx = normalizeJobPostingContext(input.scrapeContext);
      const email = await generateJobHuntEmail(jobCtx, {
        model: process.env.HUNT_GEMINI_MODEL?.trim(),
      });
      markdown = jobHuntToOutboundMarkdown(email);
    } else if (ai.isConfigured() && input.scrapeContext) {
      try {
        const rec = await ai.fetchRecommendations({
          mode: 'outreach-email',
          verticalSlug: input.verticalSlug,
          category: input.category,
          query: `Write a short cold email for ${pack.displayName}. Context: ${JSON.stringify(input.scrapeContext).slice(0, 500)}`,
          intensity: 60,
        });
        if (rec?.recommendations?.[0]) {
          markdown = `${markdown}\n\n<!-- AI variant -->\n${rec.recommendations[0]}`;
        }
      } catch {
        /* template-only outreach when AI unavailable */
      }
    }

    const parsed = parseOutreachMarkdown(markdown);
    const initialStatus: OutboundStatus = config.outreach.domainWarmupComplete ? 'queued' : 'draft';

    const { rows } = await this.repo.insert({
      userId: input.userId,
      verticalSlug: input.verticalSlug,
      category: input.category,
      leadEmail: input.leadEmail,
      leadName: input.leadName,
      leadCompany: input.leadCompany,
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml,
      bodyText: parsed.bodyText,
      status: initialStatus,
      source: input.source ?? 'vertical_delivery',
      metadata: {
        warmup_blocked: !config.outreach.domainWarmupComplete,
        subtype: pack.subtype,
        vertical_package_eur: pack.verticalPackageQuoteEur,
        outreach_markdown_preview: markdown.slice(0, 2000),
      },
    });
    return rows[0];
  }

  async createDraftsFromScrape(input: {
    userId: string;
    verticalSlug: string;
    category: string;
    verticalName: string;
    leadsDiscovered: number;
    platformsScraped: string[];
    sampleLinks?: string[];
  }): Promise<{ created: number; ids: string[] }> {
    const count = Math.min(5, Math.max(1, Math.floor(input.leadsDiscovered / 10) || 1));
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const platformSlug = input.platformsScraped[i % input.platformsScraped.length] ?? 'linkedin_jobs';
      const platform = getJobBoardPlatform(platformSlug);
      const row = await this.createDraftFromVertical({
        userId: input.userId,
        verticalSlug: input.verticalSlug,
        category: input.category,
        name: input.verticalName,
        source: 'client_hunter_scrape',
        leadName: `Lead ${i + 1}`,
        leadCompany: platform?.name ?? platformSlug,
        scrapeContext: {
          hunt_mode: 'job_intercept',
          platform_slug: platformSlug,
          locale: platform?.locale ?? 'en',
          region: platform?.region ?? 'GLOBAL',
          platforms: input.platformsScraped,
          sample_links: input.sampleLinks?.slice(0, 3) ?? [],
          lead_index: i + 1,
        },
      });
      ids.push(row.id);
    }
    return { created: count, ids };
  }

  async createDraftsFromLeads(input: {
    userId: string;
    verticalSlug: string;
    category: string;
    verticalName: string;
    leads: LeadRecord[];
    source?: string;
  }): Promise<{ created: number; ids: string[] }> {
    const ids: string[] = [];
    const companyOnly = config.hunt.companyEmailsOnly !== false;
    const leads = input.leads.filter((lead) =>
      companyOnly ? isCompanyEmail(lead.email) : Boolean(lead.email?.trim()),
    );
    for (const lead of leads.slice(0, 5)) {
      const row = await this.createDraftFromVertical({
        userId: input.userId,
        verticalSlug: input.verticalSlug,
        category: input.category,
        name: input.verticalName,
        source: input.source ?? 'lead_database',
        leadEmail: lead.email,
        leadName: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || null,
        leadCompany: lead.company,
        scrapeContext: {
          provider: lead.provider,
          title: lead.title,
          company_domain: lead.companyDomain,
          verified: lead.verified,
        },
      });
      ids.push(row.id);
    }
    return { created: ids.length, ids };
  }

  async processSendQueue(): Promise<{ processed: number; sent: number; blocked: number; failed: number }> {
    if (!config.outreach.devSendToFallback) {
      assertFactoryModule('outbound_send', 'Outbound send requires factory phase M4+ and domain warmup.');
    }
    const devFallback =
      config.outreach.devSendToFallback && Boolean(config.outreach.fallbackNotifyEmail?.trim());
    const instantlyMode =
      config.outreach.emailProvider === 'instantly' &&
      getInstantlyClient().isConfigured() &&
      !devFallback;

    if (!config.outreach.domainWarmupComplete && !devFallback && !instantlyMode) {
      return { processed: 0, sent: 0, blocked: 0, failed: 0 };
    }

    const stats = await this.getStats();
    const slots = stats.remainingToday;
    if (slots <= 0) {
      return { processed: 0, sent: 0, blocked: 0, failed: 0 };
    }

    const { rows: queued } = devFallback
      ? await this.repo.listDrafts(Math.min(slots, 10))
      : await this.repo.listQueued(slots);
    let sent = 0;
    let failed = 0;

    for (const msg of queued) {
      const to = devFallback
        ? config.outreach.fallbackNotifyEmail!.trim()
        : msg.lead_email?.trim() || '';
      if (!to) {
        await this.repo.updateStatus(msg.id, 'failed', {
          metadata: { error: 'no_recipient' },
        });
        failed += 1;
        continue;
      }
      // Skip free-mail / gov / test — commercial outbound only.
      if (!devFallback && !isCompanyEmail(to)) {
        await this.repo.updateStatus(msg.id, 'failed', {
          metadata: { error: 'blocked_recipient_policy', to },
        });
        failed += 1;
        continue;
      }
      try {
        if (instantlyMode) {
          const name = splitLeadName(msg.lead_name);
          await getInstantlyClient().addLeadsToCampaign([
            {
              email: to,
              firstName: name.firstName ?? null,
              lastName: name.lastName ?? null,
              companyName: msg.lead_company,
              personalization: msg.body_text?.slice(0, 2000) ?? null,
              customVariables: {
                subject: msg.subject,
                body_html: msg.body_html,
                outbound_id: msg.id,
                vertical_slug: msg.vertical_slug ?? '',
              },
            },
          ]);
        } else {
          await this.notifications.sendEmail(to, msg.subject, msg.body_html, msg.body_text ?? undefined);
        }
        await this.repo.updateStatus(msg.id, 'sent', {
          sentAt: new Date(),
          metadata: instantlyMode ? { provider: 'instantly' } : { provider: 'resend' },
        });
        sent += 1;
      } catch (err) {
        await this.repo.updateStatus(msg.id, 'failed', {
          metadata: { error: err instanceof Error ? err.message : String(err) },
        });
        failed += 1;
      }
    }

    return { processed: queued.length, sent, blocked: 0, failed };
  }

  async queueDraftsForWarmupComplete(): Promise<{ queued: number }> {
    if (!config.outreach.domainWarmupComplete) {
      return { queued: 0 };
    }
    const { rows } = await this.repo.promoteDraftsToQueued(200);
    return { queued: rows.length };
  }
}
