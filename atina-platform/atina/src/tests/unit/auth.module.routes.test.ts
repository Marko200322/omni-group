import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { AuthModule } from '../../modules/auth/auth.module';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

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

jest.mock('../../modules/auth/service/auth.service', () => {
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

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
  passwordResetLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
}));

let authMiddlewareAccept = true;
jest.mock('../../api/middleware/auth.middleware', () => {
  const { AuthenticationError } = require('../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!authMiddlewareAccept) {
        throw new AuthenticationError('No authentication token provided');
      }
      (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
        userId: 'u1',
        role: 'user',
        email: 'a@test.com',
      };
      next();
    },
  };
});

describe('AuthModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new AuthModule();
    await m.initialize();
    app.use('/auth', m.router);
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      return sendError(res, err.message || 'Error', 500);
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    authMiddlewareAccept = true;
    jest.clearAllMocks();
    authServiceMock.register.mockResolvedValue({
      user: { id: 'u1' },
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: '7d',
    });
    authServiceMock.login.mockResolvedValue({
      user: { id: 'u1' },
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: '7d',
    });
    authServiceMock.refreshTokens.mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2', expiresIn: '7d' });
    authServiceMock.logout.mockResolvedValue(undefined);
    authServiceMock.getMe.mockResolvedValue({ id: 'u1', email: 'a@test.com' });
    authServiceMock.forgotPassword.mockResolvedValue('reset-token-dev');
    authServiceMock.resetPassword.mockResolvedValue(undefined);
    authServiceMock.changePassword.mockResolvedValue(undefined);
    authServiceMock.verifyEmail.mockResolvedValue(undefined);
  });

  it('POST /auth/register returns 201 and calls register', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ name: 'Ni', email: 'n@b.com', password: 'P@ssw0rd12' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(authServiceMock.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'n@b.com', name: 'Ni', password: 'P@ssw0rd12' })
    );
  });

  it('POST /auth/login forwards client chain and rememberMe', async () => {
    const res = await request(server)
      .post('/auth/login')
      .set('x-forwarded-for', '203.0.113.1, 10.0.0.1')
      .set('user-agent', 'supertest')
      .send({ email: 'u@b.com', password: 'secret', rememberMe: true });
    expect(res.status).toBe(200);
    expect(authServiceMock.login).toHaveBeenCalledWith(
      'u@b.com',
      'secret',
      '203.0.113.1',
      'supertest',
      true
    );
  });

  it('POST /auth/login returns 401-shaped payload when service rejects invalid credentials', async () => {
    const { AuthenticationError } = await import('../../utils/errors');
    authServiceMock.login.mockRejectedValueOnce(new AuthenticationError('Invalid email or password'));
    const res = await request(server).post('/auth/login').send({ email: 'x@y.com', password: 'bad' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(res.body.error?.message).toBe('Invalid email or password');
    expect(res.body.error?.message).not.toMatch(/password_hash|bcrypt|ECONNREFUSED/i);
  });

  it('POST /auth/refresh propagates invalid token without internal details', async () => {
    const { AuthenticationError } = await import('../../utils/errors');
    authServiceMock.refreshTokens.mockRejectedValueOnce(
      new AuthenticationError('Invalid or expired refresh token')
    );
    const res = await request(server).post('/auth/refresh').send({ refreshToken: 'bad' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(res.body.error?.message).toBe('Invalid or expired refresh token');
  });

  it('POST /auth/logout succeeds without refreshToken body', async () => {
    const res = await request(server).post('/auth/logout').send({});
    expect(res.status).toBe(200);
    expect(authServiceMock.logout).not.toHaveBeenCalled();
  });

  it('GET /auth/me uses authenticate and getMe', async () => {
    const res = await request(server).get('/auth/me');
    expect(res.status).toBe(200);
    expect(authServiceMock.getMe).toHaveBeenCalledWith('u1');
  });

  it('rejects unauthenticated GET /auth/me before getMe', async () => {
    authMiddlewareAccept = false;
    const res = await request(server).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(authServiceMock.getMe).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /auth/change-password before service', async () => {
    authMiddlewareAccept = false;
    const res = await request(server)
      .post('/auth/change-password')
      .send({ currentPassword: 'OldP@ss1', newPassword: 'N3wP@ssword' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(authServiceMock.changePassword).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /auth/me even with x-test-role admin header', async () => {
    authMiddlewareAccept = false;
    const res = await request(server).get('/auth/me').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(authServiceMock.getMe).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /auth/change-password even with x-test-role admin header', async () => {
    authMiddlewareAccept = false;
    const res = await request(server)
      .post('/auth/change-password')
      .set('x-test-role', 'admin')
      .send({ currentPassword: 'OldP@ss1', newPassword: 'N3wP@ssword' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(authServiceMock.changePassword).not.toHaveBeenCalled();
  });

  it('GET /auth/verify-email/:token calls verifyEmail', async () => {
    const res = await request(server).get('/auth/verify-email/tok-abc');
    expect(res.status).toBe(200);
    expect(authServiceMock.verifyEmail).toHaveBeenCalledWith('tok-abc');
  });

  it('POST /auth/register returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/register')
      .query({ invite: '1' })
      .send({ name: 'Ab', email: 'a@b.com', password: 'P@ssw0rd12' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('POST /auth/register returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ name: 'Ab', email: 'a@b.com', password: 'P@ssw0rd12', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('POST /auth/login returns 400 when query params are present', async () => {
    const res = await request(server).post('/auth/login').query({ next: '/dash' }).send({ email: 'u@b.com', password: 'secret' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('POST /auth/refresh returns 400 when query params are present', async () => {
    const res = await request(server).post('/auth/refresh').query({ v: '1' }).send({ refreshToken: 'rt' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.refreshTokens).not.toHaveBeenCalled();
  });

  it('POST /auth/logout returns 400 when query params are present', async () => {
    const res = await request(server).post('/auth/logout').query({ all: '1' }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/logout returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/auth/logout').send({ refreshToken: 'x', hack: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/forgot-password returns 400 when query params are present', async () => {
    const res = await request(server).post('/auth/forgot-password').query({ debug: '1' }).send({ email: 'lost@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.forgotPassword).not.toHaveBeenCalled();
  });

  it('POST /auth/reset-password returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/reset-password')
      .query({ x: '1' })
      .send({ token: 't', password: 'N3wP@ssword' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
  });

  it('POST /auth/change-password returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/change-password')
      .query({ force: '1' })
      .send({ currentPassword: 'OldP@ss1', newPassword: 'N3wP@ssword' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.changePassword).not.toHaveBeenCalled();
  });

  it('GET /auth/me returns 400 when query params are present', async () => {
    const res = await request(server).get('/auth/me').query({ expand: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.getMe).not.toHaveBeenCalled();
  });

  it('GET /auth/me returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/auth/me').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.getMe).not.toHaveBeenCalled();
  });

  it('GET /auth/verify-email/:token returns 400 when query params are present', async () => {
    const res = await request(server).get('/auth/verify-email/tok-abc').query({ raw: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.verifyEmail).not.toHaveBeenCalled();
  });

  it('GET /auth/verify-email/:token returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/auth/verify-email/tok-abc').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.verifyEmail).not.toHaveBeenCalled();
  });
});
