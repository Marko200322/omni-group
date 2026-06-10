import { Request, Response } from 'express';
import { PaymentsService } from '../service/payments.service';
import { sendSuccess, sendCreated, paginate } from '../../../utils/response';
import { headerFirst } from '../../../utils/http-headers';
import { z } from 'zod';
import { PaymentHistoryQueryDto } from '../dto/payments.dto';

const DeliverableCheckoutDto = z
  .object({
    deliverableId: z.string().trim().min(2).max(64).regex(/^[a-z0-9_-]+$/),
    industryCategory: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_-]+$/)
      .optional(),
    paymentProvider: z.enum(['manual', 'kriptoman', 'stripe', 'paypal']).optional(),
    marketIntensity: z.number().min(0).max(100).optional(),
    tamEstimateUsd: z.number().finite().optional(),
    competitionScore: z.number().min(0).max(100).optional(),
  })
  .strict();

const CheckoutDto = z
  .object({
    planSlug: z.enum(['starter', 'pro', 'enterprise']),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
    industryCategory: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_-]+$/, 'Invalid industry category slug')
      .optional(),
  })
  .strict();

const KriptomanCheckoutDto = CheckoutDto.extend({
  cryptoCurrency: z.string().min(2).max(12).optional(),
}).strict();

export class PaymentsController {
  private service: PaymentsService;

  constructor() {
    this.service = new PaymentsService();
  }

  // Stripe
  createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    const { planSlug, billingCycle, industryCategory } = CheckoutDto.parse(req.body);
    const result = await this.service.createStripeCheckoutSession(
      req.user!.userId,
      planSlug,
      billingCycle,
      industryCategory,
    );
    sendCreated(res, result, 'Checkout session created');
  };

  stripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const sig = headerFirst(req.headers['stripe-signature']) ?? '';
    await this.service.handleStripeWebhook(req.body as Buffer, sig);
    // Keep legacy top-level "received" field while also returning the standard envelope.
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      data: { received: true },
      received: true,
    });
  };

  cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    await this.service.cancelSubscription(req.user!.userId);
    sendSuccess(res, null, 'Subscription will be canceled at period end');
  };

  billingPortal = async (req: Request, res: Response): Promise<void> => {
    const url = await this.service.createBillingPortalSession(req.user!.userId);
    sendSuccess(res, { url });
  };

  // PayPal
  createPayPalOrder = async (req: Request, res: Response): Promise<void> => {
    const { planSlug, billingCycle, industryCategory } = CheckoutDto.parse(req.body);
    const result = await this.service.createPayPalOrder(
      req.user!.userId,
      planSlug,
      billingCycle,
      industryCategory,
    );
    sendCreated(res, result);
  };

  capturePayPalOrder = async (req: Request, res: Response): Promise<void> => {
    await this.service.capturePayPalOrder(req.params.orderId, req.user!.userId);
    sendSuccess(res, null, 'Payment captured successfully');
  };

  // Wise
  createWiseTransfer = async (req: Request, res: Response): Promise<void> => {
    const { planSlug, billingCycle, industryCategory } = CheckoutDto.parse(req.body);
    const result = await this.service.createWiseTransfer(
      req.user!.userId,
      planSlug,
      billingCycle,
      industryCategory,
    );
    sendCreated(res, result, 'Transfer instructions generated');
  };

  confirmWisePayment = async (req: Request, res: Response): Promise<void> => {
    await this.service.confirmWisePayment(req.params.paymentId, req.user!.userId);
    sendSuccess(res, null, 'Payment confirmed and subscription activated');
  };

  getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as unknown as z.infer<typeof PaymentHistoryQueryDto>;
    const { payments, total } = await this.service.getPaymentHistory(req.user!.userId, page, limit);
    paginate(res, payments, total, page, limit);
  };

  getPaymentMethods = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getPaymentMethods());
  };

  createManualCheckout = async (req: Request, res: Response): Promise<void> => {
    const { planSlug, billingCycle, industryCategory } = CheckoutDto.parse(req.body);
    const result = await this.service.createManualCheckout(
      req.user!.userId,
      planSlug,
      billingCycle,
      industryCategory
    );
    sendCreated(res, result, 'Bank transfer instructions generated');
  };

  createDeliverableManualCheckout = async (req: Request, res: Response): Promise<void> => {
    const body = DeliverableCheckoutDto.parse(req.body);
    const result = await this.service.createDeliverableManualCheckout(req.user!.userId, body);
    sendCreated(res, result, 'Deliverable checkout generated');
  };

  markManualPaymentSent = async (req: Request, res: Response): Promise<void> => {
    await this.service.markManualPaymentSent(req.params.paymentId, req.user!.userId);
    sendSuccess(res, null, 'Payment marked as sent — awaiting admin confirmation');
  };

  confirmManualPayment = async (req: Request, res: Response): Promise<void> => {
    await this.service.confirmPendingPayment(req.params.paymentId, req.user!.userId, 'manual');
    sendSuccess(res, null, 'Payment confirmed and subscription activated');
  };

  createKriptomanCheckout = async (req: Request, res: Response): Promise<void> => {
    const { planSlug, billingCycle, cryptoCurrency, industryCategory } = KriptomanCheckoutDto.parse(req.body);
    const result = await this.service.createKriptomanCheckout(
      req.user!.userId,
      planSlug,
      billingCycle,
      cryptoCurrency,
      industryCategory
    );
    sendCreated(res, result, 'Kriptoman checkout created');
  };

  kriptomanWebhook = async (req: Request, res: Response): Promise<void> => {
    const sig =
      headerFirst(req.headers['x-kriptoman-signature']) ??
      headerFirst(req.headers['x-signature']) ??
      '';
    const raw = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));
    await this.service.handleKriptomanWebhook(raw, sig);
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      data: { received: true },
      received: true,
    });
  };

  syncKriptomanPayment = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.syncKriptomanPayment(
      req.params.paymentId,
      req.user!.userId
    );
    sendSuccess(res, result);
  };

  confirmKriptomanPayment = async (req: Request, res: Response): Promise<void> => {
    await this.service.confirmPendingPayment(req.params.paymentId, req.user!.userId, 'kriptoman');
    sendSuccess(res, null, 'Kriptoman payment confirmed and subscription activated');
  };
}
