import { Request, Response } from 'express';
import { AuthController } from '../../modules/auth/controller/auth.controller';
import { AuthService } from '../../modules/auth/service/auth.service';

jest.mock('../../modules/auth/service/auth.service');

let mockIsDev = false;
jest.mock('../../config', () => ({
  config: {
    app: {
      get isDev() {
        return mockIsDev;
      },
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test',
      user: 'test',
      password: 'test',
      ssl: false,
      pool: { min: 2, max: 10 },
    },
    autonomy: { enabled: false },
    features: { scraper: false },
    factoryPhase: 'M0',
    prodMode: 'lean',
  },
}));

const MockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('AuthController', () => {
  let controller: AuthController;
  let mockService: jest.Mocked<AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDev = false;
    controller = new AuthController();
    mockService = MockAuthService.mock.instances[0] as jest.Mocked<AuthService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  it('register calls service and sendCreated', async () => {
    mockService.register.mockResolvedValue({ user: {} } as any);
    const r = res();
    await controller.register({ body: { email: 'a@b.com' } } as Request, r);
    expect(mockService.register).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Registration successful' })
    );
  });

  it('login forwards ip and user-agent', async () => {
    mockService.login.mockResolvedValue({} as any);
    const r = res();
    await controller.login(
      {
        body: { email: 'a@b.com', password: 'p', rememberMe: true },
        headers: { 'x-forwarded-for': '10.0.0.1', 'user-agent': 'jest' },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request,
      r
    );
    expect(mockService.login).toHaveBeenCalledWith('a@b.com', 'p', '10.0.0.1', 'jest', true);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Login successful' })
    );
  });

  it('login uses empty ip and user-agent when not provided', async () => {
    mockService.login.mockResolvedValue({} as any);
    const r = res();
    await controller.login(
      {
        body: { email: 'a@b.com', password: 'p' },
        headers: {},
        socket: { remoteAddress: undefined },
      } as unknown as Request,
      r
    );
    expect(mockService.login).toHaveBeenCalledWith('a@b.com', 'p', '', '', false);
  });

  it('login takes first IP from x-forwarded-for chain', async () => {
    mockService.login.mockResolvedValue({} as any);
    const r = res();
    await controller.login(
      {
        body: { email: 'a@b.com', password: 'p' },
        headers: { 'x-forwarded-for': '198.51.100.2, 10.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request,
      r
    );
    expect(mockService.login).toHaveBeenCalledWith('a@b.com', 'p', '198.51.100.2', '', false);
  });

  it('login normalizes array x-forwarded-for and user-agent', async () => {
    mockService.login.mockResolvedValue({} as any);
    const r = res();
    await controller.login(
      {
        body: { email: 'a@b.com', password: 'p' },
        headers: { 'x-forwarded-for': ['172.16.0.5'], 'user-agent': ['jest-agent'] },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request,
      r
    );
    expect(mockService.login).toHaveBeenCalledWith('a@b.com', 'p', '172.16.0.5', 'jest-agent', false);
  });

  it('login takes first IP when first x-forwarded-for header line is comma-joined', async () => {
    mockService.login.mockResolvedValue({} as any);
    const r = res();
    await controller.login(
      {
        body: { email: 'a@b.com', password: 'p' },
        headers: { 'x-forwarded-for': ['198.51.100.9, 10.0.0.2', '203.0.113.1'] },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request,
      r
    );
    expect(mockService.login).toHaveBeenCalledWith('a@b.com', 'p', '198.51.100.9', '', false);
  });

  it('refreshToken', async () => {
    mockService.refreshTokens.mockResolvedValue({ access: 'a' } as any);
    const r = res();
    await controller.refreshToken({ body: { refreshToken: 'rt' } } as Request, r);
    expect(mockService.refreshTokens).toHaveBeenCalledWith('rt');
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Tokens refreshed' })
    );
  });

  it('logout with refreshToken', async () => {
    mockService.logout.mockResolvedValue(undefined);
    const r = res();
    await controller.logout({ body: { refreshToken: 'rt' } } as Request, r);
    expect(mockService.logout).toHaveBeenCalledWith('rt');
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Logged out successfully' })
    );
  });

  it('logout without refreshToken skips service', async () => {
    const r = res();
    await controller.logout({ body: {} } as Request, r);
    expect(mockService.logout).not.toHaveBeenCalled();
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Logged out successfully', data: null })
    );
  });

  it('getMe', async () => {
    mockService.getMe.mockResolvedValue({ id: '1' } as any);
    const r = res();
    await controller.getMe({ user: { userId: 'u1' } } as Request, r);
    expect(mockService.getMe).toHaveBeenCalledWith('u1');
  });

  it('forgotPassword omits _devToken when not in dev', async () => {
    mockIsDev = false;
    mockService.forgotPassword.mockResolvedValue('tok');
    const r = res();
    await controller.forgotPassword({ body: { email: 'a@b.com' } } as Request, r);
    const payload = (r.json as jest.Mock).mock.calls[0][0];
    expect(payload.data).toEqual({
      message: 'If this email exists, a reset link was sent',
    });
    expect(payload.data._devToken).toBeUndefined();
  });

  it('forgotPassword includes _devToken in development', async () => {
    mockIsDev = true;
    mockService.forgotPassword.mockResolvedValue('dev-reset-token');
    const r = res();
    await controller.forgotPassword({ body: { email: 'a@b.com' } } as Request, r);
    const payload = (r.json as jest.Mock).mock.calls[0][0];
    expect(payload.data).toEqual({
      message: 'If this email exists, a reset link was sent',
      _devToken: 'dev-reset-token',
    });
  });

  it('resetPassword', async () => {
    mockService.resetPassword.mockResolvedValue(undefined);
    const r = res();
    await controller.resetPassword({ body: { token: 't', password: 'P@ss1' } } as Request, r);
    expect(mockService.resetPassword).toHaveBeenCalledWith('t', 'P@ss1');
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Password reset successful', data: null })
    );
  });

  it('changePassword', async () => {
    mockService.changePassword.mockResolvedValue(undefined);
    const r = res();
    await controller.changePassword(
      { user: { userId: 'u' }, body: { currentPassword: 'a', newPassword: 'b' } } as Request,
      r
    );
    expect(mockService.changePassword).toHaveBeenCalledWith('u', 'a', 'b');
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Password changed successfully' })
    );
  });

  it('verifyEmail', async () => {
    mockService.verifyEmail.mockResolvedValue(undefined);
    const r = res();
    await controller.verifyEmail({ params: { token: 'vt' } } as unknown as Request, r);
    expect(mockService.verifyEmail).toHaveBeenCalledWith('vt');
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Email verified successfully' })
    );
  });
});
