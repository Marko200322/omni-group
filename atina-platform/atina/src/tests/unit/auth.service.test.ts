import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../modules/auth/service/auth.service';
import { AuthRepository } from '../../modules/auth/repository/auth.repository';
import { ConflictError, AuthenticationError, NotFoundError, ValidationError } from '../../utils/errors';
import * as db from '../../database/connection';

jest.mock('../../modules/auth/repository/auth.repository');
jest.mock('../../database/connection');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
    compare: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('jwt-token'),
}));

import logger from '../../utils/logger';

const MockAuthRepository = AuthRepository as jest.MockedClass<typeof AuthRepository>;
const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('AuthService', () => {
  let service: AuthService;
  let mockRepo: jest.Mocked<AuthRepository>;
  let postLoginBootstrapMock: { bootstrapTemplates: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.compare as jest.Mock).mockReset();
    (jwt.sign as jest.Mock).mockReturnValue('jwt-token');
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
    postLoginBootstrapMock = {
      bootstrapTemplates: jest.fn().mockResolvedValue({ totals: { created: 0 } }),
    };
    service = new AuthService({ postLoginBootstrap: postLoginBootstrapMock });
    mockRepo = MockAuthRepository.mock.instances[0] as jest.Mocked<AuthRepository>;
  });

  describe('register', () => {
    it('should throw ConflictError if email already exists', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'existing-id',
        email: 'test@example.com',
        password_hash: 'hash',
        name: 'Existing',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        service.register({ name: 'Test', email: 'test@example.com', password: 'Test@123' })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when email matches existing ignoring case', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'existing-id',
        email: 'test@example.com',
        password_hash: 'hash',
        name: 'Existing',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        service.register({ name: 'Test', email: 'TEST@EXAMPLE.COM', password: 'Test@123' })
      ).rejects.toThrow(ConflictError);
      expect(mockRepo.findUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should create user and return tokens when email is new', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.getStarterPlanId.mockResolvedValue('plan-uuid');
      mockRepo.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        password_hash: 'hashed',
        name: 'New User',
        role: 'user',
        plan_id: 'plan-uuid',
        is_active: true,
        is_email_verified: false,
        email_verification_token: 'token123',
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);

      const result = await service.register({
        name: 'New User',
        email: 'new@example.com',
        password: 'Test@1234',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('new@example.com');
    });

    it('still registers when audit INSERT fails with non-Error rejection', async () => {
      mockQuery.mockRejectedValueOnce('audit string');
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.getStarterPlanId.mockResolvedValue('plan-uuid');
      mockRepo.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'auditstr@example.com',
        password_hash: 'hashed',
        name: 'New User',
        role: 'user',
        plan_id: 'plan-uuid',
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);
      await expect(
        service.register({ name: 'New User', email: 'auditstr@example.com', password: 'Test@1234' })
      ).resolves.toMatchObject({ user: { email: 'auditstr@example.com' } });
    });

    it('still registers when audit INSERT fails after successful bootstrap', async () => {
      mockQuery.mockRejectedValueOnce(new Error('audit db'));
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.getStarterPlanId.mockResolvedValue('plan-uuid');
      mockRepo.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'new2@example.com',
        password_hash: 'hashed',
        name: 'New User',
        role: 'user',
        plan_id: 'plan-uuid',
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);
      await expect(
        service.register({ name: 'New User', email: 'new2@example.com', password: 'Test@1234' })
      ).resolves.toMatchObject({ user: { email: 'new2@example.com' } });
    });

    it('still registers when bootstrapTemplates rejects (Error)', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.getStarterPlanId.mockResolvedValue('plan-uuid');
      mockRepo.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'bootfail@example.com',
        password_hash: 'hashed',
        name: 'New User',
        role: 'user',
        plan_id: 'plan-uuid',
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);
      postLoginBootstrapMock.bootstrapTemplates.mockRejectedValueOnce(new Error('bootstrap down'));

      await expect(
        service.register({ name: 'New User', email: 'bootfail@example.com', password: 'Test@1234' })
      ).resolves.toMatchObject({ user: { email: 'bootfail@example.com' } });
      expect(logger.warn).toHaveBeenCalledWith(
        'Workflow template bootstrap failed after register',
        expect.objectContaining({ userId: 'new-user-id' })
      );
    });

    it('still registers when bootstrapTemplates rejects with non-Error', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.getStarterPlanId.mockResolvedValue('plan-uuid');
      mockRepo.createUser.mockResolvedValue({
        id: 'new-user-id',
        email: 'bootfail2@example.com',
        password_hash: 'hashed',
        name: 'New User',
        role: 'user',
        plan_id: 'plan-uuid',
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);
      postLoginBootstrapMock.bootstrapTemplates.mockRejectedValueOnce('string rejection');

      await expect(
        service.register({ name: 'New User', email: 'bootfail2@example.com', password: 'Test@1234' })
      ).resolves.toMatchObject({ user: { email: 'bootfail2@example.com' } });
    });
  });

  describe('login', () => {
    it('should throw AuthenticationError for non-existent user', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login('nobody@example.com', 'password')
      ).rejects.toThrow(AuthenticationError);
    });

    it('uses the same client-facing message for unknown user and wrong password', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      await expect(service.login('missing@example.com', 'x')).rejects.toThrow(
        expect.objectContaining({ message: 'Invalid email or password' })
      );

      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'uid',
        email: 'user@example.com',
        password_hash: '$2b$12$invalidhash',
        name: 'User',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login('user@example.com', 'wrong')).rejects.toThrow(
        expect.objectContaining({ message: 'Invalid email or password' })
      );
    });

    it('should throw AuthenticationError for wrong password', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'uid',
        email: 'user@example.com',
        password_hash: '$2b$12$invalidhash',
        name: 'User',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        service.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for inactive user', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'uid',
        email: 'inactive@example.com',
        password_hash: 'hash',
        name: 'Inactive',
        role: 'user',
        plan_id: null,
        is_active: false,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        service.login('inactive@example.com', 'any')
      ).rejects.toThrow(AuthenticationError);
    });

    it('returns tokens on valid credentials (returning user)', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'uid',
        email: 'ok@example.com',
        password_hash: '$2b$12$ok',
        name: 'Ok',
        role: 'user',
        plan_id: null,
        plan_slug: 'starter',
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.updateLastLogin.mockResolvedValue(undefined);
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);

      const r = await service.login('ok@example.com', 'Valid@123', '127.0.0.1', 'ua', false);
      expect(r.user.email).toBe('ok@example.com');
      expect(mockRepo.updateLastLogin).toHaveBeenCalled();
    });

    it('runs first-login bootstrap when last_login_at is null', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'uid',
        email: 'first@example.com',
        password_hash: '$2b$12$ok',
        name: 'First',
        role: 'user',
        plan_id: null,
        plan_slug: undefined,
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.updateLastLogin.mockResolvedValue(undefined);
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);

      await service.login('first@example.com', 'Valid@123');
      expect(mockRepo.updateLastLogin).toHaveBeenCalled();
    });

    it('completes login when first-login bootstrap fails', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'uid',
        email: 'firstfail@example.com',
        password_hash: '$2b$12$ok',
        name: 'First',
        role: 'user',
        plan_id: null,
        plan_slug: undefined,
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.updateLastLogin.mockResolvedValue(undefined);
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);
      postLoginBootstrapMock.bootstrapTemplates.mockRejectedValueOnce(new Error('first boot fail'));

      const r = await service.login('firstfail@example.com', 'Valid@123');
      expect(r.user.email).toBe('firstfail@example.com');
      expect(logger.warn).toHaveBeenCalledWith(
        'Workflow template bootstrap failed after first login',
        expect.objectContaining({ userId: 'uid' })
      );
    });

    it('completes login when first-login bootstrap rejects non-Error', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'uid2',
        email: 'firstfail2@example.com',
        password_hash: '$2b$12$ok',
        name: 'First',
        role: 'user',
        plan_id: null,
        plan_slug: undefined,
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.updateLastLogin.mockResolvedValue(undefined);
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);
      postLoginBootstrapMock.bootstrapTemplates.mockRejectedValueOnce(42);

      await expect(service.login('firstfail2@example.com', 'Valid@123')).resolves.toMatchObject({
        user: { email: 'firstfail2@example.com' },
      });
    });

    it('uses 90d refresh when rememberMe is true', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'uid',
        email: 'r@example.com',
        password_hash: '$2b$12$ok',
        name: 'R',
        role: 'user',
        plan_id: null,
        plan_slug: undefined,
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.updateLastLogin.mockResolvedValue(undefined);
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);

      await service.login('r@example.com', 'p', '', '', true);
      expect(mockRepo.saveRefreshToken).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should throw AuthenticationError for invalid refresh token', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(null);

      await expect(
        service.refreshTokens('invalid-token')
      ).rejects.toThrow(AuthenticationError);
    });

    it('rotates tokens when refresh valid', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({
        user_id: 'u1',
        token_hash: 'h',
        expires_at: new Date(),
      } as any);
      mockRepo.findUserById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password_hash: 'p',
        name: 'A',
        role: 'user',
        plan_id: null,
        plan_slug: 'starter',
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.revokeRefreshToken.mockResolvedValue(undefined);
      mockRepo.saveRefreshToken.mockResolvedValue(undefined);

      const t = await service.refreshTokens('some-refresh');
      expect(t.accessToken).toBeDefined();
      expect(mockRepo.revokeRefreshToken).toHaveBeenCalled();
    });

    it('throws when user inactive after refresh lookup', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({ user_id: 'u1' } as any);
      mockRepo.findUserById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password_hash: 'p',
        name: 'A',
        role: 'user',
        plan_id: null,
        is_active: false,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      await expect(service.refreshTokens('rt')).rejects.toThrow(AuthenticationError);
      await expect(service.refreshTokens('rt')).rejects.toThrow(
        expect.objectContaining({ message: 'Invalid or expired refresh token' })
      );
    });

    it('throws generic error when refresh row exists but user was removed', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({ user_id: 'deleted' } as any);
      mockRepo.findUserById.mockResolvedValue(null);
      await expect(service.refreshTokens('rt')).rejects.toThrow(
        expect.objectContaining({ message: 'Invalid or expired refresh token' })
      );
    });
  });

  describe('logout', () => {
    it('revokes refresh token', async () => {
      mockRepo.revokeRefreshToken.mockResolvedValue(undefined);
      await service.logout('refresh');
      expect(mockRepo.revokeRefreshToken).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('returns generic message when user missing', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('none@x.com')).resolves.toContain('If this email exists');
    });

    it('looks up user with normalized email', async () => {
      mockRepo.findUserByEmail.mockResolvedValue(null);
      await service.forgotPassword('  A@B.COM ');
      expect(mockRepo.findUserByEmail).toHaveBeenCalledWith('a@b.com');
    });

    it('sets reset token when user exists', async () => {
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password_hash: 'p',
        name: 'A',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.setPasswordResetToken.mockResolvedValue(undefined);
      const tok = await service.forgotPassword('a@b.com');
      expect(tok.length).toBeGreaterThan(10);
      expect(mockRepo.setPasswordResetToken).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('throws when token invalid', async () => {
      mockRepo.findUserByResetToken.mockResolvedValue(null);
      await expect(service.resetPassword('bad', 'New@123456')).rejects.toThrow(AuthenticationError);
    });

    it('updates password and revokes tokens', async () => {
      mockRepo.findUserByResetToken.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password_hash: 'old',
        name: 'A',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockRepo.updatePassword.mockResolvedValue(undefined);
      mockRepo.revokeAllUserTokens.mockResolvedValue(undefined);
      await service.resetPassword('good-token', 'New@123456');
      expect(mockRepo.updatePassword).toHaveBeenCalledWith('u1', expect.any(String));
      expect(mockRepo.revokeAllUserTokens).toHaveBeenCalledWith('u1');
    });
  });

  describe('changePassword', () => {
    it('throws NotFoundError when user missing', async () => {
      mockRepo.findUserById.mockResolvedValue(null);
      await expect(service.changePassword('id', 'a', 'b')).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when current password wrong', async () => {
      mockRepo.findUserById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password_hash: 'stored',
        name: 'A',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.changePassword('u1', 'wrong', 'New@123456')).rejects.toThrow(ValidationError);
    });

    it('updates when current password matches', async () => {
      mockRepo.findUserById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password_hash: 'stored',
        name: 'A',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRepo.updatePassword.mockResolvedValue(undefined);
      mockRepo.revokeAllUserTokens.mockResolvedValue(undefined);
      await service.changePassword('u1', 'Old@123456', 'New@123456');
      expect(mockRepo.updatePassword).toHaveBeenCalled();
    });

    it('rejects when new password equals current (plain text)', async () => {
      mockRepo.findUserById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password_hash: 'stored',
        name: 'A',
        role: 'user',
        plan_id: null,
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.changePassword('u1', 'Same@123456', 'Same@123456')).rejects.toThrow(
        /differ/i
      );
      expect(mockRepo.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('throws when token invalid', async () => {
      mockRepo.verifyEmail.mockResolvedValue(null);
      await expect(service.verifyEmail('t')).rejects.toThrow(AuthenticationError);
    });

    it('succeeds when repo returns user', async () => {
      mockRepo.verifyEmail.mockResolvedValue({ id: 'u1' } as any);
      await expect(service.verifyEmail('tok')).resolves.toBeUndefined();
    });
  });

  describe('getMe', () => {
    it('throws when user not found', async () => {
      mockRepo.findUserById.mockResolvedValue(null);
      await expect(service.getMe('id')).rejects.toThrow(NotFoundError);
    });

    it('returns profile', async () => {
      mockRepo.findUserById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password_hash: 'p',
        name: 'A',
        role: 'user',
        plan_id: null,
        plan_slug: 'starter',
        is_active: true,
        is_email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      const me = await service.getMe('u1');
      expect(me.email).toBe('a@b.com');
      expect(me.planSlug).toBe('starter');
    });

    it('returns planSlug null when plan_slug is missing', async () => {
      mockRepo.findUserById.mockResolvedValue({
        id: 'u2',
        email: 'b@b.com',
        password_hash: 'p',
        name: 'B',
        role: 'user',
        plan_id: null,
        plan_slug: undefined,
        is_active: true,
        is_email_verified: false,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const me = await service.getMe('u2');
      expect(me.planSlug).toBeNull();
    });
  });
});
