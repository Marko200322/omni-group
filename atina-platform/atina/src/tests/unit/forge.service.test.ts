import { ForgeService } from '../../modules/forge/service/forge.service';
import { ConflictError, NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var forgeRepo: {
  findRecentRunByIdempotencyKey: jest.Mock;
  createRunAndUpdateWithIdempotency: jest.Mock;
  withIdempotencyLock: jest.Mock;
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

// eslint-disable-next-line no-var
var titanForge: {
  forge: jest.Mock;
  getStatus: jest.Mock;
};

jest.mock('../../modules/forge/repository/forge.repository', () => {
  forgeRepo = {
    findRecentRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
    createRunAndUpdateWithIdempotency: jest.fn().mockResolvedValue({ row: { id: 'run-1' }, reused: false }),
    withIdempotencyLock: jest.fn().mockImplementation(async (_systemId, _key, work) => work()),
    listByUser: jest.fn(),
    create: jest.fn(),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    ForgeRepository: jest.fn().mockImplementation(() => forgeRepo),
  };
});

jest.mock('../../modules/forge/service/titan-forge.service', () => {
  titanForge = {
    forge: jest.fn().mockResolvedValue({
      provider: 'oracle',
      costRsd: 88,
      remainingBudgetRsd: 3912,
      resourceId: 'res_1',
      eventId: 'evt_1',
    }),
    getStatus: jest.fn(),
  };
  return {
    TitanForgeService: jest.fn().mockImplementation(() => titanForge),
  };
});

describe('ForgeService idempotency safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    forgeRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    forgeRepo.findRecentRunByIdempotencyKey.mockResolvedValue({ rows: [] });
    forgeRepo.createRunAndUpdateWithIdempotency.mockResolvedValue({ row: { id: 'run-1' }, reused: false });
    forgeRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    forgeRepo.updateAfterRun.mockResolvedValue({ rowCount: 1 });
  });

  it('stores mode in output payload for idempotent replay checks', async () => {
    const service = new ForgeService();

    await service.run('sid', 'u1', { mode: 'deploy', intensity: 25 }, 'key-1');

    expect(forgeRepo.withIdempotencyLock).toHaveBeenCalledWith('sid', 'key-1', expect.any(Function));
    expect(forgeRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'forge_deploy',
      expect.objectContaining({
        idempotency_key: 'key-1',
        mode: 'deploy',
        intensity: 25,
      })
    );
    expect(forgeRepo.updateAfterRun).toHaveBeenCalledTimes(1);
    expect(titanForge.forge).toHaveBeenCalledTimes(1);
  });

  it('rejects reused idempotency key with different mode/intensity payload', async () => {
    const service = new ForgeService();
    forgeRepo.findRecentRunByIdempotencyKey.mockResolvedValue({
      rows: [{ id: 'run-1', output_payload: { idempotency_key: 'key-1', mode: 'smelt', intensity: 20 } }],
    });

    await expect(service.run('sid', 'u1', { mode: 'deploy', intensity: 25 }, 'key-1')).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(titanForge.forge).not.toHaveBeenCalled();
    expect(forgeRepo.createRun).not.toHaveBeenCalled();
  });

  it('reuses duplicate idempotent requests without spending budget again', async () => {
    const service = new ForgeService();
    const priorRun = { id: 'run-1', output_payload: { idempotency_key: 'key-1', mode: 'deploy', intensity: 25 } };
    forgeRepo.findRecentRunByIdempotencyKey.mockResolvedValue({ rows: [priorRun] });

    const first = await service.run('sid', 'u1', { mode: 'deploy', intensity: 25 }, 'key-1');
    const second = await service.run('sid', 'u1', { mode: 'deploy', intensity: 25 }, 'key-1');

    expect(first).toBe(priorRun);
    expect(second).toBe(priorRun);
    expect(titanForge.forge).toHaveBeenCalledTimes(0);
    expect(forgeRepo.createRun).toHaveBeenCalledTimes(0);
    expect(forgeRepo.updateAfterRun).toHaveBeenCalledTimes(0);
  });
});

