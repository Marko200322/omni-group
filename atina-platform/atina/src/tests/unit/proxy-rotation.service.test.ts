import { ConflictError, NotFoundError } from '../../utils/errors';
import { ProxyRotationService } from '../../modules/proxy-rotation/service/proxy-rotation.service';
import * as ecosystemIdempotency from '../../utils/ecosystem-idempotency';

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

jest.mock('../../utils/ecosystem-idempotency', () => {
  const actual = jest.requireActual<typeof import('../../utils/ecosystem-idempotency')>(
    '../../utils/ecosystem-idempotency'
  );
  return {
    ...actual,
    withEcosystemIdempotencyLock: jest.fn(
      async (_systemId: string, _idempotencyKey: string, work: () => Promise<unknown>) => work()
    ),
    findRecentEcosystemRunByIdempotencyKey: jest.fn(),
  };
});

const mockFindRecent = ecosystemIdempotency.findRecentEcosystemRunByIdempotencyKey as jest.MockedFunction<
  typeof ecosystemIdempotency.findRecentEcosystemRunByIdempotencyKey
>;

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
    mockFindRecent.mockResolvedValue({ rows: [], rowCount: 0 });
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
        scraper_used: false,
        idempotency_key: null,
      })
    );
  });

  it('returns existing run when idempotency key matches', async () => {
    const existing = {
      id: 'prior',
      output_payload: { mode: 'health', intensity: 10, idempotency_key: 'idem-px' },
    };
    mockFindRecent.mockResolvedValueOnce({ rows: [existing], rowCount: 1 });
    const service = new ProxyRotationService();
    const result = await service.run('sid', 'u1', { mode: 'health', intensity: 10 }, 'idem-px');
    expect(result).toBe(existing);
    expect(proxyRotationRepo.createRun).not.toHaveBeenCalled();
  });

  it('throws ConflictError when idempotency payload differs', async () => {
    mockFindRecent.mockResolvedValueOnce({
      rows: [{ id: 'prior', output_payload: { mode: 'rotate', intensity: 10 } }],
      rowCount: 1,
    });
    const service = new ProxyRotationService();
    await expect(
      service.run('sid', 'u1', { mode: 'health', intensity: 10 }, 'idem-px')
    ).rejects.toBeInstanceOf(ConflictError);
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
