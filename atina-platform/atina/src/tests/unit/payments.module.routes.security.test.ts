import express from 'express';
import request from 'supertest';
import 'express-async-errors';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

let authEnabled = true;
let adminEnabled = true;

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR'));
    }
    req.user = { userId: 'user-1', role: 'user', email: 'user@atina.io' };
    return next();
  },
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!adminEnabled) {
      return next(new AppError('Insufficient permissions', 403, 'AUTHORIZATION_ERROR'));
    }
    return next();
  },
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => {
  const actual = jest.requireActual<typeof import('../../api/middleware/rate-limit.middleware')>(
    '../../api/middleware/rate-limit.middleware'
  );
  return {
    ...actual,
    paymentsLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
    webhookLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  };
});

jest.mock('../../modules/payments/controller/payments.controller', () => ({
  PaymentsController: jest.fn().mockImplementation(() => ({
    createCheckoutSession: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    stripeWebhook: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    cancelSubscription: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    billingPortal: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    createPayPalOrder: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    capturePayPalOrder: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    createWiseTransfer: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    confirmWisePayment: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    getPaymentHistory: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    getPaymentMethods: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    createManualCheckout: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    markManualPaymentSent: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    confirmManualPayment: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    createKriptomanCheckout: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    kriptomanWebhook: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    syncKriptomanPayment: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    confirmKriptomanPayment: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
  })),
}));

describe('Payments module route security', () => {
  const buildApp = async () => {
    const { PaymentsModule } = await import('../../modules/payments/payments.module');
    const module = new PaymentsModule();
    await module.initialize();
    const app = express();
    app.use(express.json());
    app.use('/payments', module.router);
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
    adminEnabled = true;
    delete process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTH_SESSION_RATE_LIMIT_MAX;
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTH_SESSION_RATE_LIMIT_MAX;
  });

  it.each([
    ['GET', '/payments/history'],
    ['POST', '/payments/stripe/checkout'],
    ['POST', '/payments/stripe/cancel'],
    ['GET', '/payments/stripe/portal'],
    ['POST', '/payments/paypal/order'],
    ['POST', '/payments/paypal/capture/order-abc'],
    ['POST', '/payments/wise/transfer'],
    ['POST', '/payments/wise/confirm/550e8400-e29b-41d4-a716-446655440000'],
  ] as const)('returns 401 for unauthenticated %s %s', async (method, path) => {
    authEnabled = false;
    const app = await buildApp();
    const agent = request(app)[method.toLowerCase() as 'get' | 'post'](path);
    const res =
      method === 'GET'
        ? await agent
        : await agent.send({ planSlug: 'pro', billingCycle: 'monthly' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 for unauthenticated POST /payments/wise/confirm/:id even with x-test-role admin header', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app)
      .post('/payments/wise/confirm/550e8400-e29b-41d4-a716-446655440000')
      .set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 for unauthenticated GET /payments/history even with x-test-role admin header', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/payments/history').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('allows unauthenticated POST /payments/stripe/webhook (signature verified in service)', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).post('/payments/stripe/webhook').send({ type: 'ping' });
    expect(res.status).toBe(200);
  });

  it('allows unauthenticated POST /payments/kriptoman/webhook', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).post('/payments/kriptoman/webhook').send({ status: 'paid' });
    expect(res.status).toBe(200);
  });

  it('returns 403 for non-admin wise confirmation', async () => {
    adminEnabled = false;
    const app = await buildApp();
    const res = await request(app).post('/payments/wise/confirm/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns 400 for invalid wise paymentId param', async () => {
    const app = await buildApp();
    const res = await request(app).post('/payments/wise/confirm/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when POST /payments/wise/confirm/:id sends a non-empty JSON body', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/payments/wise/confirm/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      .send({ note: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid PayPal orderId param', async () => {
    const app = await buildApp();
    const res = await request(app).post('/payments/paypal/capture/not!valid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for GET /payments/history when limit exceeds cap', async () => {
    const app = await buildApp();
    const res = await request(app).get('/payments/history').query({ limit: 200 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for GET /payments/history with unknown query keys', async () => {
    const app = await buildApp();
    const res = await request(app).get('/payments/history').query({ filter: 'all' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 when auth session limiter is exceeded', async () => {
    process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_SESSION_RATE_LIMIT_MAX = '1';
    const app = await buildApp();

    await request(app).get('/payments/history').expect(200);
    const blocked = await request(app).get('/payments/history');

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
