import { UsersService } from '../../../../modules/users/service/users.service';
import { UsersRepository } from '../../../../modules/users/repository/users.repository';
import { NotFoundError, AuthorizationError } from '../../../../utils/errors';

jest.mock('../../../../modules/users/repository/users.repository');

const MockRepo = UsersRepository as jest.MockedClass<typeof UsersRepository>;

const dbUser = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Alice',
  role: 'user',
  company: 'Co',
  phone: '+1',
  avatar_url: 'https://x.com/a.png',
  timezone: 'UTC',
  language: 'en',
  is_active: true,
  is_email_verified: true,
  plan_slug: 'pro',
  plan_name: 'Pro',
  last_login_at: new Date('2026-01-01'),
  created_at: new Date('2025-01-01'),
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService();
    repo = MockRepo.mock.instances[0] as jest.Mocked<UsersRepository>;
  });

  afterAll(() => {
    process.env = { ...envSnapshot };
  });

  describe('getProfile', () => {
    afterEach(() => {
      process.env = { ...envSnapshot };
    });

    it('maps DB row to public shape', async () => {
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'rotate-me-in-prod';
      process.env.JWT_REFRESH_SECRET = 'rotate-refresh-in-prod';
      process.env.DB_PASSWORD = 'not-atina_password';
      process.env.ADMIN_PASSWORD = 'NotAdmin@123456';
      process.env.DB_SSL = 'false';
      process.env.SMTP_ENABLED = 'false';

      repo.findById.mockResolvedValue(dbUser as never);
      const out = await service.getProfile('u1');
      expect(out).toMatchObject({
        id: 'u1',
        email: 'a@b.com',
        planSlug: 'pro',
        isActive: true,
      });
      expect(out).toHaveProperty('prodEnvReadiness');
      expect((out as { prodEnvReadiness: { nodeEnv: string } }).prodEnvReadiness.nodeEnv).toBe('test');
      expect((out as { prodEnvReadiness: { jwtSecretUsesDocumentedPlaceholder: boolean } }).prodEnvReadiness)
        .toMatchObject({ jwtSecretUsesDocumentedPlaceholder: false });
    });

    it('throws when user missing', async () => {
      repo.findById.mockResolvedValue(null as never);
      await expect(service.getProfile('x')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('returns profile after update', async () => {
      repo.update.mockResolvedValue({} as never);
      repo.findById.mockResolvedValue(dbUser as never);
      const out = await service.updateProfile('u1', { name: 'Bob' });
      expect(repo.update).toHaveBeenCalledWith('u1', { name: 'Bob' });
      expect(out.email).toBe('a@b.com');
    });

    it('throws when update affects no row', async () => {
      repo.update.mockResolvedValue(null as never);
      await expect(service.updateProfile('u1', {})).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getUserById', () => {
    it('allows self', async () => {
      repo.findById.mockResolvedValue(dbUser as never);
      await expect(service.getUserById('u1', 'user', 'u1')).resolves.toMatchObject({ id: 'u1' });
    });

    it('allows admin for other id', async () => {
      repo.findById.mockResolvedValue(dbUser as never);
      await expect(service.getUserById('admin', 'admin', 'u1')).resolves.toMatchObject({ id: 'u1' });
    });

    it('denies non-admin viewing others', async () => {
      await expect(service.getUserById('u2', 'user', 'u1')).rejects.toBeInstanceOf(AuthorizationError);
      expect(repo.findById).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('delegates to repository', async () => {
      repo.findAll.mockResolvedValue({ users: [], total: 0 });
      await expect(service.listUsers({ page: 2, limit: 10 })).resolves.toEqual({ users: [], total: 0 });
      expect(repo.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
    });
  });

  describe('deactivateUser', () => {
    it('throws when delete fails', async () => {
      repo.delete.mockResolvedValue(false);
      await expect(service.deactivateUser('u1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('resolves when delete ok', async () => {
      repo.delete.mockResolvedValue(true);
      await expect(service.deactivateUser('u1')).resolves.toBeUndefined();
    });
  });

  describe('getUserStats', () => {
    it('delegates', async () => {
      repo.getUserStats.mockResolvedValue({ tasks: 1 } as never);
      await expect(service.getUserStats('u1')).resolves.toEqual({ tasks: 1 });
    });
  });

  describe('API keys', () => {
    it('createApiKey passes Date when expiresAt set', async () => {
      repo.createApiKey.mockResolvedValue({ key: 'k' } as never);
      await service.createApiKey('u1', {
        name: 'k1',
        permissions: ['read'],
        expiresAt: '2027-01-01T00:00:00.000Z',
      });
      expect(repo.createApiKey).toHaveBeenCalledWith({
        userId: 'u1',
        name: 'k1',
        permissions: ['read'],
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      });
    });

    it('createApiKey omits expiresAt when absent', async () => {
      repo.createApiKey.mockResolvedValue({ key: 'k' } as never);
      await service.createApiKey('u1', { name: 'k1', permissions: ['write'] });
      expect(repo.createApiKey).toHaveBeenCalledWith({
        userId: 'u1',
        name: 'k1',
        permissions: ['write'],
        expiresAt: undefined,
      });
    });

    it('listApiKeys delegates', async () => {
      repo.listApiKeys.mockResolvedValue([] as never);
      await expect(service.listApiKeys('u1')).resolves.toEqual([]);
    });

    it('revokeApiKey throws when not revoked', async () => {
      repo.revokeApiKey.mockResolvedValue(false);
      await expect(service.revokeApiKey('u1', 'kid')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('revokeApiKey resolves when ok', async () => {
      repo.revokeApiKey.mockResolvedValue(true);
      await expect(service.revokeApiKey('u1', 'kid')).resolves.toBeUndefined();
    });
  });

  describe('adminUpdateUser', () => {
    it('throws when update misses', async () => {
      repo.update.mockResolvedValue(null as never);
      await expect(service.adminUpdateUser('u1', { role: 'admin' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('returns profile after admin update', async () => {
      repo.update.mockResolvedValue({} as never);
      repo.findById.mockResolvedValue(dbUser as never);
      const out = await service.adminUpdateUser('u1', { isActive: false });
      expect(out.id).toBe('u1');
    });
  });
});