describe('ForgeService listing, create, status, and run branches', () => {
  const titanStatus = {
    providers: ['oracle', 'aws', 'azure'] as const,
    nextProvider: 'oracle' as const,
    budgetRsd: { initial: 4000, remaining: 4000, spent: 0 },
    budgetGuard: { minReserveRsd: 0, hardStopMode: false, availableToSpendRsd: 4000 },
    recentEvents: [] as { id: string; provider: 'oracle'; eventType: string; costRsd: number; createdAt: string }[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    forgeRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    forgeRepo.findRecentRunByIdempotencyKey.mockResolvedValue({ rows: [] });
    forgeRepo.createRunAndUpdateWithIdempotency.mockResolvedValue({ row: { id: 'run-1' }, reused: false });
    forgeRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    forgeRepo.updateAfterRun.mockResolvedValue({ rowCount: 1 });
    titanForge.getStatus.mockResolvedValue(titanStatus);
  });

  it('list returns repository rows', async () => {
    forgeRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    const service = new ForgeService();
    await expect(service.list('user-9')).resolves.toEqual([{ id: 'w1' }]);
    expect(forgeRepo.listByUser).toHaveBeenCalledWith('user-9');
  });

  it('create returns first inserted row', async () => {
    forgeRepo.create.mockResolvedValue({ rows: [{ id: 'created' }] });
    const service = new ForgeService();
    const row = await service.create('user-9', {
      name: 'Forge A',
      budgetAllocated: 50,
      operatingMode: 'efficient',
    });
    expect(row).toEqual({ id: 'created' });
    expect(forgeRepo.create).toHaveBeenCalledWith('user-9', 'Forge A', 50, 'efficient');
  });

  it('run throws NotFoundError when workspace is not owned', async () => {
    forgeRepo.getOwned.mockResolvedValue({ rows: [] });
    const service = new ForgeService();
    await expect(service.run('sid', 'u1', { mode: 'smelt', intensity: 25 })).rejects.toBeInstanceOf(NotFoundError);
    expect(forgeRepo.createRunAndUpdateWithIdempotency).not.toHaveBeenCalled();
  });

  it('status returns parsed Titan vault shape', async () => {
    const service = new ForgeService();
    const status = await service.status();
    expect(status.nextProvider).toBe('oracle');
    expect(status.budgetRsd.remaining).toBe(4000);
    expect(titanForge.getStatus).toHaveBeenCalled();
  });

  it('run without idempotency header accepts reused row when payload matches (forge still runs before persist)', async () => {
    const prior = { id: 'r1', output_payload: { mode: 'deploy', intensity: 30 } };
    forgeRepo.createRunAndUpdateWithIdempotency.mockResolvedValue({ row: prior, reused: true });
    const service = new ForgeService();
    await expect(service.run('sid', 'u1', { mode: 'deploy', intensity: 30 })).resolves.toBe(prior);
    expect(titanForge.forge).toHaveBeenCalledTimes(1);
  });

  it('run without idempotency header rejects reused row when payload mismatches', async () => {
    const prior = { id: 'r1', output_payload: { mode: 'smelt', intensity: 30 } };
    forgeRepo.createRunAndUpdateWithIdempotency.mockResolvedValue({ row: prior, reused: true });
    const service = new ForgeService();
    await expect(service.run('sid', 'u1', { mode: 'deploy', intensity: 30 })).rejects.toBeInstanceOf(ConflictError);
  });

  it('run maps deploy, temper, and smelt revenue and stability into payload', async () => {
    const service = new ForgeService();
    await service.run('sid', 'u1', { mode: 'deploy', intensity: 10 });
    expect(forgeRepo.createRunAndUpdateWithIdempotency).toHaveBeenCalledWith(
      'sid',
      'forge_deploy',
      expect.objectContaining({ estimated_revenue: 120, stability: 92, mode: 'deploy' }),
      120,
      'deploy',
      10,
      ''
    );
    await service.run('sid', 'u1', { mode: 'temper', intensity: 10 });
    expect(forgeRepo.createRunAndUpdateWithIdempotency).toHaveBeenLastCalledWith(
      'sid',
      'forge_temper',
      expect.objectContaining({ estimated_revenue: 60, stability: 86, mode: 'temper' }),
      60,
      'temper',
      10,
      ''
    );
    await service.run('sid', 'u1', { mode: 'smelt', intensity: 10 });
    expect(forgeRepo.createRunAndUpdateWithIdempotency).toHaveBeenLastCalledWith(
      'sid',
      'forge_smelt',
      expect.objectContaining({ estimated_revenue: 20, stability: 78, mode: 'smelt' }),
      20,
      'smelt',
      10,
      ''
    );
  });
});
