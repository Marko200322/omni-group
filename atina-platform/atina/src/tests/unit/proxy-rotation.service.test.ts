import { ProxyRotationService } from '../../modules/proxy-rotation/service/proxy-rotation.service';
import { NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var proxyRotationRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

const mockScraperClient = {
  isConfigured: jest.fn().mockReturnValue(false),
  fetchProxy: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getScraperClient: jest.fn(() => mockScraperClient),
}));

jest.mock('../../modules/proxy-rotation/repository/proxy-rotation.repository', () => {
  proxyRotationRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new' }] }),
    getOwned: jest.fn().mockResolvedValue({
      rows: [{ id: 'sid', config: { pool_size: 4, rotation_index: 1 } }],
    }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    ProxyRotationRepository: jest.fn().mockImplementation(() => proxyRotationRepo),
  };
});

describe('ProxyRotationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScraperClient.isConfigured.mockReturnValue(false);
    proxyRotationRepo.getOwned.mockResolvedValue({
      rows: [{ id: 'sid', config: { pool_size: 4, rotation_index: 1 } }],
    });
    proxyRotationRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
  });

  it('run throws when workspace not found', async () => {
    proxyRotationRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    const service = new ProxyRotationService();
    await expect(service.run('x', 'u1', { mode: 'rotate', intensity: 20 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('run uses pool config and advances rotation index', async () => {
    const service = new ProxyRotationService();
    await service.run('sid', 'u1', { mode: 'health', intensity: 10 });
    expect(proxyRotationRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'proxy-rotation_health',
      expect.objectContaining({
        poolSize: 4,
        rotationIndex: 2,
        nextProxyId: 'px_002',
      })
    );
  });

  it('run tolerates missing config object on row', async () => {
    proxyRotationRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid', config: null }] });
    const service = new ProxyRotationService();
    await service.run('sid', 'u1', { mode: 'rotate', intensity: 20 });
    expect(proxyRotationRepo.createRun).toHaveBeenCalledWith(
      'sid',
      expect.any(String),
      expect.objectContaining({ poolSize: 10, rotationIndex: 1, nextProxyId: 'px_001' })
    );
  });

  it('run uses scraper aggregator proxy id when configured', async () => {
    mockScraperClient.isConfigured.mockReturnValue(true);
    mockScraperClient.fetchProxy.mockResolvedValueOnce({ proxyId: 'remote-px' });
    const service = new ProxyRotationService();
    await service.run('sid', 'u1', { mode: 'rotate', intensity: 20 });
    expect(proxyRotationRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'proxy-rotation_rotate',
      expect.objectContaining({ nextProxyId: 'remote-px' })
    );
  });

  it('status returns validated shape', async () => {
    const service = new ProxyRotationService();
    const s = await service.status();
    expect(s.poolPolicy).toBe('round-robin');
    expect(s.lastRotationAt).toBeNull();
  });
});
