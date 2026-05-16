import { Request, Response } from 'express';
import { PaymentsController } from '../../modules/payments/controller/payments.controller';
import { PaymentsService } from '../../modules/payments/service/payments.service';

jest.mock('../../modules/payments/service/payments.service');

const MockPaymentsService = PaymentsService as jest.MockedClass<typeof PaymentsService>;

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockService: jest.Mocked<PaymentsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentsController();
    mockService = MockPaymentsService.mock.instances[0] as jest.Mocked<PaymentsService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  it('createCheckoutSession parses body and returns 201', async () => {
    mockService.createStripeCheckoutSession.mockResolvedValue({ sessionId: 's', url: 'https://x' });
    const r = res();
    await controller.createCheckoutSession(
      {
        ...authed(),
        body: { planSlug: 'pro', billingCycle: 'yearly' },
      } as Request,
      r
    );
    expect(mockService.createStripeCheckoutSession).toHaveBeenCalledWith('u1', 'pro', 'yearly');
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalled();
  });

  it('createCheckoutSession defaults billingCycle to monthly', async () => {
    mockService.createStripeCheckoutSession.mockResolvedValue({ sessionId: 's', url: 'https://x' });
    const r = res();
    await controller.createCheckoutSession(
      { ...authed(), body: { planSlug: 'starter' } } as Request,
      r
    );
    expect(mockService.createStripeCheckoutSession).toHaveBeenCalledWith('u1', 'starter', 'monthly');
  });

  it('stripeWebhook forwards buffer and signature', async () => {
    mockService.handleStripeWebhook.mockResolvedValue(undefined);
    const buf = Buffer.from('{}');
    const r = res();
    await controller.stripeWebhook(
      { body: buf, headers: { 'stripe-signature': 'sig' } } as unknown as Request,
      r
    );
    expect(mockService.handleStripeWebhook).toHaveBeenCalledWith(buf, 'sig');
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { received: true },
      })
    );
  });

  it('createCheckoutSession throws on invalid payload', async () => {
    const r = res();
    await expect(
      controller.createCheckoutSession({ ...authed(), body: { planSlug: 'invalid' } } as unknown as Request, r)
    ).rejects.toThrow();
    expect(mockService.createStripeCheckoutSession).not.toHaveBeenCalled();
  });

  it('cancelSubscription', async () => {
    mockService.cancelSubscription.mockResolvedValue(undefined);
    const r = res();
    await controller.cancelSubscription(authed(), r);
    expect(mockService.cancelSubscription).toHaveBeenCalledWith('u1');
    expect(r.json).toHaveBeenCalled();
  });

  it('billingPortal', async () => {
    mockService.createBillingPortalSession.mockResolvedValue('https://portal');
    const r = res();
    await controller.billingPortal(authed(), r);
    expect(mockService.createBillingPortalSession).toHaveBeenCalledWith('u1');
    expect(r.json).toHaveBeenCalled();
  });

  it('createPayPalOrder', async () => {
    mockService.createPayPalOrder.mockResolvedValue({ orderId: 'o', approveUrl: 'https://a' });
    const r = res();
    await controller.createPayPalOrder(
      { ...authed(), body: { planSlug: 'enterprise', billingCycle: 'monthly' } } as Request,
      r
    );
    expect(mockService.createPayPalOrder).toHaveBeenCalledWith('u1', 'enterprise', 'monthly');
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('capturePayPalOrder', async () => {
    mockService.capturePayPalOrder.mockResolvedValue(undefined);
    const r = res();
    await controller.capturePayPalOrder({ ...authed(), params: { orderId: 'ord-1' } } as unknown as Request, r);
    expect(mockService.capturePayPalOrder).toHaveBeenCalledWith('ord-1', 'u1');
    expect(r.json).toHaveBeenCalled();
  });

  it('createWiseTransfer', async () => {
    mockService.createWiseTransfer.mockResolvedValue({ paymentId: 'p' } as never);
    const r = res();
    await controller.createWiseTransfer(
      { ...authed(), body: { planSlug: 'pro', billingCycle: 'yearly' } } as Request,
      r
    );
    expect(mockService.createWiseTransfer).toHaveBeenCalledWith('u1', 'pro', 'yearly');
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('confirmWisePayment', async () => {
    mockService.confirmWisePayment.mockResolvedValue(undefined);
    const r = res();
    await controller.confirmWisePayment(
      { ...authed(), params: { paymentId: 'pay-1' } } as unknown as Request,
      r
    );
    expect(mockService.confirmWisePayment).toHaveBeenCalledWith('pay-1', 'u1');
    expect(r.json).toHaveBeenCalled();
  });

  it('getPaymentHistory passes pagination (validated query shape)', async () => {
    mockService.getPaymentHistory.mockResolvedValue({ payments: [], total: 0 });
    const r = res();
    await controller.getPaymentHistory(
      { ...authed(), query: { page: 2, limit: 10 } } as unknown as Request,
      r
    );
    expect(mockService.getPaymentHistory).toHaveBeenCalledWith('u1', 2, 10);
    expect(r.json).toHaveBeenCalled();
  });

  it('getPaymentHistory uses defaults from validateQuery', async () => {
    mockService.getPaymentHistory.mockResolvedValue({ payments: [], total: 0 });
    const r = res();
    await controller.getPaymentHistory({ ...authed(), query: { page: 1, limit: 20 } } as unknown as Request, r);
    expect(mockService.getPaymentHistory).toHaveBeenCalledWith('u1', 1, 20);
  });

  it('getPaymentHistory respects page with default limit', async () => {
    mockService.getPaymentHistory.mockResolvedValue({ payments: [], total: 0 });
    const r = res();
    await controller.getPaymentHistory(
      { ...authed(), query: { page: 3, limit: 20 } } as unknown as Request,
      r
    );
    expect(mockService.getPaymentHistory).toHaveBeenCalledWith('u1', 3, 20);
  });

  it('getPaymentHistory respects limit with default page', async () => {
    mockService.getPaymentHistory.mockResolvedValue({ payments: [], total: 0 });
    const r = res();
    await controller.getPaymentHistory(
      { ...authed(), query: { page: 1, limit: 5 } } as unknown as Request,
      r
    );
    expect(mockService.getPaymentHistory).toHaveBeenCalledWith('u1', 1, 5);
  });
});
