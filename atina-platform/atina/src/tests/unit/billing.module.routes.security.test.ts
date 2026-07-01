import express from 'express';
import request from 'supertest';
import 'express-async-errors';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

let authEnabled = true;

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR'));
    }
    req.user = { userId: 'user-1', role: 'user', email: 'user@atina.io' };
    return next();
  },
  requireAdmin: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'superadmin' && role !== 'operator') {
      return next(new AppError('Admin access required', 403, 'AUTHORIZATION_ERROR'));
    }
    return next();
  },
}));

jest.mock('../../modules/billing/service/billing.service', () => ({
  BillingService: jest.fn().mockImplementation(() => ({
    getPlans: jest.fn().mockResolvedValue([]),
    getPlanBySlug: jest.fn().mockResolvedValue({ slug: 'pro' }),
    getUserCurrentSubscription: jest.fn().mockResolvedValue(null),
    getUserInvoices: jest.fn().mockResolvedValue({ invoices: [], total: 0 }),
    getInvoiceById: jest.fn().mockResolvedValue({ id: 'i1' }),
    checkPlanLimit: jest.fn().mockResolvedValue(true),
  })),
}));

describe('Billing module route security', () => {
  const buildApp = async () => {
    const { BillingModule } = await import('../../modules/billing/billing.module');
    const module = new BillingModule();
    await module.initialize();
    const app = express();
    app.use(express.json());
    app.use('/billing', module.router);
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
    ['GET', '/billing/subscription'],
    ['GET', '/billing/invoices'],
    ['GET', '/billing/invoices/123e4567-e89b-12d3-a456-426614174000'],
    ['GET', '/billing/limit/tasks_per_month'],
    ['GET', '/billing/fulfillment/jobs'],
    ['GET', '/billing/fulfillment/jobs/123e4567-e89b-12d3-a456-426614174000'],
    ['GET', '/billing/fulfillment/jobs/admin'],
  ] as const)('returns 401 for unauthenticated %s %s', async (method, path) => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app)[method.toLowerCase() as 'get'](path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it.each([
    '/billing/subscription',
    '/billing/invoices',
    '/billing/invoices/123e4567-e89b-12d3-a456-426614174000',
    '/billing/limit/tasks_per_month',
  ] as const)(
    'returns 401 when unauthenticated for %s even with x-test-role admin header',
    async (path) => {
      authEnabled = false;
      const app = await buildApp();
      const res = await request(app).get(path).set('x-test-role', 'admin');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    }
  );

  it('allows unauthenticated GET /billing/plans', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/billing/plans');
    expect(res.status).toBe(200);
  });

  it('allows unauthenticated GET /billing/plans/:slug', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/billing/plans/pro');
    expect(res.status).toBe(200);
  });
});
