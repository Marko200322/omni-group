import { ProxyRotationService } from '../../../../modules/proxy-rotation/service/proxy-rotation.service';

// eslint-disable-next-line no-var
var proxyRotationRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/proxy-rotation/repository/proxy-rotation.repository', () => {
  proxyRotationRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-edge' }], rowCount: 1 }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    ProxyRotationRepository: jest.fn().mockImplementation(() => proxyRotationRepo),
  };
});

describe('ProxyRotationService (edge cases)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    proxyRotationRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-edge' }], rowCount: 1 });
  });

  it('run treats array config like empty object (default pool size and index)', async () => {
    proxyRotationRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'sid', config: [] as unknown }],
      rowCount: 1,
    });
    const service = new ProxyRotationService();
    await service.run('sid', 'u1', { mode: 'rotate', intensity: 20, revenueEstimate: 75 });

    expect(proxyRotationRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'proxy-rotation_rotate',
      expect.objectContaining({
        poolSize: 10,
        rotationIndex: 1,
        nextProxyId: 'px_001',
        estimatedRevenue: 75,
      })
    );
    expect(proxyRotationRepo.updateAfterRun).toHaveBeenCalledWith(
      'sid',
      75,
      'rotate',
      20,
      1,
      'px_001'
    );
  });

  it('run coerces non-positive numeric pool_size from config to at least 1', async () => {
    proxyRotationRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'sid', config: { pool_size: 0, rotation_index: 0 } }],
      rowCount: 1,
    });
    const service = new ProxyRotationService();
    await service.run('sid', 'u1', { mode: 'health', intensity: 10 });

    expect(proxyRotationRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'proxy-rotation_health',
      expect.objectContaining({
        poolSize: 1,
        rotationIndex: 0,
        nextProxyId: 'px_000',
      })
    );
  });
});
