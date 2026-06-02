import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { PaymentsModule } from '../../modules/payments/payments.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';
import { PaymentsService } from '../../modules/payments/service/payments.service';

jest.mock('../../modules/payments/service/payments.service');

let paymentsAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!paymentsAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'u@test.com',
    };
    next();
  },
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  paymentsLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  webhookLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('PaymentsModule HTTP routes', () => {
  let server: http.Server;
  let getPaymentHistorySpy: jest.SpyInstance;
  let createStripeCheckoutSessionSpy: jest.SpyInstance;
  let cancelSubscriptionSpy: jest.SpyInstance;
  let createBillingPortalSessionSpy: jest.SpyInstance;
  let createPayPalOrderSpy: jest.SpyInstance;
  let capturePayPalOrderSpy: jest.SpyInstance;
  let createWiseTransferSpy: jest.SpyInstance;
  let confirmWisePaymentSpy: jest.SpyInstance;
  let getPaymentMethodsSpy: jest.SpyInstance;
  let createManualCheckoutSpy: jest.SpyInstance;
  let markManualPaymentSentSpy: jest.SpyInstance;
  let confirmManualPaymentSpy: jest.SpyInstance;

  const WISE_PAYMENT_UUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new PaymentsModule();
    await m.initialize();
    app.use('/payments', m.router);
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

  beforeEach(() => {
    paymentsAuthOn = true;
    jest.clearAllMocks();
    getPaymentHistorySpy = jest
      .spyOn(PaymentsService.prototype, 'getPaymentHistory')
      .mockResolvedValue({ payments: [], total: 0 });
    createStripeCheckoutSessionSpy = jest
      .spyOn(PaymentsService.prototype, 'createStripeCheckoutSession')
      .mockResolvedValue({ url: 'https://stripe', sessionId: 's' } as never);
    cancelSubscriptionSpy = jest
      .spyOn(PaymentsService.prototype, 'cancelSubscription')
      .mockResolvedValue(undefined);
    createBillingPortalSessionSpy = jest
      .spyOn(PaymentsService.prototype, 'createBillingPortalSession')
      .mockResolvedValue('https://portal');
    createPayPalOrderSpy = jest
      .spyOn(PaymentsService.prototype, 'createPayPalOrder')
      .mockResolvedValue({ id: 'order-1' } as never);
    capturePayPalOrderSpy = jest
      .spyOn(PaymentsService.prototype, 'capturePayPalOrder')
      .mockResolvedValue(undefined);
    createWiseTransferSpy = jest
      .spyOn(PaymentsService.prototype, 'createWiseTransfer')
      .mockResolvedValue({ id: 'wise-1' } as never);
    confirmWisePaymentSpy = jest
      .spyOn(PaymentsService.prototype, 'confirmWisePayment')
      .mockResolvedValue(undefined);
    getPaymentMethodsSpy = jest
      .spyOn(PaymentsService.prototype, 'getPaymentMethods')
      .mockReturnValue({ mode: 'manual', methods: [], manualConfigured: false, note: undefined });
    createManualCheckoutSpy = jest
      .spyOn(PaymentsService.prototype, 'createManualCheckout')
      .mockResolvedValue({ paymentId: 'p-manual', reference: 'ATINA-X', amount: 29, currency: 'EUR', instructions: {} });
    markManualPaymentSentSpy = jest
      .spyOn(PaymentsService.prototype, 'markManualPaymentSent')
      .mockResolvedValue(undefined);
    confirmManualPaymentSpy = jest.spyOn(PaymentsService.prototype, 'confirmPendingPayment').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('rejects unauthenticated GET /payments/history', async () => {
    paymentsAuthOn = false;
    const res = await request(server).get('/payments/history');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(getPaymentHistorySpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /payments/stripe/checkout', async () => {
    paymentsAuthOn = false;
    const res = await request(server)
      .post('/payments/stripe/checkout')
      .send({ planSlug: 'pro', billingCycle: 'monthly' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(createStripeCheckoutSessionSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /payments/stripe/cancel', async () => {
    paymentsAuthOn = false;
    const res = await request(server).post('/payments/stripe/cancel').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(cancelSubscriptionSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /payments/stripe/portal', async () => {
    paymentsAuthOn = false;
    const res = await request(server).get('/payments/stripe/portal');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(createBillingPortalSessionSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /payments/paypal/order', async () => {
    paymentsAuthOn = false;
    const res = await request(server)
      .post('/payments/paypal/order')
      .send({ planSlug: 'pro', billingCycle: 'monthly' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(createPayPalOrderSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /payments/paypal/capture/:orderId', async () => {
    paymentsAuthOn = false;
    const res = await request(server).post('/payments/paypal/capture/order-abc').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(capturePayPalOrderSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /payments/wise/transfer', async () => {
    paymentsAuthOn = false;
    const res = await request(server)
      .post('/payments/wise/transfer')
      .send({ planSlug: 'starter', billingCycle: 'yearly' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(createWiseTransferSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /payments/wise/confirm/:paymentId', async () => {
    paymentsAuthOn = false;
    const res = await request(server).post(`/payments/wise/confirm/${WISE_PAYMENT_UUID}`).send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(confirmWisePaymentSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /payments/wise/confirm/:paymentId even with x-test-role admin header', async () => {
    paymentsAuthOn = false;
    const res = await request(server)
      .post(`/payments/wise/confirm/${WISE_PAYMENT_UUID}`)
      .set('x-test-role', 'admin')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(confirmWisePaymentSpy).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated non-admin payment routes even with x-test-role admin header', async () => {
    paymentsAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/payments/history').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(getPaymentHistorySpy).not.toHaveBeenCalled();

    res = await request(server)
      .post('/payments/stripe/checkout')
      .set(adminHdr)
      .send({ planSlug: 'pro', billingCycle: 'monthly' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(createStripeCheckoutSessionSpy).not.toHaveBeenCalled();

    res = await request(server).post('/payments/stripe/cancel').set(adminHdr).send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(cancelSubscriptionSpy).not.toHaveBeenCalled();

    res = await request(server).get('/payments/stripe/portal').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(createBillingPortalSessionSpy).not.toHaveBeenCalled();

    res = await request(server)
      .post('/payments/paypal/order')
      .set(adminHdr)
      .send({ planSlug: 'pro', billingCycle: 'monthly' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(createPayPalOrderSpy).not.toHaveBeenCalled();

    res = await request(server).post('/payments/paypal/capture/order-abc').set(adminHdr).send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(capturePayPalOrderSpy).not.toHaveBeenCalled();

    res = await request(server)
      .post('/payments/wise/transfer')
      .set(adminHdr)
      .send({ planSlug: 'starter', billingCycle: 'yearly' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(createWiseTransferSpy).not.toHaveBeenCalled();
  });

  it('POST /payments/stripe/checkout returns validation envelope for invalid payload', async () => {
    const res = await request(server).post('/payments/stripe/checkout').send({ planSlug: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed' },
    });
  });

  it('POST /payments/stripe/webhook returns 400 when query params are present', async () => {
    const res = await request(server).post('/payments/stripe/webhook').query({ debug: '1' }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/stripe/cancel returns 400 when query params are present', async () => {
    const res = await request(server).post('/payments/stripe/cancel').query({ force: '1' }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/stripe/cancel returns 400 when body is not empty', async () => {
    const res = await request(server).post('/payments/stripe/cancel').send({ reason: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/stripe/checkout rejects unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/payments/stripe/checkout')
      .send({ planSlug: 'pro', billingCycle: 'monthly', extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/paypal/capture/:orderId returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/payments/paypal/capture/order-abc')
      .query({ sync: '1' })
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/paypal/capture/:orderId returns 400 when body is not empty', async () => {
    const res = await request(server).post('/payments/paypal/capture/order-abc').send({ note: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /payments/history uses default limit and catch-default page when page is not a number', async () => {
    const res = await request(server).get('/payments/history').query({ page: 'bad' });

    expect(res.status).toBe(200);
    expect(getPaymentHistorySpy).toHaveBeenCalledWith('u1', 1, 20);
  });

  it('GET /payments/history returns 400 when limit is out of range', async () => {
    const res = await request(server).get('/payments/history').query({ limit: 101 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /payments/history returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/payments/history').query({ limit: '-10' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /payments/history returns 400 on unknown query keys (strict)', async () => {
    const res = await request(server).get('/payments/history').query({ page: 1, extra: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /payments/stripe/portal returns 400 when query params are present', async () => {
    const res = await request(server).get('/payments/stripe/portal').query({ return: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/paypal/order returns validation envelope for invalid payload', async () => {
    const res = await request(server).post('/payments/paypal/order').send({ planSlug: 'trial' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/paypal/order rejects unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/payments/paypal/order')
      .send({ planSlug: 'pro', billingCycle: 'monthly', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/wise/transfer rejects unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/payments/wise/transfer')
      .send({ planSlug: 'starter', billingCycle: 'yearly', leak: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/paypal/capture/:orderId returns 400 when orderId format is invalid', async () => {
    const res = await request(server).post('/payments/paypal/capture/bad@order').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/wise/confirm/:paymentId returns 400 when paymentId is not a UUID', async () => {
    const res = await request(server).post('/payments/wise/confirm/not-a-uuid').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/wise/confirm/:paymentId returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/payments/wise/confirm/550e8400-e29b-41d4-a716-446655440000')
      .query({ debug: '1' })
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /payments/wise/confirm/:paymentId returns 400 when body is not empty', async () => {
    const res = await request(server)
      .post('/payments/wise/confirm/550e8400-e29b-41d4-a716-446655440000')
      .send({ note: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /payments/methods is public', async () => {
    const res = await request(server).get('/payments/methods');
    expect(res.status).toBe(200);
    expect(getPaymentMethodsSpy).toHaveBeenCalled();
  });

  it('POST /payments/manual/checkout requires auth', async () => {
    paymentsAuthOn = false;
    const res = await request(server)
      .post('/payments/manual/checkout')
      .send({ planSlug: 'pro', billingCycle: 'monthly' });
    expect(res.status).toBe(401);
    expect(createManualCheckoutSpy).not.toHaveBeenCalled();
  });

  it('POST /payments/manual/checkout creates checkout when authed', async () => {
    const res = await request(server)
      .post('/payments/manual/checkout')
      .send({ planSlug: 'pro', billingCycle: 'monthly' });
    expect(res.status).toBe(201);
    expect(createManualCheckoutSpy).toHaveBeenCalledWith('u1', 'pro', 'monthly');
  });
});
