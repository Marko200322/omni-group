import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { BillingModule } from '../../modules/billing/billing.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError, NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var billingSvc: {
  getPlans: jest.Mock;
  getPlanBySlug: jest.Mock;
  getUserCurrentSubscription: jest.Mock;
  getUserInvoices: jest.Mock;
  getInvoiceById: jest.Mock;
  checkPlanLimit: jest.Mock;
};

jest.mock('../../modules/billing/service/billing.service', () => {
  billingSvc = {
    getPlans: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Pro', slug: 'pro' }]),
    getPlanBySlug: jest.fn().mockResolvedValue({ id: 'p1', slug: 'pro', name: 'Pro' }),
    getUserCurrentSubscription: jest.fn().mockResolvedValue({ id: 'sub1', plan_name: 'Pro' }),
    getUserInvoices: jest.fn().mockResolvedValue({ invoices: [{ id: 'i1' }], total: 7 }),
    getInvoiceById: jest.fn().mockResolvedValue({ id: 'inv1', amount: 49.99 }),
    checkPlanLimit: jest.fn().mockResolvedValue(true),
  };
  return {
    BillingService: jest.fn().mockImplementation(() => billingSvc),
  };
});

let billingAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!billingAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'u@test.com',
    };
    next();
  },
}));

const SAMPLE_INVOICE_UUID = '123e4567-e89b-12d3-a456-426614174000';
const MISSING_INVOICE_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('BillingModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new BillingModule();
    await m.initialize();
    app.use('/billing', m.router);
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
    billingAuthOn = true;
    jest.clearAllMocks();
    billingSvc.getPlans.mockResolvedValue([{ id: 'p1', name: 'Pro', slug: 'pro' }]);
    billingSvc.getPlanBySlug.mockResolvedValue({ id: 'p1', slug: 'pro', name: 'Pro' });
    billingSvc.getUserCurrentSubscription.mockResolvedValue({ id: 'sub1' });
    billingSvc.getUserInvoices.mockResolvedValue({ invoices: [{ id: 'i1' }], total: 7 });
    billingSvc.getInvoiceById.mockResolvedValue({ id: 'inv1', amount: 49.99 });
    billingSvc.checkPlanLimit.mockResolvedValue(true);
  });

  it('rejects unauthenticated GET /billing/invoices', async () => {
    billingAuthOn = false;
    const res = await request(server).get('/billing/invoices');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(billingSvc.getUserInvoices).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /billing/subscription', async () => {
    billingAuthOn = false;
    const res = await request(server).get('/billing/subscription');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(billingSvc.getUserCurrentSubscription).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /billing/invoices/:id', async () => {
    billingAuthOn = false;
    const res = await request(server).get(`/billing/invoices/${SAMPLE_INVOICE_UUID}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(billingSvc.getInvoiceById).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /billing/limit/:key', async () => {
    billingAuthOn = false;
    const res = await request(server).get('/billing/limit/api_calls');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(billingSvc.checkPlanLimit).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated billing user routes even with x-test-role admin header', async () => {
    billingAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/billing/invoices').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(billingSvc.getUserInvoices).not.toHaveBeenCalled();

    res = await request(server).get('/billing/subscription').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(billingSvc.getUserCurrentSubscription).not.toHaveBeenCalled();

    res = await request(server).get(`/billing/invoices/${SAMPLE_INVOICE_UUID}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(billingSvc.getInvoiceById).not.toHaveBeenCalled();

    res = await request(server).get('/billing/limit/api_calls').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(billingSvc.checkPlanLimit).not.toHaveBeenCalled();
  });

  it('GET /billing/plans', async () => {
    const res = await request(server).get('/billing/plans');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'p1', name: 'Pro', slug: 'pro' }]);
    expect(billingSvc.getPlans).toHaveBeenCalled();
  });

  it('GET /billing/plans/:slug', async () => {
    const res = await request(server).get('/billing/plans/pro');
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('pro');
    expect(billingSvc.getPlanBySlug).toHaveBeenCalledWith('pro', undefined);
  });

  it('GET /billing/plans/:slug returns 400 for invalid slug format', async () => {
    const res = await request(server).get('/billing/plans/pro.invalid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.getPlanBySlug).not.toHaveBeenCalled();
  });

  it('GET /billing/subscription', async () => {
    const res = await request(server).get('/billing/subscription');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 'sub1' });
    expect(billingSvc.getUserCurrentSubscription).toHaveBeenCalledWith('u1');
  });

  it('GET /billing/invoices uses default page and limit', async () => {
    const res = await request(server).get('/billing/invoices');
    expect(res.status).toBe(200);
    expect(billingSvc.getUserInvoices).toHaveBeenCalledWith('u1', 1, 20);
  });

  it('GET /billing/invoices paginates', async () => {
    const res = await request(server).get('/billing/invoices').query({ page: 2, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 5, total: 7 });
    expect(billingSvc.getUserInvoices).toHaveBeenCalledWith('u1', 2, 5);
  });

  it('GET /billing/invoices rejects limit above 100', async () => {
    const res = await request(server).get('/billing/invoices').query({ limit: 101 });
    expect(res.status).toBe(400);
    expect(billingSvc.getUserInvoices).not.toHaveBeenCalled();
  });

  it('GET /billing/invoices rejects unknown query keys (strict)', async () => {
    const res = await request(server).get('/billing/invoices').query({ page: 1, foo: 'bar' });
    expect(res.status).toBe(400);
    expect(billingSvc.getUserInvoices).not.toHaveBeenCalled();
  });

  it('GET /billing/invoices/:id', async () => {
    const res = await request(server).get(`/billing/invoices/${SAMPLE_INVOICE_UUID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('inv1');
    expect(billingSvc.getInvoiceById).toHaveBeenCalledWith(SAMPLE_INVOICE_UUID, 'u1');
  });

  it('GET /billing/invoices/:id returns 400 when id is not a uuid', async () => {
    const res = await request(server).get('/billing/invoices/inv1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.getInvoiceById).not.toHaveBeenCalled();
  });

  it('GET /billing/invoices/:id propagates NotFoundError', async () => {
    billingSvc.getInvoiceById.mockRejectedValueOnce(new NotFoundError('Invoice'));
    const res = await request(server).get(`/billing/invoices/${MISSING_INVOICE_UUID}`);
    expect(res.status).toBe(404);
  });

  it('GET /billing/limit/:key', async () => {
    const res = await request(server).get('/billing/limit/api_calls');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ allowed: true });
    expect(billingSvc.checkPlanLimit).toHaveBeenCalledWith('u1', 'api_calls');
  });

  it('GET /billing/limit/:key returns 400 for invalid key format', async () => {
    const res = await request(server).get('/billing/limit/api%20calls');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.checkPlanLimit).not.toHaveBeenCalled();
  });

  it('GET /billing/plans returns 400 when query params are present', async () => {
    const res = await request(server).get('/billing/plans').query({ lang: 'en' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.getPlans).not.toHaveBeenCalled();
  });

  it('GET /billing/plans returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/billing/plans').send({ extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.getPlans).not.toHaveBeenCalled();
  });

  it('GET /billing/plans/:slug returns 400 when query params are present', async () => {
    const res = await request(server).get('/billing/plans/pro').query({ currency: 'usd' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.getPlanBySlug).not.toHaveBeenCalled();
  });

  it('GET /billing/subscription returns 400 when query params are present', async () => {
    const res = await request(server).get('/billing/subscription').query({ refresh: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.getUserCurrentSubscription).not.toHaveBeenCalled();
  });

  it('GET /billing/invoices uses default page when page is not a number', async () => {
    const res = await request(server).get('/billing/invoices').query({ page: 'nope' });
    expect(res.status).toBe(200);
    expect(billingSvc.getUserInvoices).toHaveBeenCalledWith('u1', 1, 20);
  });

  it('GET /billing/invoices returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/billing/invoices').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.getUserInvoices).not.toHaveBeenCalled();
  });

  it('GET /billing/invoices/:id returns 400 when query params are present', async () => {
    const res = await request(server).get(`/billing/invoices/${SAMPLE_INVOICE_UUID}`).query({ raw: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.getInvoiceById).not.toHaveBeenCalled();
  });

  it('GET /billing/limit/:key returns 400 when query params are present', async () => {
    const res = await request(server).get('/billing/limit/api_calls').query({ peek: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(billingSvc.checkPlanLimit).not.toHaveBeenCalled();
  });
});
