import { FollowUpService } from '../../../../modules/follow-up/service/follow-up.service';
import { ConflictError, NotFoundError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var followUpRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

// eslint-disable-next-line no-var
var ecosystemIdemFu: {
  withEcosystemIdempotencyLock: jest.Mock;
  findRecentEcosystemRunByIdempotencyKey: jest.Mock;
};

jest.mock('../../../../modules/follow-up/repository/follow-up.repository', () => {
  followUpRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    FollowUpRepository: jest.fn().mockImplementation(() => followUpRepo),
  };
});

jest.mock('../../../../utils/ecosystem-idempotency', () => {
  ecosystemIdemFu = {
    withEcosystemIdempotencyLock: jest.fn(async (_a: string, _b: string, work: () => Promise<unknown>) => work()),
    findRecentEcosystemRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
  };
  return {
    normalizeEcosystemIdempotencyKey: (raw?: string | null) => (typeof raw === 'string' ? raw.trim() : ''),
    withEcosystemIdempotencyLock: ecosystemIdemFu.withEcosystemIdempotencyLock,
    findRecentEcosystemRunByIdempotencyKey: ecosystemIdemFu.findRecentEcosystemRunByIdempotencyKey,
    ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL: "NOW() - INTERVAL '24 hours'",
  };
});

describe('FollowUpService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    followUpRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    followUpRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    ecosystemIdemFu.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [] });
  });

  it('run throws NotFoundError when workspace missing', async () => {
    followUpRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    const service = new FollowUpService();
    await expect(service.run('x', 'u1', { mode: 'schedule', intensity: 10 })).rejects.toBeInstanceOf(NotFoundError);
    expect(followUpRepo.createRun).not.toHaveBeenCalled();
  });

  it('run without idempotency key executes once', async () => {
    const service = new FollowUpService();
    await service.run('sid', 'u1', { mode: 'escalate', intensity: 30 });
    expect(followUpRepo.createRun).toHaveBeenCalledTimes(1);
    expect(ecosystemIdemFu.withEcosystemIdempotencyLock).not.toHaveBeenCalled();
  });

  it('run with idempotency key uses lock and stores key in payload', async () => {
    const service = new FollowUpService();
    await service.run('sid', 'u1', { mode: 'digest', intensity: 40 }, 'idem-1');
    expect(ecosystemIdemFu.withEcosystemIdempotencyLock).toHaveBeenCalledWith('sid', 'idem-1', expect.any(Function));
    expect(followUpRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'follow-up_digest',
      expect.objectContaining({
        mode: 'digest',
        intensity: 40,
        idempotency_key: 'idem-1',
      })
    );
  });

  it('run replays prior idempotent request without creating a new run', async () => {
    const prior = {
      id: 'run-old',
      output_payload: { idempotency_key: 'k1', mode: 'schedule', intensity: 25 },
    };
    ecosystemIdemFu.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [prior] });
    const service = new FollowUpService();
    const out = await service.run('sid', 'u1', { mode: 'schedule', intensity: 25 }, 'k1');
    expect(out).toBe(prior);
    expect(followUpRepo.createRun).not.toHaveBeenCalled();
    expect(followUpRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it('run rejects idempotency key reused with different parameters', async () => {
    ecosystemIdemFu.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({
      rows: [{ output_payload: { mode: 'schedule', intensity: 10 } }],
    });
    const service = new FollowUpService();
    await expect(service.run('sid', 'u1', { mode: 'schedule', intensity: 99 }, 'same-key')).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(followUpRepo.createRun).not.toHaveBeenCalled();
  });

  it('status returns validated dto', async () => {
    const service = new FollowUpService();
    const s = await service.status();
    expect(s.cadences).toContain('steady');
    expect(s.pipelineCapacity.maxTouchpointsPerRun).toBeGreaterThan(0);
  });
});
