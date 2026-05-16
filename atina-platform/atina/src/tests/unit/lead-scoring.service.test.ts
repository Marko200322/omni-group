import { LeadScoringService } from '../../modules/lead-scoring/service/lead-scoring.service';
import { ConflictError, NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var leadScoringRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

// eslint-disable-next-line no-var
var ecosystemIdemLs: {
  withEcosystemIdempotencyLock: jest.Mock;
  findRecentEcosystemRunByIdempotencyKey: jest.Mock;
};

jest.mock('../../modules/lead-scoring/repository/lead-scoring.repository', () => {
  leadScoringRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    LeadScoringRepository: jest.fn().mockImplementation(() => leadScoringRepo),
  };
});

jest.mock('../../utils/ecosystem-idempotency', () => {
  ecosystemIdemLs = {
    withEcosystemIdempotencyLock: jest.fn(async (_a: string, _b: string, work: () => Promise<unknown>) => work()),
    findRecentEcosystemRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
  };
  return {
    normalizeEcosystemIdempotencyKey: (raw?: string | null) => (typeof raw === 'string' ? raw.trim() : ''),
    withEcosystemIdempotencyLock: ecosystemIdemLs.withEcosystemIdempotencyLock,
    findRecentEcosystemRunByIdempotencyKey: ecosystemIdemLs.findRecentEcosystemRunByIdempotencyKey,
    ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL: "NOW() - INTERVAL '24 hours'",
  };
});

describe('LeadScoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    leadScoringRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    leadScoringRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    ecosystemIdemLs.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [] });
  });

  it('run throws when workspace not found', async () => {
    leadScoringRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    const service = new LeadScoringService();
    await expect(service.run('x', 'u1', { mode: 'score', intensity: 20 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('run with idempotency stores key and uses advisory lock path', async () => {
    const service = new LeadScoringService();
    await service.run('sid', 'u1', { mode: 'rank', intensity: 50 }, 'key-a');
    expect(ecosystemIdemLs.withEcosystemIdempotencyLock).toHaveBeenCalled();
    expect(leadScoringRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'lead-scoring_rank',
      expect.objectContaining({ idempotency_key: 'key-a', mode: 'rank', intensity: 50 })
    );
  });

  it('idempotent replay skips createRun', async () => {
    const prior = { id: 'old', output_payload: { mode: 'refresh', intensity: 10 } };
    ecosystemIdemLs.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [prior] });
    const service = new LeadScoringService();
    const out = await service.run('sid', 'u1', { mode: 'refresh', intensity: 10 }, 'idem');
    expect(out).toBe(prior);
    expect(leadScoringRepo.createRun).not.toHaveBeenCalled();
  });

  it('idempotency mismatch throws ConflictError', async () => {
    ecosystemIdemLs.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({
      rows: [{ output_payload: { mode: 'score', intensity: 1 } }],
    });
    const service = new LeadScoringService();
    await expect(service.run('sid', 'u1', { mode: 'score', intensity: 2 }, 'k')).rejects.toBeInstanceOf(ConflictError);
  });

  it('idempotency rejects different revenue estimate with same mode and intensity', async () => {
    ecosystemIdemLs.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({
      rows: [{ output_payload: { mode: 'rank', intensity: 40, estimatedRevenue: 120 } }],
    });
    const service = new LeadScoringService();
    await expect(
      service.run('sid', 'u1', { mode: 'rank', intensity: 40, revenueEstimate: 200 }, 'idem-r')
    ).rejects.toBeInstanceOf(ConflictError);
    expect(leadScoringRepo.createRun).not.toHaveBeenCalled();
  });

  it('status returns validated shape', async () => {
    const service = new LeadScoringService();
    const s = await service.status();
    expect(s.presets.length).toBeGreaterThan(0);
    expect(s.scoreRange.max).toBe(100);
  });
});
