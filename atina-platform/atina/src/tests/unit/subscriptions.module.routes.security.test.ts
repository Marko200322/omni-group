import express from 'express';
import request from 'supertest';
import 'express-async-errors';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

let authEnabled = true;

jest.mock('../../database/connection', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR'));
    }
    req.user = { userId: 'user-1', role: 'user', email: 'user@atina.io' };
    return next();
  },
  requireAdmin: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== 'admin') {
      return next(new AppError('Insufficient permissions', 403, 'AUTHORIZATION_ERROR'));
    }
    return next();
  },
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('Subscriptions module route security', () => {
  const buildApp = async () => {
    const { SubscriptionsModule } = await import('../../modules/subscriptions/subscriptions.module');
    const module = new SubscriptionsModule();
    await module.initialize();
    const app = express();
    app.use(express.json());
    app.use('/subscriptions', module.router);
    app.use((err: Error & { statusCode?: number; code?: string; details?: unknown }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (typeof err.statusCode === 'number' && typeof err.code === 'string') {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      return sendError(res, err.message || 'Error', 500, 'INTERNAL_ERROR');
    });
    return app;
  };

  beforeEach(() => {
    authEnabled = true;
    jest.resetModules();
  });

  it.each([
    ['GET', '/subscriptions'],
    ['GET', '/subscriptions/current'],
    ['GET', '/subscriptions/usage'],
  ] as const)('returns 401 for unauthenticated %s %s', async (method, path) => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app)[method.toLowerCase() as 'get'](path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it.each([['/subscriptions'], ['/subscriptions/current'], ['/subscriptions/usage']] as const)(
    'returns 401 when unauthenticated for %s even with x-test-role admin header',
    async (path) => {
      authEnabled = false;
      const app = await buildApp();
      const res = await request(app).get(path).set('x-test-role', 'admin');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    }
  );

  it('returns 401 when unauthenticated for admin subscriptions list', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/subscriptions/admin/all');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when unauthenticated for admin subscriptions list even with x-test-role admin header', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/subscriptions/admin/all').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 403 for non-admin /subscriptions/admin/all when authenticated', async () => {
    authEnabled = true;
    const app = await buildApp();
    const res = await request(app).get('/subscriptions/admin/all');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when GET /subscriptions sends a non-empty JSON body', async () => {
    authEnabled = true;
    const app = await buildApp();
    const res = await request(app)
      .get('/subscriptions')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ unexpected: true }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when GET /subscriptions/usage sends a non-empty JSON body', async () => {
    authEnabled = true;
    const app = await buildApp();
    const res = await request(app)
      .get('/subscriptions/usage')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ x: 1 }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
