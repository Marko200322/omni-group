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
  forgotPassword: jest.Mock;
  resetPassword: jest.Mock;
  changePassword: jest.Mock;
};

jest.mock('../../modules/auth/service/auth.service', () => {
  authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
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

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'a@test.com',
    };
    next();
  },
}));

describe('AuthModule public POSTs — strict empty query', () => {
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
    authServiceMock.forgotPassword.mockResolvedValue('t');
    authServiceMock.resetPassword.mockResolvedValue(undefined);
    authServiceMock.changePassword.mockResolvedValue(undefined);
  });

  const expectQueryValidation = (res: { status: number; body: { error?: { code?: string } } }) => {
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  };

  it('POST /auth/register returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/register')
      .query({ ref: 'partner' })
      .send({ name: 'Na', email: 'n@test.com', password: 'Abcd1234' });
    expectQueryValidation(res);
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('POST /auth/login returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/login')
      .query({ next: '/dash' })
      .send({ email: 'u@test.com', password: 'secret' });
    expectQueryValidation(res);
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('POST /auth/refresh returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/refresh')
      .query({ v: '1' })
      .send({ refreshToken: 'tok' });
    expectQueryValidation(res);
    expect(authServiceMock.refreshTokens).not.toHaveBeenCalled();
  });

  it('POST /auth/logout returns 400 when query params are present', async () => {
    const res = await request(server).post('/auth/logout').query({ all: '1' }).send({});
    expectQueryValidation(res);
    expect(authServiceMock.logout).not.toHaveBeenCalled();
  });

  it('POST /auth/logout returns 400 when body has unknown keys', async () => {
    const res = await request(server).post('/auth/logout').send({ refreshToken: 'ok', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.logout).not.toHaveBeenCalled();
  });

  it('POST /auth/forgot-password returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/forgot-password')
      .query({ locale: 'sr' })
      .send({ email: 'x@test.com' });
    expectQueryValidation(res);
    expect(authServiceMock.forgotPassword).not.toHaveBeenCalled();
  });

  it('POST /auth/reset-password returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/reset-password')
      .query({ source: 'email' })
      .send({ token: 't', password: 'Abcd1234' });
    expectQueryValidation(res);
    expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
  });

  it('POST /auth/change-password returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/auth/change-password')
      .query({ force: '1' })
      .send({ currentPassword: 'Old12345', newPassword: 'Abcd1234' });
    expectQueryValidation(res);
    expect(authServiceMock.changePassword).not.toHaveBeenCalled();
  });
});
