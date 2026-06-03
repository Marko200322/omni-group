import { OutreachService } from '../../modules/outreach/service/outreach.service';
import { ConflictError, NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var outreachRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

// eslint-disable-next-line no-var
var ecosystemIdem: {
  withEcosystemIdempotencyLock: jest.Mock;
  findRecentEcosystemRunByIdempotencyKey: jest.Mock;
};

jest.mock('../../modules/outreach/repository/outreach.repository', () => {
  outreachRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    OutreachRepository: jest.fn().mockImplementation(() => outreachRepo),
  };
});

jest.mock('../../integrations', () => ({
  getCommsClient: () => ({ isConfigured: () => false, request: jest.fn() }),
}));

jest.mock('../../utils/ecosystem-idempotency', () => {
  ecosystemIdem = {
    withEcosystemIdempotencyLock: jest.fn(async (_a: string, _b: string, work: () => Promise<unknown>) => work()),
    findRecentEcosystemRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
  };
  return {
    normalizeEcosystemIdempotencyKey: (raw?: string | null) => (typeof raw === 'string' ? raw.trim() : ''),
    withEcosystemIdempotencyLock: ecosystemIdem.withEcosystemIdempotencyLock,
    findRecentEcosystemRunByIdempotencyKey: ecosystemIdem.findRecentEcosystemRunByIdempotencyKey,
    ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL: "NOW() - INTERVAL '24 hours'",
  };
});

describe('OutreachService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    outreachRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    outreachRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    ecosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [] });
  });

  it('run throws NotFoundError when workspace missing', async () => {
    outreachRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    const service = new OutreachService();
    await expect(service.run('x', 'u1', { mode: 'send', intensity: 10 })).rejects.toBeInstanceOf(NotFoundError);
    expect(outreachRepo.createRun).not.toHaveBeenCalled();
  });

  it('run without idempotency key executes once', async () => {
    const service = new OutreachService();
    await service.run('sid', 'u1', { mode: 'sequence', intensity: 30 });
    expect(outreachRepo.createRun).toHaveBeenCalledTimes(1);
    expect(ecosystemIdem.withEcosystemIdempotencyLock).not.toHaveBeenCalled();
  });

  it('run with idempotency key uses lock and stores key in payload', async () => {
    const service = new OutreachService();
    await service.run('sid', 'u1', { mode: 'ab-test', intensity: 40 }, 'idem-1');
    expect(ecosystemIdem.withEcosystemIdempotencyLock).toHaveBeenCalledWith('sid', 'idem-1', expect.any(Function));
    expect(outreachRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'outreach_ab-test',
      expect.objectContaining({
        mode: 'ab-test',
        intensity: 40,
        idempotency_key: 'idem-1',
      })
    );
  });

  it('run replays prior idempotent request without creating a new run', async () => {
    const prior = {
      id: 'run-old',
      output_payload: { idempotency_key: 'k1', mode: 'send', intensity: 25 },
    };
    ecosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [prior] });
    const service = new OutreachService();
    const out = await service.run('sid', 'u1', { mode: 'send', intensity: 25 }, 'k1');
    expect(out).toBe(prior);
    expect(outreachRepo.createRun).not.toHaveBeenCalled();
    expect(outreachRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it('run rejects idempotency key reused with different parameters', async () => {
    ecosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({
      rows: [{ output_payload: { mode: 'send', intensity: 10 } }],
    });
    const service = new OutreachService();
    await expect(service.run('sid', 'u1', { mode: 'send', intensity: 99 }, 'same-key')).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(outreachRepo.createRun).not.toHaveBeenCalled();
  });

  it('status returns validated dto with channels and dailyCap', async () => {
    const service = new OutreachService();
    const s = await service.status();
    expect(s.channels).toEqual(['email', 'sms', 'linkedin', 'push']);
    expect(s.dailyCap).toBe(500);
  });
});
