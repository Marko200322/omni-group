import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  LogoutBodyDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../../../../modules/auth/dto/auth.dto';

const validPassword = 'Abcd1234';

describe('auth DTOs', () => {
  describe('RegisterDto', () => {
    it('parses valid registration', () => {
      const r = RegisterDto.safeParse({
        name: 'Alice',
        email: 'a@example.com',
        password: validPassword,
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.timezone).toBe('UTC');
    });

    it('rejects weak password missing uppercase', () => {
      const r = RegisterDto.safeParse({
        name: 'Alice',
        email: 'a@example.com',
        password: 'abcd1234',
      });
      expect(r.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const r = RegisterDto.safeParse({
        name: 'Alice',
        email: 'not-an-email',
        password: validPassword,
      });
      expect(r.success).toBe(false);
    });

    it('rejects short name', () => {
      const r = RegisterDto.safeParse({
        name: 'A',
        email: 'a@example.com',
        password: validPassword,
      });
      expect(r.success).toBe(false);
    });

    it('normalizes email (trim + lower case)', () => {
      const r = RegisterDto.safeParse({
        name: 'Alice',
        email: '  Alice@Example.COM ',
        password: validPassword,
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.email).toBe('alice@example.com');
    });
  });

  describe('LoginDto', () => {
    it('defaults rememberMe to false', () => {
      const r = LoginDto.safeParse({ email: 'a@b.com', password: 'x' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.rememberMe).toBe(false);
    });

    it('accepts rememberMe true', () => {
      const r = LoginDto.safeParse({ email: 'a@b.com', password: 'x', rememberMe: true });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.rememberMe).toBe(true);
    });

    it('normalizes login email', () => {
      const r = LoginDto.safeParse({ email: '  U@MAIL.IO ', password: 'x' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.email).toBe('u@mail.io');
    });
  });

  describe('RefreshTokenDto', () => {
    it('requires non-empty refreshToken', () => {
      expect(RefreshTokenDto.safeParse({ refreshToken: '' }).success).toBe(false);
      expect(RefreshTokenDto.safeParse({ refreshToken: 't' }).success).toBe(true);
    });
  });

  describe('ForgotPasswordDto', () => {
    it('requires valid email', () => {
      expect(ForgotPasswordDto.safeParse({ email: 'x' }).success).toBe(false);
      expect(ForgotPasswordDto.safeParse({ email: 'ok@example.com' }).success).toBe(true);
    });

    it('normalizes forgot email', () => {
      const r = ForgotPasswordDto.safeParse({ email: '  OK@Example.com ' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.email).toBe('ok@example.com');
    });
  });

  describe('ResetPasswordDto', () => {
    it('rejects password failing complexity', () => {
      const r = ResetPasswordDto.safeParse({ token: 't', password: 'short' });
      expect(r.success).toBe(false);
    });

    it('accepts valid token and password', () => {
      const r = ResetPasswordDto.safeParse({ token: 'tok', password: validPassword });
      expect(r.success).toBe(true);
    });
  });

  describe('ChangePasswordDto', () => {
    it('accepts valid pair', () => {
      const r = ChangePasswordDto.safeParse({
        currentPassword: 'old',
        newPassword: validPassword,
      });
      expect(r.success).toBe(true);
    });
  });

  describe('strict body keys', () => {
    it('rejects unknown keys on auth request DTOs', () => {
      expect(
        RegisterDto.safeParse({
          name: 'Alice',
          email: 'a@example.com',
          password: validPassword,
          extra: 1,
        } as Record<string, unknown>).success
      ).toBe(false);
      expect(LoginDto.safeParse({ email: 'a@b.com', password: 'x', foo: true } as Record<string, unknown>).success).toBe(
        false
      );
      expect(RefreshTokenDto.safeParse({ refreshToken: 't', x: 1 } as Record<string, unknown>).success).toBe(false);
      expect(ForgotPasswordDto.safeParse({ email: 'ok@example.com', a: 1 } as Record<string, unknown>).success).toBe(
        false
      );
      expect(
        ResetPasswordDto.safeParse({ token: 't', password: validPassword, y: 1 } as Record<string, unknown>).success
      ).toBe(false);
      expect(
        ChangePasswordDto.safeParse({
          currentPassword: 'old',
          newPassword: validPassword,
          z: 1,
        } as Record<string, unknown>).success
      ).toBe(false);
    });
  });

  describe('LogoutBodyDto', () => {
    it('accepts empty body, null, undefined, and optional refreshToken', () => {
      expect(LogoutBodyDto.safeParse({}).success).toBe(true);
      expect(LogoutBodyDto.safeParse(null).success).toBe(true);
      expect(LogoutBodyDto.safeParse(undefined).success).toBe(true);
      expect(LogoutBodyDto.safeParse({ refreshToken: 'rt' }).success).toBe(true);
    });

    it('rejects unknown keys and empty refreshToken string', () => {
      expect(LogoutBodyDto.safeParse({ refreshToken: 'rt', other: true } as Record<string, unknown>).success).toBe(false);
      expect(LogoutBodyDto.safeParse({ refreshToken: '' }).success).toBe(false);
    });
  });
});
