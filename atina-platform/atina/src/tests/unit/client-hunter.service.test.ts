import { ClientHunterService } from '../../modules/client-hunter/service/client-hunter.service';
import { ConflictError, NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var clientHunterRepo: {
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

jest.mock('../../modules/client-hunter/repository/client-hunter.repository', () => {
  clientHunterRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    ClientHunterRepository: jest.fn().mockImplementation(() => clientHunterRepo),
  };
});

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

describe('ClientHunterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clientHunterRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    clientHunterRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    ecosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [] });
  });

  it('run throws NotFoundError when workspace missing', async () => {
    clientHunterRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    const service = new ClientHunterService();
    await expect(service.run('x', 'u1', { mode: 'hunt', intensity: 10 })).rejects.toBeInstanceOf(NotFoundError);
    expect(clientHunterRepo.createRun).not.toHaveBeenCalled();
  });

  it('run without idempotency key executes once', async () => {
    const service = new ClientHunterService();
    await service.run('sid', 'u1', { mode: 'discover', intensity: 30 });
    expect(clientHunterRepo.createRun).toHaveBeenCalledTimes(1);
    expect(ecosystemIdem.withEcosystemIdempotencyLock).not.toHaveBeenCalled();
  });

  it('run with idempotency key uses lock and stores key in payload', async () => {
    const service = new ClientHunterService();
    await service.run('sid', 'u1', { mode: 'nurture', intensity: 40 }, 'idem-1');
    expect(ecosystemIdem.withEcosystemIdempotencyLock).toHaveBeenCalledWith('sid', 'idem-1', expect.any(Function));
    expect(clientHunterRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'client-hunter_nurture',
      expect.objectContaining({
        mode: 'nurture',
        intensity: 40,
        idempotency_key: 'idem-1',
      })
    );
  });

  it('run replays prior idempotent request without creating a new run', async () => {
    const prior = {
      id: 'run-old',
      output_payload: { idempotency_key: 'k1', mode: 'hunt', intensity: 25 },
    };
    ecosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [prior] });
    const service = new ClientHunterService();
    const out = await service.run('sid', 'u1', { mode: 'hunt', intensity: 25 }, 'k1');
    expect(out).toBe(prior);
    expect(clientHunterRepo.createRun).not.toHaveBeenCalled();
    expect(clientHunterRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it('run rejects idempotency key reused with different parameters', async () => {
    ecosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({
      rows: [{ output_payload: { mode: 'hunt', intensity: 10 } }],
    });
    const service = new ClientHunterService();
    await expect(service.run('sid', 'u1', { mode: 'hunt', intensity: 99 }, 'same-key')).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(clientHunterRepo.createRun).not.toHaveBeenCalled();
  });

  it('run rejects idempotency key reused with different revenue estimate', async () => {
    ecosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({
      rows: [{ output_payload: { mode: 'hunt', intensity: 20, estimatedRevenue: 80 } }],
    });
    const service = new ClientHunterService();
    await expect(
      service.run('sid', 'u1', { mode: 'hunt', intensity: 20, revenueEstimate: 90 }, 'idem-rev')
    ).rejects.toBeInstanceOf(ConflictError);
    expect(clientHunterRepo.createRun).not.toHaveBeenCalled();
  });

  it('status returns validated dto', async () => {
    const service = new ClientHunterService();
    const s = await service.status();
    expect(s.strategies).toContain('broad');
    expect(s.pipelineCapacity.maxLeadsPerRun).toBeGreaterThan(0);
  });
});
