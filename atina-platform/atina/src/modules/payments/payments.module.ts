import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { PaymentsController } from './controller/payments.controller';
import { authenticate, requireAdmin, requirePermission } from '../../api/middleware/auth.middleware';
import { authSessionLimiter, paymentsLimiter, webhookLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { z } from 'zod';
import { PaymentHistoryQueryDto } from './dto/payments.dto';

const CheckoutDto = z
  .object({
    planSlug: z.enum(['starter', 'pro', 'enterprise']),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
    currency: z.enum(['EUR', 'USD']).default('EUR'),
    industryCategory: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_-]+$/, 'Invalid industry category slug')
      .optional(),
    buyerCompany: z.string().trim().min(1).max(120).optional(),
    buyerVatId: z.string().trim().min(1).max(64).optional(),
    buyerBillingAddress: z.string().trim().min(1).max(240).optional(),
  })
  .strict();

const KriptomanCheckoutDto = CheckoutDto.extend({
  cryptoCurrency: z.string().min(2).max(12).optional(),
}).strict();

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
    maintenanceTierId: z.enum(['essential', 'professional', 'premium']).optional(),
  })
  .strict();

const OrderIdParamsDto = z
  .object({
    orderId: z.string().trim().min(2).max(120).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid order id format'),
  })
  .strict();

const PaymentIdParamsDto = z
  .object({
    paymentId: z.string().uuid(),
  })
  .strict();

export class PaymentsModule implements IModule {
  name = 'Payments';
  slug = 'payments';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private controller: PaymentsController;

  constructor() {
    this.router = Router();
    this.controller = new PaymentsController();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Stripe
    this.router.post(
      '/stripe/checkout',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CheckoutDto),
      this.controller.createCheckoutSession
    );
    this.router.post('/stripe/webhook', webhookLimiter, validateQuery(StrictEmptyQueryDto), this.controller.stripeWebhook); // raw body set in CoreEngine
    this.router.post(
      '/stripe/cancel',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.cancelSubscription
    );
    this.router.get(
      '/stripe/portal',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.billingPortal
    );

    // PayPal
    this.router.post(
      '/paypal/order',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CheckoutDto),
      this.controller.createPayPalOrder
    );
    this.router.post(
      '/paypal/capture/:orderId',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateParams(OrderIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.capturePayPalOrder
    );

    // Wise
    this.router.post(
      '/wise/transfer',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CheckoutDto),
      this.controller.createWiseTransfer
    );
    this.router.post(
      '/wise/confirm/:paymentId',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      requireAdmin,
      validateParams(PaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.confirmWisePayment
    );

    // Manual bank transfer (bez firme)
    this.router.get(
      '/methods',
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getPaymentMethods
    );
    this.router.post(
      '/manual/checkout',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CheckoutDto),
      this.controller.createManualCheckout
    );
    this.router.post(
      '/stripe/deliverable-checkout',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(DeliverableCheckoutDto),
      this.controller.createDeliverableStripeCheckout
    );
    this.router.post(
      '/manual/deliverable-checkout',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(DeliverableCheckoutDto),
      this.controller.createDeliverableManualCheckout
    );
    this.router.post(
      '/manual/mark-sent/:paymentId',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateParams(PaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.markManualPaymentSent
    );
    this.router.post(
      '/manual/confirm/:paymentId',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      requireAdmin,
      validateParams(PaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.confirmManualPayment
    );

    // Kriptoman (crypto)
    this.router.post(
      '/kriptoman/checkout',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(KriptomanCheckoutDto),
      this.controller.createKriptomanCheckout
    );
    this.router.post(
      '/kriptoman/webhook',
      webhookLimiter,
      validateQuery(StrictEmptyQueryDto),
      this.controller.kriptomanWebhook
    );
    this.router.post(
      '/kriptoman/sync/:paymentId',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      validateParams(PaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.syncKriptomanPayment
    );
    this.router.post(
      '/kriptoman/confirm/:paymentId',
      paymentsLimiter,
      authenticate,
      requirePermission('billing.manage'),
      authSessionLimiter,
      requireAdmin,
      validateParams(PaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.confirmKriptomanPayment
    );

    // History
    this.router.get(
      '/history',
      authenticate,
      requirePermission('billing.read'),
      authSessionLimiter,
      paymentsLimiter,
      validateQuery(PaymentHistoryQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getPaymentHistory
    );
  }
}
