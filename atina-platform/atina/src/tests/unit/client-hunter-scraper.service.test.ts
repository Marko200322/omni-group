import { ClientHunterService } from '../../modules/client-hunter/service/client-hunter.service';

// eslint-disable-next-line no-var
var hunterRepo: {
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

const mockScraper = {
  isConfigured: jest.fn().mockReturnValue(true),
  scrape: jest.fn().mockResolvedValue({ links: ['a', 'b', 'c', 'd', 'e'] }),
};

const mockLeadDb = {
  isEnrichmentActive: jest.fn().mockReturnValue(false),
  enrichFromHuntContext: jest.fn().mockResolvedValue([]),
  getStatus: jest.fn().mockReturnValue({ phase: 'F0', enabled: false }),
};

jest.mock('../../integrations', () => ({
  getScraperClient: () => mockScraper,
  getLeadDatabaseService: () => mockLeadDb,
}));

jest.mock('../../utils/ecosystem-idempotency', () => ({
  normalizeEcosystemIdempotencyKey: (raw?: string | null) => (typeof raw === 'string' ? raw.trim() : ''),
  withEcosystemIdempotencyLock: async (_a: string, _b: string, work: () => Promise<unknown>) => work(),
  findRecentEcosystemRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
  ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL: "NOW() - INTERVAL '24 hours'",
}));

jest.mock('../../modules/client-hunter/repository/client-hunter.repository', () => {
  hunterRepo = {
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'h1' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    ClientHunterRepository: jest.fn().mockImplementation(() => hunterRepo),
  };
});

describe('ClientHunterService scraper hunt', () => {
  it('aggregates scrape hits on hunt mode', async () => {
    const service = new ClientHunterService();
    await service.run('h1', 'u1', { mode: 'hunt', intensity: 50 });
    const payload = hunterRepo.createRun.mock.calls[0][2] as {
      platforms_scraped: string[];
      leadsDiscovered: number;
    };
    expect(payload.platforms_scraped.length).toBeGreaterThan(0);
    expect(payload.leadsDiscovered).toBeGreaterThan(5);
    expect(mockScraper.scrape).toHaveBeenCalled();
  });
});
