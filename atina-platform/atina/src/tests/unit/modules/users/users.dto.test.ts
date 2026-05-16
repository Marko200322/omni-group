import {
  UpdateProfileDto,
  CreateApiKeyDto,
  UserQueryDto,
  UsersAdminPatchBodyDto,
} from '../../../../modules/users/dto/users.dto';

describe('users.dto', () => {
  describe('UpdateProfileDto', () => {
    it('accepts partial fields', () => {
      expect(UpdateProfileDto.parse({ name: 'Ab' })).toEqual({ name: 'Ab' });
    });

    it('accepts empty and missing body via preprocess', () => {
      expect(UpdateProfileDto.parse({})).toEqual({});
      expect(UpdateProfileDto.parse(undefined)).toEqual({});
    });

    it('rejects short name', () => {
      expect(() => UpdateProfileDto.parse({ name: 'A' })).toThrow();
    });

    it('rejects invalid avatar URL', () => {
      expect(() => UpdateProfileDto.parse({ avatarUrl: 'not-a-url' })).toThrow();
    });

    it('rejects unknown keys (strict)', () => {
      expect(UpdateProfileDto.safeParse({ name: 'Ab', extra: 1 } as Record<string, unknown>).success).toBe(false);
    });
  });

  describe('CreateApiKeyDto', () => {
    it('defaults permissions to read', () => {
      expect(CreateApiKeyDto.parse({ name: 'k' })).toEqual({
        name: 'k',
        permissions: ['read'],
      });
    });

    it('accepts explicit permissions', () => {
      expect(CreateApiKeyDto.parse({ name: 'k', permissions: ['write', 'admin'] })).toEqual({
        name: 'k',
        permissions: ['write', 'admin'],
      });
    });

    it('rejects invalid permission enum', () => {
      expect(() =>
        CreateApiKeyDto.parse({ name: 'k', permissions: ['read', 'delete'] })
      ).toThrow();
    });

    it('rejects unknown keys (strict)', () => {
      expect(CreateApiKeyDto.safeParse({ name: 'k', scope: 'all' } as Record<string, unknown>).success).toBe(false);
    });
  });

  describe('UserQueryDto', () => {
    it('coerces page and limit with defaults', () => {
      expect(UserQueryDto.parse({})).toMatchObject({ page: 1, limit: 20 });
    });

    it('rejects limit above 100 and unknown keys (strict)', () => {
      expect(UserQueryDto.safeParse({ limit: 101 }).success).toBe(false);
      expect(UserQueryDto.safeParse({ page: 1, sort: 'asc' } as Record<string, unknown>).success).toBe(false);
    });

    it('uses catch(1) for invalid page string', () => {
      const r = UserQueryDto.safeParse({ page: 'not-a-number' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.page).toBe(1);
    });

    it('maps isActive from common query string forms', () => {
      expect(UserQueryDto.parse({ isActive: 'true' })).toMatchObject({ isActive: true });
      expect(UserQueryDto.parse({ isActive: 'TRUE' })).toMatchObject({ isActive: true });
      expect(UserQueryDto.parse({ isActive: '1' })).toMatchObject({ isActive: true });
      expect(UserQueryDto.parse({ isActive: 'false' })).toMatchObject({ isActive: false });
      expect(UserQueryDto.parse({ isActive: 'FALSE' })).toMatchObject({ isActive: false });
      expect(UserQueryDto.parse({ isActive: '0' })).toMatchObject({ isActive: false });
      expect(UserQueryDto.parse({ isActive: true })).toMatchObject({ isActive: true });
      expect(UserQueryDto.parse({ isActive: false })).toMatchObject({ isActive: false });
    });

    it('rejects invalid isActive query value', () => {
      expect(UserQueryDto.safeParse({ isActive: 'maybe' }).success).toBe(false);
    });

    it('accepts role enum', () => {
      expect(UserQueryDto.parse({ role: 'moderator' })).toMatchObject({ role: 'moderator' });
    });

    it('rejects invalid role', () => {
      expect(() => UserQueryDto.parse({ role: 'superuser' })).toThrow();
    });
  });

  describe('UsersAdminPatchBodyDto', () => {
    it('accepts empty body and partial updates', () => {
      expect(UsersAdminPatchBodyDto.safeParse({}).success).toBe(true);
      expect(UsersAdminPatchBodyDto.safeParse(undefined).success).toBe(true);
      expect(UsersAdminPatchBodyDto.parse({ name: 'Ab' })).toMatchObject({ name: 'Ab' });
      expect(UsersAdminPatchBodyDto.parse({ isActive: false })).toMatchObject({ isActive: false });
      expect(
        UsersAdminPatchBodyDto.parse({ planId: '550e8400-e29b-41d4-a716-446655440000' })
      ).toMatchObject({ planId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(UsersAdminPatchBodyDto.parse({ planId: null })).toMatchObject({ planId: null });
    });

    it('rejects unknown keys and short name', () => {
      expect(UsersAdminPatchBodyDto.safeParse({ extra: 1 } as Record<string, unknown>).success).toBe(false);
      expect(UsersAdminPatchBodyDto.safeParse({ name: 'A' }).success).toBe(false);
    });
  });
});
