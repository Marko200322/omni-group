import { Request, Response } from 'express';

// eslint-disable-next-line no-var
var authServiceMock: {
  register: jest.Mock;
  login: jest.Mock;
  refreshTokens: jest.Mock;
  logout: jest.Mock;
  getMe: jest.Mock;
  forgotPassword: jest.Mock;
  resetPassword: jest.Mock;
  changePassword: jest.Mock;
  verifyEmail: jest.Mock;
};

jest.mock('../../../../modules/auth/service/auth.service', () => {
  authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    verifyEmail: jest.fn(),
  };
  return {
    AuthService: jest.fn().mockImplementation(() => authServiceMock),
  };
});

import { config } from '../../../../config';
import { AuthController } from '../../../../modules/auth/controller/auth.controller';

const originalIsDev = config.app.isDev;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    config.app.isDev = originalIsDev;
    controller = new AuthController();
  });

  afterEach(() => {
    config.app.isDev = originalIsDev;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  it('register passes body to service and returns 201', async () => {
    const payload = { accessToken: 'a', refreshToken: 'r', expiresIn: '15m', user: { id: 'u1', email: 'e@test.com' } };
    authServiceMock.register.mockResolvedValue(payload);
    const r = res();
    const body = { name: 'N', email: 'e@test.com', password: 'Abcd1234' };
    await controller.register({ body } as Request, r);
    expect(authServiceMock.register).toHaveBeenCalledWith(body);
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('login forwards email, password, first x-forwarded-for IP, user-agent, rememberMe', async () => {
    authServiceMock.login.mockResolvedValue({ accessToken: 'a', user: {} });
    const r = res();
    await controller.login(
      {
        body: { email: 'a@b.com', password: 'p', rememberMe: true },
        headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1', 'user-agent': 'jest-agent' },
        socket: { remoteAddress: '::1' },
      } as unknown as Request,
      r
    );
    expect(authServiceMock.login).toHaveBeenCalledWith('a@b.com', 'p', '203.0.113.1', 'jest-agent', true);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('login falls back to socket IP when x-forwarded-for absent', async () => {
    authServiceMock.login.mockResolvedValue({ accessToken: 'a', user: {} });
    const r = res();
    await controller.login(
      {
        body: { email: 'a@b.com', password: 'p' },
        headers: {},
        socket: { remoteAddress: '192.168.1.5' },
      } as unknown as Request,
      r
    );
    expect(authServiceMock.login).toHaveBeenCalledWith('a@b.com', 'p', '192.168.1.5', '', false);
  });

  it('login uses first IP when first x-forwarded-for header line is comma-joined (array)', async () => {
    authServiceMock.login.mockResolvedValue({ accessToken: 'a', user: {} });
    const r = res();
    await controller.login(
      {
        body: { email: 'a@b.com', password: 'p' },
        headers: { 'x-forwarded-for': ['198.51.100.9, 10.0.0.2', '203.0.113.1'] },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request,
      r
    );
    expect(authServiceMock.login).toHaveBeenCalledWith('a@b.com', 'p', '198.51.100.9', '', false);
  });

  it('refreshToken passes refreshToken from body', async () => {
    authServiceMock.refreshTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', expiresIn: '15m' });
    const r = res();
    await controller.refreshToken({ body: { refreshToken: 'rt1' } } as Request, r);
    expect(authServiceMock.refreshTokens).toHaveBeenCalledWith('rt1');
  });

  it('logout does not call service when refreshToken missing', async () => {
    const r = res();
    await controller.logout({ body: {} } as Request, r);
    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('logout calls service when refreshToken present', async () => {
    authServiceMock.logout.mockResolvedValue(undefined);
    const r = res();
    await controller.logout({ body: { refreshToken: 'x' } } as Request, r);
    expect(authServiceMock.logout).toHaveBeenCalledWith('x');
  });

  it('getMe passes userId from req.user', async () => {
    authServiceMock.getMe.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const r = res();
    await controller.getMe({ user: { userId: 'u42' } } as Request, r);
    expect(authServiceMock.getMe).toHaveBeenCalledWith('u42');
  });

  it('forgotPassword includes _devToken when isDev', async () => {
    config.app.isDev = true;
    authServiceMock.forgotPassword.mockResolvedValue('dev-reset-token');
    const r = res();
    await controller.forgotPassword({ body: { email: 'a@b.com' } } as Request, r);
    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith('a@b.com');
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ _devToken: 'dev-reset-token' }),
      })
    );
  });

  it('forgotPassword omits _devToken when not isDev', async () => {
    config.app.isDev = false;
    authServiceMock.forgotPassword.mockResolvedValue('secret-token');
    const r = res();
    await controller.forgotPassword({ body: { email: 'a@b.com' } } as Request, r);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { message: 'If this email exists, a reset link was sent' },
      })
    );
    const payload = (r.json as jest.Mock).mock.calls[0][0] as { data: Record<string, unknown> };
    expect(payload.data).not.toHaveProperty('_devToken');
  });

  it('resetPassword passes token and password', async () => {
    authServiceMock.resetPassword.mockResolvedValue(undefined);
    const r = res();
    await controller.resetPassword({ body: { token: 't1', password: 'Newpass1' } } as Request, r);
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith('t1', 'Newpass1');
  });

  it('changePassword passes userId and passwords', async () => {
    authServiceMock.changePassword.mockResolvedValue(undefined);
    const r = res();
    await controller.changePassword(
      { user: { userId: 'uid' }, body: { currentPassword: 'Oldpass1', newPassword: 'Newpass1' } } as Request,
      r
    );
    expect(authServiceMock.changePassword).toHaveBeenCalledWith('uid', 'Oldpass1', 'Newpass1');
  });

  it('verifyEmail passes token from params', async () => {
    authServiceMock.verifyEmail.mockResolvedValue(undefined);
    const r = res();
    await controller.verifyEmail({ params: { token: 'verify-xyz' } } as unknown as Request, r);
    expect(authServiceMock.verifyEmail).toHaveBeenCalledWith('verify-xyz');
  });
});
