import express from 'express';
import request from 'supertest';
import 'express-async-errors';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

let adminSecAuthOn = true;

jest.mock('../../database/connection', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!adminSecAuthOn) {
      const { AuthenticationError } = require('../../utils/errors');
      throw new AuthenticationError('No authentication token provided');
    }
    req.user = {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      role: 'admin',
      email: 'admin@test.com',
    };
    next();
  },
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  adminMutationLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../modules/forge/service/forge-health.service', () => ({
  getForgeHealthDetails: jest.fn().mockResolvedValue({
    vaultPath: null,
    vaultSignal: 'unavailable' as const,
    lastForgeEventAgeMs: null,
    lastForgeEventFresh: null,
  }),
}));

const ADMIN_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Admin module route security (strict GET body)', () => {
  jest.setTimeout(60_000);

  const buildApp = async () => {
    const { AdminModule } = await import('../../modules/admin/admin.module');
    const module = new AdminModule();
    await module.initialize();
    const app = express();
    app.use(express.json());
    app.use('/api/v1/admin', module.router);
    app.use((err: Error & { statusCode?: number; code?: string; details?: unknown }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      if (typeof err.statusCode === 'number' && typeof err.code === 'string') {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      return sendError(res, err.message || 'Error', 500, 'INTERNAL_ERROR');
    });
    return app;
  };

  beforeEach(() => {
    adminSecAuthOn = true;
    jest.resetModules();
  });

  it('returns 401 AUTHENTICATION_ERROR when unauthenticated GET /api/v1/admin/health', async () => {
    adminSecAuthOn = false;
    const app = await buildApp();
    const res = await request(app).get('/api/v1/admin/health');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 AUTHENTICATION_ERROR when unauthenticated POST /api/v1/admin/logs', async () => {
    adminSecAuthOn = false;
    const app = await buildApp();
    const res = await request(app).post('/api/v1/admin/logs').send({
      message: 'Security test log',
      level: 'info',
      category: 'admin',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it.each([
    {
      name: 'GET /api/v1/admin/health',
      exec: (app: express.Application) => request(app).get('/api/v1/admin/health'),
    },
    {
      name: 'GET /api/v1/admin/overview',
      exec: (app: express.Application) => request(app).get('/api/v1/admin/overview'),
    },
    {
      name: 'POST /api/v1/admin/logs',
      exec: (app: express.Application) =>
        request(app)
          .post('/api/v1/admin/logs')
          .send({ message: 'Security test log', level: 'info', category: 'admin' }),
    },
  ])(
    'returns 401 AUTHENTICATION_ERROR when unauthenticated $name even with x-test-role admin header',
    async ({ exec }) => {
      adminSecAuthOn = false;
      const app = await buildApp();
      const res = await exec(app).set('x-test-role', 'admin');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    }
  );

  it.each([
    ['/api/v1/admin/health'],
    ['/api/v1/admin/modules'],
    ['/api/v1/admin/plans'],
    ['/api/v1/admin/phase-gating'],
    ['/api/v1/admin/overview'],
    ['/api/v1/admin/users'],
    ['/api/v1/admin/payments'],
    ['/api/v1/admin/logs'],
    ['/api/v1/admin/phase-gating/timeline'],
    ['/api/v1/admin/workflow/templates/execution-stats'],
    ['/api/v1/admin/onboarding-status'],
    [`/api/v1/admin/onboarding-status/${ADMIN_UUID}`],
  ] as const)('returns 400 VALIDATION_ERROR when GET %s sends a non-empty JSON body', async (path) => {
    const app = await buildApp();
    const res = await request(app)
      .get(path)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ unexpected: true }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows GET /api/v1/admin/health with empty JSON object body', async () => {
    const app = await buildApp();
    const res = await request(app)
      .get('/api/v1/admin/health')
      .set('Content-Type', 'application/json')
      .send('{}');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 VALIDATION_ERROR when GET /overview has unknown query keys (strict)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/v1/admin/overview').query({ extra: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when GET /users has unknown query keys (strict)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/v1/admin/users').query({ page: 1, unknown: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when POST /logs has query params', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/v1/admin/logs')
      .query({ trace: '1' })
      .send({ message: 'Admin test log', level: 'info', category: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when PATCH /users/:id has query params', async () => {
    const app = await buildApp();
    const res = await request(app)
      .patch(`/api/v1/admin/users/${ADMIN_UUID}`)
      .query({ force: '1' })
      .send({ role: 'user' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when POST /users/invite has query params', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/v1/admin/users/invite')
      .query({ notify: '1' })
      .send({ name: 'Test Client', email: 'invite@test.local' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
