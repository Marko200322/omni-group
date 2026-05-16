// eslint-disable-next-line no-var
var atinaSystemRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/atina-system/repository/atina-system.repository', () => {
  atinaSystemRepo = {
    listByUser: jest.fn(),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn(),
    updateAfterRun: jest.fn(),
  };
  return {
    AtinaSystemRepository: jest.fn().mockImplementation(() => atinaSystemRepo),
  };
});

import { AtinaSystemService } from '../../../../modules/atina-system/service/atina-system.service';

describe('AtinaSystemService', () => {
  let service: AtinaSystemService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AtinaSystemService();
  });

  describe('list', () => {
    it('returns rows from repository', async () => {
      atinaSystemRepo.listByUser.mockResolvedValue({ rows: [{ id: 'a' }, { id: 'b' }] });
      await expect(service.list('user-1')).resolves.toEqual([{ id: 'a' }, { id: 'b' }]);
      expect(atinaSystemRepo.listByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('create', () => {
    it('returns first inserted row', async () => {
      atinaSystemRepo.create.mockResolvedValue({
        rows: [{ id: 'new', name: 'W' }],
      });
      const dto = { name: 'W', budgetAllocated: 100, operatingMode: 'growth' as const };
      await expect(service.create('u1', dto)).resolves.toEqual({ id: 'new', name: 'W' });
      expect(atinaSystemRepo.create).toHaveBeenCalledWith('u1', 'W', 100, 'growth');
    });
  });

  describe('run', () => {
    beforeEach(() => {
      atinaSystemRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
      atinaSystemRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
      atinaSystemRepo.updateAfterRun.mockResolvedValue({ rows: [] });
    });

    it('throws NotFoundError when workspace not owned', async () => {
      atinaSystemRepo.getOwned.mockResolvedValueOnce({ rows: [] });
      await expect(
        service.run('missing', 'u1', { mode: 'sync', intensity: 10 })
      ).rejects.toMatchObject({ message: 'Atina System workspace not found' });
      expect(atinaSystemRepo.createRun).not.toHaveBeenCalled();
    });

    it('sync mode uses linear throughput, default quality and revenue (branch: else / else)', async () => {
      const out = await service.run('sid', 'u1', { mode: 'sync', intensity: 11 });
      expect(out).toEqual({ id: 'run-1' });
      expect(atinaSystemRepo.createRun).toHaveBeenCalledWith(
        'sid',
        'atina-system_sync',
        expect.objectContaining({
          throughput: 11,
          qualityScore: 78,
          estimatedRevenue: 11,
          mode: 'sync',
          intensity: 11,
        })
      );
      expect(atinaSystemRepo.updateAfterRun).toHaveBeenCalledWith('sid', 11, 'sync', 11);
    });

    it('optimize mode scales throughput x2 and revenue x2 (branch: optimize)', async () => {
      await service.run('sid', 'u1', { mode: 'optimize', intensity: 10 });
      expect(atinaSystemRepo.createRun).toHaveBeenCalledWith(
        'sid',
        'atina-system_optimize',
        expect.objectContaining({
          throughput: 20,
          qualityScore: 86,
          estimatedRevenue: 40,
          mode: 'optimize',
          intensity: 10,
        })
      );
      expect(atinaSystemRepo.updateAfterRun).toHaveBeenCalledWith('sid', 40, 'optimize', 10);
    });

    it('execute mode scales throughput x3 and revenue x4 (branch: execute)', async () => {
      await service.run('sid', 'u1', { mode: 'execute', intensity: 5 });
      expect(atinaSystemRepo.createRun).toHaveBeenCalledWith(
        'sid',
        'atina-system_execute',
        expect.objectContaining({
          throughput: 15,
          qualityScore: 94,
          estimatedRevenue: 60,
          mode: 'execute',
          intensity: 5,
        })
      );
      expect(atinaSystemRepo.updateAfterRun).toHaveBeenCalledWith('sid', 60, 'execute', 5);
    });
  });

  describe('status', () => {
    const envSnapshot = { ...process.env };

    afterEach(() => {
      process.env = { ...envSnapshot };
    });

    it('returns validated status payload and prod env readiness (CEO §G.4)', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_SSL = 'true';
      process.env.JWT_SECRET = 'rotate-me-in-prod';
      process.env.JWT_REFRESH_SECRET = 'rotate-refresh-in-prod';
      process.env.DB_PASSWORD = 'not-atina_password';
      process.env.ADMIN_PASSWORD = 'NotAdmin@123456';
      process.env.SMTP_ENABLED = 'true';
      process.env.SMTP_USER = 'smtp-user';
      process.env.SMTP_PASSWORD = 'smtp-pass';

      const s = await service.status();
      expect(s.providers).toEqual(['core', 'cloud', 'partner']);
      expect(s.nextProvider).toBe('core');
      expect(s.capacity).toEqual({ total: 1000, available: 1000 });
      expect(s.recentEvents).toEqual([]);
      expect(s.prodEnvReadiness).toEqual({
        nodeEnv: 'production',
        isProduction: true,
        dbSsl: true,
        jwtSecretUsesDocumentedPlaceholder: false,
        jwtRefreshSecretUsesDocumentedPlaceholder: false,
        dbPasswordUsesDocumentedPlaceholder: false,
        adminPasswordUsesDocumentedPlaceholder: false,
        smtpEnabled: true,
        smtpHasCredentials: true,
      });
    });

    it('flags documented JWT / DB / admin placeholders and unset SMTP as disabled', async () => {
      delete process.env.NODE_ENV;
      delete process.env.DB_SSL;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.DB_PASSWORD;
      delete process.env.ADMIN_PASSWORD;
      delete process.env.SMTP_ENABLED;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASSWORD;

      const s = await service.status();
      expect(s.prodEnvReadiness.nodeEnv).toBe('development');
      expect(s.prodEnvReadiness.isProduction).toBe(false);
      expect(s.prodEnvReadiness.dbSsl).toBe(false);
      expect(s.prodEnvReadiness.jwtSecretUsesDocumentedPlaceholder).toBe(true);
      expect(s.prodEnvReadiness.jwtRefreshSecretUsesDocumentedPlaceholder).toBe(true);
      expect(s.prodEnvReadiness.dbPasswordUsesDocumentedPlaceholder).toBe(true);
      expect(s.prodEnvReadiness.adminPasswordUsesDocumentedPlaceholder).toBe(true);
      expect(s.prodEnvReadiness.smtpEnabled).toBe(false);
      expect(s.prodEnvReadiness.smtpHasCredentials).toBe(false);
    });
  });
});
