import { ConflictError, NotFoundError } from '../../../utils/errors';
import {
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  withEcosystemIdempotencyLock,
} from '../../../utils/ecosystem-idempotency';
import {
  ClientHunterStatusDto,
  ClientHunterStatusDtoType,
  CreateClientHunterDtoType,
  RunClientHunterDtoType,
} from '../dto/client-hunter.dto';
import { config } from '../../../config';
import { assertFactoryModule } from '../../billing/lib/factory-phase-guard';
import { getScraperClient, getLeadDatabaseService } from '../../../integrations';
import { resolveVerticalSlug } from '../../../shared/industry/industry-catalog';
import { OutboundQueueService } from '../../autonomy-loop/service/outbound-queue.service';
import { CrmService } from '../../crm/service/crm.service';
import { ClientHunterRepository } from '../repository/client-hunter.repository';
import { listJobBoardPlatforms, countJobBoardPlatforms, type JobBoardKind } from '../data/job-board-catalog';
import { listHuntLocaleCodes } from '../data/hunt-locales';
import { HotClientsService } from './hot-clients.service';
import { isCompanyEmail } from '../lib/company-email';

const DEFAULT_PLATFORMS_PER_RUN = 12;

export class ClientHunterService {
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different client hunter run parameters';

  private readonly repo = new ClientHunterRepository();
  private readonly outbound = new OutboundQueueService();
  private readonly crm = new CrmService();
  private readonly leadDb = getLeadDatabaseService();
  private readonly hotClients = new HotClientsService();

  async listJobBoards(filter?: { region?: string; locale?: string; kind?: string }) {
    const platforms = listJobBoardPlatforms({
      region: filter?.region,
      locale: filter?.locale,
      kind: filter?.kind as import('../data/job-board-catalog').JobBoardKind | undefined,
      enabledOnly: true,
    });
    const stats = countJobBoardPlatforms();
    return {
      platforms,
      stats,
      locales: listHuntLocaleCodes(),
    };
  }

