import { TitanMasterService } from '../../modules/titan-master/service/titan-master.service';
import { NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var titanMasterRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
  getAdminOverview: jest.Mock;
};

jest.mock('../../modules/titan-master/repository/titan-master.repository', () => {
  titanMasterRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'l1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'created' }] }),
    getOwned: jest.fn(),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'runRow' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    getAdminOverview: jest.fn().mockResolvedValue({ rows: [{ systems: 1 }] }),
  };
  return {
    TitanMasterRepository: jest.fn().mockImplementation(() => titanMasterRepo),
  };
});

describe('TitanMasterService', () => {
  let service: TitanMasterService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TitanMasterService();
  });

  it('list returns rows', async () => {
    const rows = await service.list('u1');
    expect(rows).toEqual([{ id: 'l1' }]);
    expect(titanMasterRepo.listByUser).toHaveBeenCalledWith('u1');
  });

  it('create forwards dto fields', async () => {
    const row = await service.create('u1', {
      name: 'N',
      stage: 'v1',
      budgetAllocated: 100,
      objective: 'Scale',
    });
    expect(row.id).toBe('created');
    expect(titanMasterRepo.create).toHaveBeenCalledWith('u1', 'N', 'v1', 100, 'Scale');
  });

  it('run throws when workspace not found', async () => {
    titanMasterRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(service.run('missing', 'u1', { mode: 'optimize', input: {} })).rejects.toThrow(
      NotFoundError
    );
  });

  it('run normalizes payload and writes audit details', async () => {
    titanMasterRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 's1' }],
      rowCount: 1,
    });

    await service.run('s1', 'u1', { mode: 'expand', input: { x: 1 } });

    expect(titanMasterRepo.createRun).toHaveBeenCalledWith(
      's1',
      'titan_master_expand',
      { x: 1 },
      expect.objectContaining({
        strategy: 'expand',
        projected_gain: 250,
        audit: expect.objectContaining({ normalized: true, mode: 'expand' }),
      })
    );
    expect(titanMasterRepo.updateAfterRun).toHaveBeenCalledWith('s1', 250);
  });

  it.each([
    ['stabilize', 80, 'titan_master_stabilize'],
    ['optimize', 150, 'titan_master_optimize'],
  ] as const)('run mode %s uses projected_gain %i', async (mode, gain, runType) => {
    titanMasterRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    await service.run('s1', 'u1', { mode, input: {} });
    expect(titanMasterRepo.createRun).toHaveBeenCalledWith(
      's1',
      runType,
      {},
      expect.objectContaining({ projected_gain: gain, strategy: mode })
    );
    expect(titanMasterRepo.updateAfterRun).toHaveBeenCalledWith('s1', gain);
  });

  it('run coerces non-object input to empty object for persistence', async () => {
    titanMasterRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    const bad = { mode: 'expand' as const, input: null as unknown as Record<string, unknown> };
    await service.run('s1', 'u1', bad);
    expect(titanMasterRepo.createRun).toHaveBeenCalledWith(
      's1',
      'titan_master_expand',
      {},
      expect.any(Object)
    );

    jest.clearAllMocks();
    titanMasterRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    const arr = { mode: 'expand' as const, input: [] as unknown as Record<string, unknown> };
    await service.run('s1', 'u1', arr);
    expect(titanMasterRepo.createRun).toHaveBeenCalledWith(
      's1',
      'titan_master_expand',
      {},
      expect.any(Object)
    );
  });

  it('adminOverview returns aggregate row', async () => {
    const row = await service.adminOverview();
    expect(row).toEqual({ systems: 1 });
    expect(titanMasterRepo.getAdminOverview).toHaveBeenCalled();
  });
});
