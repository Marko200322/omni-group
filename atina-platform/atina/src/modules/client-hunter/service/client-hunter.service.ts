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
import { getScraperClient } from '../../../integrations';
import { ClientHunterRepository } from '../repository/client-hunter.repository';

const PLATFORM_SEED_URLS: Record<string, string> = {
  upwork: 'https://www.upwork.com/nx/search/jobs/',
  fiverr: 'https://www.fiverr.com/search/gigs',
  linkedin: 'https://www.linkedin.com/jobs/search/',
};

export class ClientHunterService {
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different client hunter run parameters';

  private readonly repo = new ClientHunterRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateClientHunterDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.huntStrategy);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunClientHunterDtoType, rawIdempotencyKey?: string) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Client Hunter workspace');

    const idempotencyKey = normalizeEcosystemIdempotencyKey(rawIdempotencyKey);

    const execute = async () => {
      const estRevenue = Number(dto.revenueEstimate ?? 50);
      const leadMultiplier = dto.mode === 'hunt' ? 1.2 : dto.mode === 'discover' ? 1.0 : 0.85;
      let leadsDiscovered = Math.max(1, Math.round((dto.intensity / 10) * leadMultiplier));
      let qualityScore = Math.min(100, 55 + Math.round(dto.intensity / 3));
      const scrapeHits: string[] = [];

      if (dto.mode === 'hunt') {
        const scraper = getScraperClient();
        if (scraper.isConfigured()) {
          for (const [platform, url] of Object.entries(PLATFORM_SEED_URLS)) {
            const data = await scraper.scrape({ url, extractLinks: true, javascript: true });
            if (data) {
              scrapeHits.push(platform);
              const links = Array.isArray(data.links) ? data.links.length : 0;
              leadsDiscovered += Math.min(40, Math.floor(links / 5));
            }
          }
          qualityScore = Math.min(100, qualityScore + scrapeHits.length * 8);
        }
      }

      const outputPayload = {
        leadsDiscovered,
        qualityScore,
        estimatedRevenue: estRevenue,
        mode: dto.mode,
        intensity: dto.intensity,
        platforms_scraped: scrapeHits,
        scraper_configured: getScraperClient().isConfigured(),
        idempotency_key: idempotencyKey || null,
      };

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