  async listHotClients(userId: string, opts?: { limit?: number; minHeat?: number }) {
    const [items, stats] = await Promise.all([
      this.hotClients.list(userId, opts),
      this.hotClients.stats(userId),
    ]);
    return { items, stats };
  }

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateClientHunterDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.huntStrategy);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunClientHunterDtoType, rawIdempotencyKey?: string) {
    assertFactoryModule('hunter', 'Client Hunter requires factory phase M2+ (scraper).');
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Client Hunter workspace');

    const idempotencyKey = normalizeEcosystemIdempotencyKey(rawIdempotencyKey);

    const execute = async () => {
      const estRevenue = Number(dto.revenueEstimate ?? 50);
      const leadMultiplier = dto.mode === 'hunt' ? 1.2 : dto.mode === 'discover' ? 1.0 : 0.85;
      let leadsDiscovered = Math.max(1, Math.round((dto.intensity / 10) * leadMultiplier));
      let qualityScore = Math.min(100, 55 + Math.round(dto.intensity / 3));
      const scrapeHits: string[] = [];
      const sampleLinks: string[] = [];

      if (dto.mode === 'hunt') {
        const scraper = getScraperClient();
        if (scraper.isConfigured() || config.features.scraper) {
          const excludeKinds = (config.hunt.excludePlatformKinds ?? ['government']).filter(
            (k): k is JobBoardKind =>
              ['job_board', 'freelance', 'government', 'aggregator', 'application_portal'].includes(k),
          );
          const platformList = listJobBoardPlatforms({
            region: dto.region,
            locale: dto.locale,
            slugs: dto.platforms,
            enabledOnly: true,
            excludeKinds: dto.platforms?.length ? undefined : excludeKinds,
            limit: dto.maxPlatforms ?? DEFAULT_PLATFORMS_PER_RUN,
          });

          for (const platform of platformList) {
            const data = await scraper.scrape({ url: platform.seedUrl, extractLinks: true, javascript: true });
            if (data) {
              scrapeHits.push(platform.slug);
              const links = Array.isArray(data.links) ? data.links : [];
              leadsDiscovered += Math.min(40, Math.floor(links.length / 5));
              for (const link of links.slice(0, 5)) {
                if (typeof link === 'string' && sampleLinks.length < 15) {
                  sampleLinks.push(link);
                }
              }
              try {
                await this.hotClients.recordFromHunt({
                  userId,
                  platformSlug: platform.slug,
                  locale: platform.locale,
                  region: platform.region,
                  companyName: platform.name,
                  jobUrl: links[0] && typeof links[0] === 'string' ? links[0] : undefined,
                  jobPostingExcerpt: `Intercepted listing via ${platform.name}`,
                  huntIntensity: dto.intensity,
                  verticalSlug: dto.verticalSlug,
                  metadata: { sample_links: links.slice(0, 3) },
                });
              } catch {
                /* hot_clients optional when migration pending */
              }
            }
          }
          qualityScore = Math.min(100, qualityScore + scrapeHits.length * 8);
        }
      }

      const outputPayload: Record<string, unknown> = {
        leadsDiscovered,
        qualityScore,
        estimatedRevenue: estRevenue,
        mode: dto.mode,
        intensity: dto.intensity,
        platforms_scraped: scrapeHits,
        sample_links: sampleLinks.slice(0, 10),
        scraper_configured: getScraperClient().isConfigured() || config.features.scraper,
        idempotency_key: idempotencyKey || null,
      };

      if (dto.verticalSlug && dto.mode === 'hunt' && scrapeHits.length > 0) {
        const resolved = resolveVerticalSlug(dto.verticalSlug);
        const category = dto.category ?? resolved?.category ?? 'development_it';
        const verticalName = dto.verticalName ?? resolved?.name ?? dto.verticalSlug;

        let enrichedLeads: Awaited<ReturnType<typeof this.leadDb.enrichFromHuntContext>> = [];
        if (this.leadDb.isEnrichmentActive()) {
          enrichedLeads = await this.leadDb.enrichFromHuntContext({
            verticalSlug: dto.verticalSlug,
            verticalName,
            sampleLinks,
          });
          if (config.hunt.companyEmailsOnly) {
            enrichedLeads = enrichedLeads.filter((l) => isCompanyEmail(l.email));
          }
          outputPayload.lead_database = {
            phase: this.leadDb.getStatus().phase,
            enriched: enrichedLeads.length,
            providers: enrichedLeads.map((l) => l.provider),
          };
        }

        // Commercial mode: only drafts with company emails (no scrape stubs without recipients).
        const drafts =
          enrichedLeads.length > 0
            ? await this.outbound.createDraftsFromLeads({
                userId,
                verticalSlug: dto.verticalSlug,
                category,
                verticalName,
                leads: enrichedLeads,
                source: 'client_hunter_lead_db',
              })
            : { created: 0, ids: [] as string[] };
        if (!enrichedLeads.length) {
          outputPayload.outbound_skipped = 'no_company_emails';
        }
        outputPayload.outbound = drafts;
        outputPayload.job_boards_scraped = scrapeHits.length;
        const crmContacts: string[] = [];
        for (let i = 0; i < enrichedLeads.length; i += 1) {
          try {
            const lead = enrichedLeads[i];
            if (config.hunt.companyEmailsOnly && !isCompanyEmail(lead.email)) continue;
            const contact = await this.crm.createContact(userId, {
              firstName: lead.firstName ?? 'Lead',
              lastName: lead.lastName ?? String(i + 1),
              email: lead.email ?? undefined,
              company: lead.company ?? scrapeHits[i % Math.max(1, scrapeHits.length)] ?? dto.verticalSlug,
              status: 'lead',
              source: 'lead_database',
              tags: [dto.verticalSlug, category, ...(lead.provider ? [lead.provider] : []), 'company_email'],
              notes: `Lead DB (${lead.provider}). Verified: ${lead.verified ? 'yes' : 'no'}`,
              customFields: lead.linkedinUrl ? { linkedin: lead.linkedinUrl } : {},
            });
            const contactId = (contact as { id?: string } | undefined)?.id;
            if (contactId) crmContacts.push(contactId);
          } catch {
            /* CRM optional when DB unavailable */
          }
        }
        if (crmContacts.length) {
          outputPayload.crm_leads = crmContacts;
        }
      }

      const { rows } = await this.repo.createRun(systemId, `client-hunter_${dto.mode}`, outputPayload);
      await this.repo.updateAfterRun(systemId, estRevenue, dto.mode, dto.intensity, leadsDiscovered);
      return rows[0];
    };

    if (idempotencyKey) {
      return withEcosystemIdempotencyLock(systemId, idempotencyKey, async () => {
        const { rows: existingRuns } = await findRecentEcosystemRunByIdempotencyKey(systemId, idempotencyKey);
        if (existingRuns[0]) {
          this.assertIdempotentPayloadMatches(existingRuns[0], dto);
          return existingRuns[0];
        }
        return execute();
      });
    }

    return execute();
  }

  private assertIdempotentPayloadMatches(row: Record<string, unknown>, dto: RunClientHunterDtoType) {
    const replayPayload = row.output_payload as
      | { mode?: unknown; intensity?: unknown; estimatedRevenue?: unknown }
      | undefined;
    const sameMode = replayPayload?.mode === dto.mode;
    const sameIntensity = replayPayload?.intensity === dto.intensity;
    const effectiveRevenue = Number(dto.revenueEstimate ?? 50);
    const priorRevenue =
      typeof replayPayload?.estimatedRevenue === 'number' && Number.isFinite(replayPayload.estimatedRevenue)
        ? replayPayload.estimatedRevenue
        : 50;
    const sameRevenue = priorRevenue === effectiveRevenue;
    if (!sameMode || !sameIntensity || !sameRevenue) {
      throw new ConflictError(ClientHunterService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
  }

  async status(): Promise<ClientHunterStatusDtoType> {
    const status = {
      strategies: ['broad', 'targeted', 'niche'] as const,
      activeStrategy: 'broad' as const,
      pipelineCapacity: {
        maxLeadsPerRun: 500,
        cooldownSeconds: 30,
      },
    };
    return ClientHunterStatusDto.parse(status);
  }
}
