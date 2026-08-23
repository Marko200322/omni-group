import Stripe from 'stripe';
import axios from 'axios';
import type { PoolClient } from 'pg';
import { config } from '../../../config';
import { PaymentsRepository } from '../repository/payments.repository';
import { PaymentError, NotFoundError } from '../../../utils/errors';
import { getFinanceClient, getKriptomanClient } from '../../../integrations';
import { BillingService } from '../../billing/service/billing.service';
import { getIndustryCategory, getPlanPriceForCategory, resolvePricingTier, type PlanSlug } from '../../billing/lib/category-pricing';
import { getDeliverable } from '../../billing/lib/deliverable-catalog';
import { canCheckoutPackage } from '../../billing/lib/package-delivery-spec';
import { resolvePlanDeliverableId } from '../../billing/lib/plan-deliverable-map';
import {
  calculateDeliverableQuote,
  type PaymentProviderId,
} from '../../billing/lib/dynamic-pricing.engine';
import { PaymentNotificationsService } from './payment-notifications.service';
import { RevenueAllocationService } from '../../billing/service/revenue-allocation.service';
import { DeliverableFulfillmentService } from '../../billing/service/deliverable-fulfillment.service';
import { getSlackNotifier } from '../../../utils/slack-notifier.service';
import logger from '../../../utils/logger';

let stripeClient: Stripe | null = null;

function requireStripe(): Stripe {
  if (!config.stripe.secretKey) {
    throw new PaymentError('Stripe is not configured. Set FINANCE_KEY or use manual payment.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, { apiVersion: '2023-10-16' });
  }
  return stripeClient;
}

function buildTransferReference(userId: string): string {
  const prefix = config.payments.manual.referencePrefix || 'ATINA';
  return `${prefix}-${userId.slice(0, 8).toUpperCase()}-${Date.now()}`;
}

function getManualPaymentConfig() {
  const manual = config.payments.manual;
  const accountName = manual.accountName?.trim() ?? '';
  const iban = manual.iban?.trim() ?? '';
  const bankName = manual.bankName?.trim() ?? '';
  const swift = manual.swift?.trim() ?? '';
  const companyLegalName = manual.companyLegalName?.trim() ?? '';
  const companyTaxId = manual.companyTaxId?.trim() ?? '';
  const companyAddress = manual.companyAddress?.trim() ?? '';
  return {
    accountName,
    iban,
    bankName,
    swift,
    note: manual.note,
    companyLegalName,
    companyTaxId,
    companyAddress,
    configured: Boolean(accountName && iban),
  };
}

function resolveCheckoutAmount(
  plan: { slug: string; price_monthly: number; price_yearly: number },
  billingCycle: 'monthly' | 'yearly',
  industryCategory?: string | null
): number {
  const slug = plan.slug as PlanSlug;
  const list =
    ['starter', 'pro', 'enterprise'].includes(slug) && industryCategory?.trim()
      ? getPlanPriceForCategory(slug, billingCycle, industryCategory)
      : toMoneyNumber(billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly);
  return applyFoundingPromoDiscount(list, industryCategory);
}

function envFlagOn(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isFoundingPromoEnabled(): boolean {
  return envFlagOn(process.env.FOUNDING_CLIENT_PROMO) || envFlagOn(process.env.NEXT_PUBLIC_FOUNDING_CLIENT_PROMO);
}

function foundingDiscountPct(): number {
  const n = Number(
    process.env.FOUNDING_CLIENT_DISCOUNT_PCT || process.env.NEXT_PUBLIC_FOUNDING_CLIENT_DISCOUNT_PCT || 15,
  );
  return Number.isFinite(n) && n > 0 && n < 100 ? n : 15;
}

function isFoundingPromoActive(industryCategory?: string | null): boolean {
  if (!isFoundingPromoEnabled()) return false;
  return resolvePricingTier(industryCategory) !== 'regulated';
}

function applyFoundingPromoDiscount(amount: number, industryCategory?: string | null): number {
  if (!isFoundingPromoActive(industryCategory)) return amount;
  return Math.max(9, Math.round(amount * (1 - foundingDiscountPct() / 100)));
}

function categoryCheckoutLabel(industryCategory?: string | null): string {
  const cat = getIndustryCategory(industryCategory);
  return cat ? ` · ${cat.name}` : '';
}

function toMoneyNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new PaymentError('Invalid plan price');
  }
  return n;
}

function webAppUrl(path: string): string {
  const base = (config.app.webUrl || config.app.url).replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function isPlaceholderStripePriceId(id: string | null | undefined): boolean {
  if (!id?.trim()) return true;
  return ['price_starter', 'price_pro', 'price_enterprise'].includes(id.trim());
}

function resolveStripePriceId(
  plan: { stripe_price_id_monthly?: string | null; stripe_price_id_yearly?: string | null },
  planSlug: string,
  billingCycle: 'monthly' | 'yearly',
): string | null {
  const fromDb =
    billingCycle === 'yearly' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;
  if (!isPlaceholderStripePriceId(fromDb)) return fromDb!;
  const envId = config.stripe.priceIds[planSlug as keyof typeof config.stripe.priceIds];
  if (!isPlaceholderStripePriceId(envId)) return envId;
  return null;
}

function buildTransferInstructions(
  reference: string,
  amount: number,
  currency: string,
  planName: string
): Record<string, string> {
  const manual = getManualPaymentConfig();
  if (!manual.configured) {
    throw new PaymentError('Manual bank transfer details are incomplete. Set MANUAL_PAYMENT_ACCOUNT_NAME and MANUAL_PAYMENT_IBAN.');
  }
  const displayCurrency = currency.toUpperCase();
  const money = toMoneyNumber(amount);
  return {
    accountName: manual.accountName,
    iban: manual.iban,
    bankName: manual.bankName,
    swift: manual.swift,
    reference,
    amount: `${money.toFixed(2)} ${displayCurrency}`,
    plan: planName,
    note: manual.note,
    companyLegalName: manual.companyLegalName || '',
    companyTaxId: manual.companyTaxId || '',
    companyAddress: manual.companyAddress || '',
  };
}
const billingService = new BillingService();
const paymentNotifications = new PaymentNotificationsService();
const revenueAllocation = new RevenueAllocationService();
const deliverableFulfillment = new DeliverableFulfillmentService();

function parsePaymentMetadata(raw: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof raw === 'string') {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  }
  return raw ?? {};
}

function dispatchPaymentSideEffect(task: Promise<void>, label: string): void {
  void task.catch((err: unknown) => {
    logger.warn(`Payment side-effect failed: ${label}`, {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

function dispatchRevenueAllocation(input: {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProviderId;
  metadata: Record<string, unknown>;
}): void {
  const purchaseType = String(input.metadata.purchaseType ?? 'platform_plan');
  dispatchPaymentSideEffect(
    revenueAllocation.allocateConfirmedPayment({
      paymentId: input.paymentId,
      userId: input.userId,
      grossEur: toMoneyNumber(input.amount),
      currency: input.currency,
      paymentProvider: input.provider,
      purchaseType: purchaseType === 'deliverable' ? 'deliverable' : 'platform_plan',
      deliverableId: purchaseType === 'deliverable' ? String(input.metadata.deliverableId ?? '') : null,
      planSlug: String(input.metadata.planSlug ?? '') || null,
      billingCycle: String(input.metadata.billingCycle ?? 'monthly') as 'monthly' | 'yearly' | 'one_time',
      industryCategory:
        typeof input.metadata.industryCategory === 'string' ? input.metadata.industryCategory : null,
      verticalSlug: typeof input.metadata.verticalSlug === 'string' ? input.metadata.verticalSlug : null,
    }).then(() => undefined),
    'revenue_allocation',
  );
}

function dispatchAutoFulfillment(input: {
  paymentId: string;
  userId: string;
  purchaseType: 'deliverable' | 'platform_plan';
  deliverableId?: string | null;
  planSlug?: string | null;
  industryCategory?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
}): void {
  deliverableFulfillment.dispatchAfterPaymentConfirm(input);
}

function dispatchFactoryPhaseAutoEvaluate(): void {
  void import('../../billing/service/factory-phase-auto.service')
    .then(({ factoryPhaseAutoService }) => factoryPhaseAutoService.evaluate({ notify: true }))
    .catch((error) => {
      logger.warn('Factory phase AUTO evaluate after payment failed', { error });
    });
}

/** N3-E1: Stripe may send `subscription` as an id string or an expanded object; DB queries need the id. */
function stripeSubscriptionId(ref: string | Stripe.Subscription | null | undefined): string | null {
  if (ref == null) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

export class PaymentsService {
  private readonly db = new PaymentsRepository();

  // ========================
  // STRIPE
  // ========================

  async createStripeCheckoutSession(
    userId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'yearly',
    industryCategory?: string | null,
  ) {
    const plan = await billingService.getPlanBySlug(planSlug);
    const amountEur = resolveCheckoutAmount(plan, billingCycle, industryCategory);
    const priceId = resolveStripePriceId(plan, planSlug, billingCycle);
    const useDynamicPrice = Boolean(industryCategory?.trim()) || !priceId || isFoundingPromoActive(industryCategory);

    const { rows: userRows } = await this.db.getUserWithStripeCustomer(userId);

    let customerId = userRows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await requireStripe().customers.create({
        email: userRows[0]?.email,
        name: userRows[0]?.name,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = useDynamicPrice
      ? [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `${plan.name}${categoryCheckoutLabel(industryCategory)}`,
              },
              unit_amount: Math.round(amountEur * 100),
              recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
            },
            quantity: 1,
          },
        ]
      : [{ price: priceId!, quantity: 1 }];

    const session = await requireStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${webAppUrl('/dashboard/billing/success')}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: webAppUrl('/dashboard/billing/cancel'),
      metadata: {
        userId,
        planSlug,
        billingCycle,
        industryCategory: industryCategory ?? '',
        ...(isFoundingPromoActive(industryCategory) ? { foundingPromo: '1' } : {}),
      },
      subscription_data: {
        metadata: {
          userId,
          planSlug,
          industryCategory: industryCategory ?? '',
          ...(isFoundingPromoActive(industryCategory) ? { foundingPromo: '1' } : {}),
        },
        trial_period_days: planSlug === 'starter' ? 14 : 0,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async createShopCheckoutSession(input: {
    orderId: string;
    siteSlug: string;
    siteTitle: string;
    ownerUserId: string;
    buyerEmail: string;
    buyerName: string;
    items: Array<{ name: string; priceEur: number; quantity: number }>;
    totalEur: number;
  }): Promise<{ sessionId: string; url: string | null }> {
    const webBase = config.app.webUrl.replace(/\/$/, '');
    const session = await requireStripe().checkout.sessions.create({
      customer_email: input.buyerEmail,
      payment_method_types: ['card'],
      line_items: input.items.map((item) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            description: `${input.siteTitle} — shop order`,
          },
          unit_amount: Math.round(item.priceEur * 100),
        },
        quantity: Math.max(1, item.quantity),
      })),
      mode: 'payment',
      success_url: `${webBase}/sites/${encodeURIComponent(input.siteSlug)}?order=success`,
      cancel_url: `${webBase}/sites/${encodeURIComponent(input.siteSlug)}?order=cancel`,
      metadata: {
        purchaseType: 'shop_order',
        orderId: input.orderId,
        siteSlug: input.siteSlug,
        ownerUserId: input.ownerUserId,
        buyerName: input.buyerName,
      },
    });
    return { sessionId: session.id, url: session.url };
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = requireStripe().webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
    } catch {
      throw new PaymentError('Invalid Stripe webhook signature');
    }

    logger.info('Stripe webhook received', { type: event.type });

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.metadata?.purchaseType === 'shop_order') {
      await this.handleShopOrderCheckoutCompleted(session);
      return;
    }

    if (session.metadata?.purchaseType === 'deliverable' && session.mode === 'payment') {
      await this.handleDeliverableStripeCheckoutCompleted(session);
      return;
    }

    const { userId, planSlug, billingCycle } = session.metadata || {};
    if (!userId || !planSlug) return;

    const plan = await billingService.getPlanBySlug(planSlug);
    const subscriptionRef = stripeSubscriptionId(session.subscription as string | Stripe.Subscription | null);
    if (!subscriptionRef) return;
    const subscription = await requireStripe().subscriptions.retrieve(subscriptionRef);

    await this.db.runInTransaction(async (client) => {
      await this.db.upsertStripeCheckoutSubscription(client, {
        userId,
        planId: plan.id,
        billingCycle: billingCycle || 'monthly',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: session.customer as string,
        periodStart: new Date(subscription.current_period_start * 1000),
        periodEnd: new Date(subscription.current_period_end * 1000),
      });

      await this.db.updateUserPlanId(userId, plan.id, client);
    });

    logger.info('Stripe checkout completed', { userId, planSlug });
  }

  private async handleShopOrderCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;
    const { PublicSiteRepository } = await import('../../public-site/repository/public-site.repository');
    const repo = new PublicSiteRepository();
    await repo.confirmShopOrder(orderId);
    await getSlackNotifier().notify({
      text: `Shop order paid: ${orderId.slice(0, 8)} (${session.metadata?.siteSlug ?? 'site'}) — €${((session.amount_total ?? 0) / 100).toFixed(2)}`,
    });
    logger.info('Shop order confirmed via Stripe', { orderId, sessionId: session.id });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    await this.db.updateSubscriptionFromStripeEvent(subscription);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.db.cancelSubscriptionByStripeId(subscription.id);

    const { rows } = await this.db.getSubscriptionUserIdByStripeId(subscription.id);
    if (rows[0]) {
      const { rows: starter } = await this.db.getPlanIdBySlug('starter');
      if (starter[0]) {
        await this.db.updateUserPlanId(rows[0].user_id, starter[0].id);
      }
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = stripeSubscriptionId(invoice.subscription as string | Stripe.Subscription | null);
    if (!subscriptionId) return;

    const { rows: subRows } = await this.db.getSubscriptionByStripeId(subscriptionId);

    if (!subRows[0]) return;

    const { rows: paymentRows } = await this.db.insertStripeCompletedPayment({
      userId: subRows[0].user_id,
      subscriptionId: subRows[0].id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      stripeInvoiceId: invoice.id,
    });

    const { rows: paidCountRows } = await this.db.countCompletedPaymentsForSubscription(subRows[0].id);
    const completedPaidCount = Number(paidCountRows[0]?.n ?? 0);

    // Create invoice record
    const lineItems = invoice.lines.data.map(line => ({
      description: line.description || 'Subscription',
      amount: line.amount / 100,
      quantity: line.quantity || 1,
    }));

    await billingService.createInvoice({
      userId: subRows[0].user_id,
      subscriptionId: subRows[0].id,
      paymentId: paymentRows[0].id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      lineItems,
      stripeInvoiceId: invoice.id,
    });

    let planSlug =
      typeof invoice.subscription === 'object' && invoice.subscription && 'metadata' in invoice.subscription
        ? String((invoice.subscription as Stripe.Subscription).metadata?.planSlug ?? '')
        : '';
    try {
      const plan = await billingService.getPlanById(subRows[0].plan_id);
      if (!planSlug) planSlug = plan.slug;
      const { rows: userRows } = await this.db.getUserById(subRows[0].user_id);
      const client = userRows[0];
      if (client?.email && invoice.amount_paid > 0) {
        const periodStart = invoice.lines.data[0]?.period?.start
          ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = invoice.lines.data[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
          : new Date().toISOString();
        dispatchPaymentSideEffect(
          paymentNotifications.sendInvoiceConfirmationToClient({
            toEmail: client.email,
            toName: client.name,
            invoiceNumber: invoice.number || invoice.id,
            planName: plan.name,
            planSlug: plan.slug,
            billingCycle: (subRows[0] as { billing_cycle?: string }).billing_cycle ?? 'monthly',
            amount: invoice.amount_paid / 100,
            total: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            paymentId: paymentRows[0].id,
            lineItems,
            periodStart,
            periodEnd,
            purchasedAt: invoice.created
              ? new Date(invoice.created * 1000).toISOString()
              : new Date().toISOString(),
          }),
          'stripe_invoice_email',
        );
      }
    } catch (err) {
      logger.warn('Stripe invoice confirmation email skipped', { error: err, invoiceId: invoice.id });
    }

    dispatchRevenueAllocation({
      paymentId: paymentRows[0].id,
      userId: subRows[0].user_id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      provider: 'stripe',
      metadata: {
        purchaseType: 'platform_plan',
        planSlug,
        billingCycle: (subRows[0] as { billing_cycle?: string }).billing_cycle ?? 'monthly',
      },
    });

    const isFirstPaid =
      invoice.amount_paid > 0 &&
      (invoice.billing_reason === 'subscription_create' || completedPaidCount === 1);
    if (isFirstPaid) {
      dispatchAutoFulfillment({
        paymentId: paymentRows[0].id,
        userId: subRows[0].user_id,
        purchaseType: 'platform_plan',
        planSlug: planSlug || null,
        deliverableId: planSlug ? resolvePlanDeliverableId(planSlug) : null,
      });
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = stripeSubscriptionId(invoice.subscription as string | Stripe.Subscription | null);
    if (!subscriptionId) return;

    await this.db.markSubscriptionPastDue(subscriptionId);

    await this.db.insertStripeFailedPayment({
      stripeSubscriptionId: subscriptionId,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
    });
  }

  async cancelSubscription(userId: string): Promise<void> {
    const { rows } = await this.db.getActiveStripeSubscriptionId(userId);

    if (!rows[0]?.stripe_subscription_id) throw new NotFoundError('Active subscription');

    await requireStripe().subscriptions.update(rows[0].stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await this.db.setSubscriptionCancelAtPeriodEnd(rows[0].stripe_subscription_id);
  }

  async createBillingPortalSession(userId: string): Promise<string> {
    const { rows } = await this.db.getStripeCustomerId(userId);

    if (!rows[0]) throw new PaymentError('No Stripe customer found');

    const session = await requireStripe().billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: webAppUrl('/dashboard#billing'),
    });

    return session.url;
  }

  // ========================
  // PAYPAL
  // ========================

  private async getPayPalToken(): Promise<string> {
    const base = config.paypal.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const res = await axios.post(`${base}/v1/oauth2/token`, 'grant_type=client_credentials', {
      auth: { username: config.paypal.clientId, password: config.paypal.clientSecret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return res.data.access_token;
  }

  async createPayPalOrder(
    userId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'yearly',
    industryCategory?: string | null,
  ) {
    const plan = await billingService.getPlanBySlug(planSlug);
    const amount = resolveCheckoutAmount(plan, billingCycle, industryCategory);

    const finance = getFinanceClient();
    if (finance.isConfigured()) {
      const remote = await finance.createPayPalOrder({
        userId,
        planSlug,
        billingCycle,
        amount,
        currency: 'USD',
        returnUrl: webAppUrl('/dashboard/billing/paypal/success'),
        cancelUrl: webAppUrl('/dashboard/billing/cancel'),
      });
      if (remote?.orderId) {
        await this.db.insertPendingPayPalPayment({
          userId,
          amount,
          orderId: remote.orderId,
          description: `PayPal ${plan.name} ${billingCycle}`,
          metadataJson: JSON.stringify({
            planSlug,
            billingCycle,
            industryCategory: industryCategory ?? null,
            orderId: remote.orderId,
            via: 'finance_aggregator',
          }),
        });
        return { orderId: remote.orderId, approveUrl: remote.approveUrl ?? '' };
      }
    }

    const token = await this.getPayPalToken();
    const base = config.paypal.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const res = await axios.post(
      `${base}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amount.toFixed(2) },
          description: `${plan.name} Plan (${billingCycle})`,
          custom_id: `${userId}:${planSlug}:${billingCycle}`,
        }],
        application_context: {
          return_url: webAppUrl('/dashboard/billing/paypal/success'),
          cancel_url: webAppUrl('/dashboard/billing/cancel'),
        },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    const order = res.data;
    const approveLink = order.links.find((l: any) => l.rel === 'approve')?.href;

    // Store pending payment
    await this.db.insertPendingPayPalPayment({
      userId,
      amount,
      orderId: order.id,
      description: `PayPal ${plan.name} ${billingCycle}`,
      metadataJson: JSON.stringify({
        planSlug,
        billingCycle,
        industryCategory: industryCategory ?? null,
        orderId: order.id,
      }),
    });

    return { orderId: order.id, approveUrl: approveLink };
  }

  async capturePayPalOrder(orderId: string, userId: string): Promise<void> {
    const { rows: ownerRows } = await this.db.getPendingPayPalPaymentByOrderId(orderId);
    if (!ownerRows[0] || ownerRows[0].user_id !== userId) {
      throw new NotFoundError('Order');
    }

    const storedMeta =
      typeof ownerRows[0].metadata === 'string'
        ? (JSON.parse(ownerRows[0].metadata || '{}') as Record<string, unknown>)
        : (ownerRows[0].metadata ?? {});

    let planSlug = String(storedMeta.planSlug ?? '');
    let billingCycle = String(storedMeta.billingCycle ?? '') as 'monthly' | 'yearly';
    let chargeId: string | undefined;

    const finance = getFinanceClient();
    if (finance.isConfigured() && storedMeta.via === 'finance_aggregator') {
      const remote = await finance.capturePayPalOrder(orderId, { userId });
      if (!remote) throw new PaymentError('Finance aggregator PayPal capture failed');
      chargeId =
        typeof remote.captureId === 'string'
          ? remote.captureId
          : typeof remote.chargeId === 'string'
            ? remote.chargeId
            : orderId;
      if (!planSlug) planSlug = String(remote.planSlug ?? '');
      if (!billingCycle) billingCycle = String(remote.billingCycle ?? 'monthly') as 'monthly' | 'yearly';
    } else {
      const token = await this.getPayPalToken();
      const base = config.paypal.mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const res = await axios.post(
        `${base}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const captureData = res.data;
      const unit = captureData.purchase_units?.[0];
      const capture = unit?.payments?.captures?.[0];
      const [customUserId, customPlanSlug, customBillingCycle] = (unit?.custom_id || '').split(':');

      if (!customUserId || !customPlanSlug) throw new PaymentError('Invalid PayPal order metadata');
      if (customUserId !== userId) throw new PaymentError('PayPal order user mismatch');

      planSlug = customPlanSlug;
      billingCycle = customBillingCycle as 'monthly' | 'yearly';
      chargeId = capture?.id;
    }

    if (!planSlug || !billingCycle) throw new PaymentError('Invalid PayPal order metadata');

    const plan = await billingService.getPlanBySlug(planSlug);

    await this.db.runInTransaction(async (client) => {
      await this.db.completePayPalCapture(client, orderId, chargeId ?? null);

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

      await this.db.insertActiveSubscription(client, {
        userId,
        planId: plan.id,
        billingCycle,
        periodStart: now,
        periodEnd,
      });

      await this.db.updateUserPlanId(userId, plan.id, client);
    });

    logger.info('PayPal order captured', { orderId, userId, planSlug, viaFinance: storedMeta.via === 'finance_aggregator' });
  }

  // ========================
  // WISE (Manual tracking)
  // ========================

  async createWiseTransfer(
    userId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'yearly',
    industryCategory?: string | null,
  ) {
    const plan = await billingService.getPlanBySlug(planSlug);
    const amount = resolveCheckoutAmount(plan, billingCycle, industryCategory);
    const currency = config.payments.manual.currency || 'USD';
    const reference = buildTransferReference(userId);

    const finance = getFinanceClient();
    if (finance.isConfigured()) {
      const remote = await finance.createWiseTransfer({
        userId,
        planSlug,
        billingCycle,
        amount,
        reference,
        currency: 'USD',
      });
      if (remote && typeof remote.paymentId === 'string') {
        return remote as {
          paymentId: string;
          reference: string;
          amount: number;
          currency: string;
          instructions: Record<string, unknown>;
        };
      }
    }

    const { rows } = await this.db.insertPendingWisePayment({
      userId,
      amount,
      currency: currency.toUpperCase(),
      description: `Wise transfer for ${plan.name} plan`,
      metadataJson: JSON.stringify({
        planSlug,
        billingCycle,
        industryCategory: industryCategory ?? null,
        reference,
        instructions: 'pending_manual_verification',
      }),
    });

    return {
      paymentId: rows[0].id,
      reference,
      amount,
      currency,
      instructions: buildTransferInstructions(reference, amount, currency, plan.name),
    };
  }

  async confirmWisePayment(paymentId: string, adminId: string): Promise<void> {
    await this.confirmPendingPayment(paymentId, adminId, 'wise');
  }

  async confirmPendingPayment(
    paymentId: string,
    adminId: string,
    provider: 'wise' | 'manual' | 'kriptoman' | 'stripe' = 'manual'
  ): Promise<void> {
    const { rows } = await this.db.getPaymentForConfirm(paymentId, provider);

    if (!rows[0]) throw new NotFoundError('Payment');
    if (rows[0].status === 'completed') {
      throw new PaymentError('Payment is already confirmed');
    }
    if (rows[0].status !== 'pending' && rows[0].status !== 'processing') {
      throw new PaymentError(`Payment cannot be confirmed from status '${rows[0].status}'`);
    }

    const metadata =
      typeof rows[0].metadata === 'string'
        ? (JSON.parse(rows[0].metadata || '{}') as Record<string, unknown>)
        : (rows[0].metadata ?? {});

    const planSlug = String(metadata.planSlug ?? '');
    const billingCycle = String(metadata.billingCycle ?? 'monthly');
    const purchaseType = String(metadata.purchaseType ?? 'platform_plan');
    const paymentAmount = toMoneyNumber(rows[0].amount);

    if (purchaseType === 'deliverable') {
      const deliverableId = String(metadata.deliverableId ?? '');
      const deliverable = getDeliverable(deliverableId);
      if (!deliverable) throw new NotFoundError('Deliverable metadata');

      await this.db.runInTransaction(async (client) => {
        await this.db.markPaymentCompleted(client, paymentId);
      });

      const lineItems = [{
        description: `${deliverable.name} (${deliverable.billing})`,
        amount: paymentAmount,
        quantity: 1,
      }];

      const createdInvoice = await billingService.createInvoice({
        userId: rows[0].user_id,
        paymentId,
        amount: paymentAmount,
        currency: rows[0].currency,
        lineItems,
        billingDetails: {
          receiptType: 'deliverable_purchase',
          deliverableId,
          industryCategory: metadata.industryCategory ?? null,
          billing: deliverable.billing,
        },
      });

      const { rows: userRows } = await this.db.getUserById(rows[0].user_id);
      const client = userRows[0];
      if (client?.email) {
        const inv = createdInvoice as { invoice_number?: string };
        const invoiceNumber = inv?.invoice_number ?? `DEL-${paymentId.slice(0, 8).toUpperCase()}`;
        dispatchPaymentSideEffect(
          paymentNotifications.sendInvoiceConfirmationToClient({
            toEmail: client.email,
            toName: client.name,
            invoiceNumber,
            planName: deliverable.name,
            planSlug: deliverable.id,
            planDescription: deliverable.description,
            billingCycle: deliverable.billing,
            amount: paymentAmount,
            total: paymentAmount,
            currency: rows[0].currency,
            paymentId,
            lineItems,
            periodStart: new Date().toISOString(),
            periodEnd: new Date().toISOString(),
            purchasedAt: new Date().toISOString(),
          }),
          'deliverable_invoice_email',
        );
      }

      logger.info('Deliverable payment confirmed', { paymentId, deliverableId, adminId });

      dispatchRevenueAllocation({
        paymentId,
        userId: rows[0].user_id,
        amount: paymentAmount,
        currency: rows[0].currency,
        provider,
        metadata,
      });

      dispatchAutoFulfillment({
        paymentId,
        userId: rows[0].user_id,
        purchaseType: 'deliverable',
        deliverableId,
        industryCategory: typeof metadata.industryCategory === 'string' ? metadata.industryCategory : null,
        clientName: client?.name ?? null,
        clientEmail: client?.email ?? null,
      });
      dispatchFactoryPhaseAutoEvaluate();
      return;
    }

    if (!planSlug) throw new NotFoundError('Payment plan metadata');

    const plan = await billingService.getPlanBySlug(planSlug);

    const activation = await this.db.runInTransaction(async (client) => {
      await this.db.markPaymentCompleted(client, paymentId);

      const subscription = await this.activateLocalSubscription(
        client,
        rows[0].user_id,
        plan.id,
        billingCycle as 'monthly' | 'yearly'
      );

      return subscription;
    });

    const invoiceLineItems = [{
      description: `${plan.name} Plan (${billingCycle})`,
      amount: paymentAmount,
      quantity: 1,
    }];

    const created = await billingService.createInvoice({
      userId: rows[0].user_id,
      subscriptionId: activation.subscriptionId,
      paymentId,
      amount: paymentAmount,
      currency: rows[0].currency,
      lineItems: invoiceLineItems,
      billingDetails: {
        receiptType: 'purchase_confirmation',
        planName: plan.name,
        planSlug: plan.slug,
        planDescription: plan.description,
        billingCycle,
        periodStart: activation.periodStart.toISOString(),
        periodEnd: activation.periodEnd.toISOString(),
      },
    });

    const invoiceRecord = {
      invoice: created as {
        invoice_number: string;
        total_amount: number;
        amount: number;
        currency: string;
        created_at?: string;
      },
      subscription: activation,
      lineItems: invoiceLineItems,
    };

    logger.info('Pending payment confirmed', { paymentId, adminId, provider });

    dispatchRevenueAllocation({
      paymentId,
      userId: rows[0].user_id,
      amount: paymentAmount,
      currency: rows[0].currency,
      provider,
      metadata: { ...metadata, planSlug, billingCycle, purchaseType: 'platform_plan' },
    });

    if (!invoiceRecord?.invoice?.invoice_number) return;

    const { invoice, subscription, lineItems } = invoiceRecord;
    const purchasedAt = invoice.created_at ?? new Date().toISOString();

    const { rows: userRows } = await this.db.getUserById(rows[0].user_id);
    const client = userRows[0];
    if (client?.email) {
      dispatchPaymentSideEffect(
        paymentNotifications.sendInvoiceConfirmationToClient({
          toEmail: client.email,
          toName: client.name,
          invoiceNumber: invoice.invoice_number,
          planName: plan.name,
          planSlug: plan.slug,
          planDescription: plan.description,
          billingCycle,
          amount: Number(invoice.amount),
          total: Number(invoice.total_amount),
          currency: invoice.currency,
          paymentId,
          lineItems,
          periodStart: subscription.periodStart.toISOString(),
          periodEnd: subscription.periodEnd.toISOString(),
          purchasedAt,
        }),
        'invoice_email'
      );
    }
    dispatchPaymentSideEffect(
      paymentNotifications.createInAppPaymentNotification(
        rows[0].user_id,
        'payment_confirmed',
        'Purchase confirmed',
        paymentNotifications.buildPurchaseConfirmedMessage({
          planName: plan.name,
          billingCycle,
          total: Number(invoice.total_amount),
          currency: invoice.currency,
          invoiceNumber: invoice.invoice_number,
          periodEnd: subscription.periodEnd.toISOString(),
        }),
        {
          paymentId,
          invoiceNumber: invoice.invoice_number,
          planSlug: plan.slug,
          planName: plan.name,
          billingCycle,
          periodEnd: subscription.periodEnd.toISOString(),
        }
      ),
      'payment_confirmed_notification'
    );

    dispatchAutoFulfillment({
      paymentId,
      userId: rows[0].user_id,
      purchaseType: 'platform_plan',
      planSlug,
      industryCategory: typeof metadata.industryCategory === 'string' ? metadata.industryCategory : null,
      clientName: client?.name ?? null,
      clientEmail: client?.email ?? null,
    });
    dispatchFactoryPhaseAutoEvaluate();
  }

  // ========================
  // MANUAL (bez firme / pre Stripe-a)
  // ========================

  getPaymentMethods() {
    const mode = config.payments.mode;
    const manual = getManualPaymentConfig();
    const methods: Array<{ id: string; label: string; description: string; available: boolean }> = [];

    if (mode === 'manual' || (manual.configured && process.env.PAYMENTS_MANUAL_ENABLED !== 'false')) {
      methods.push({
        id: 'manual',
        label: 'Bank transfer',
        description: 'Pay by bank transfer — activation after admin confirmation.',
        available: manual.configured,
      });
    }

    if (mode !== 'manual' && config.stripe.secretKey) {
      methods.push({
        id: 'stripe',
        label: 'Card (Stripe)',
        description: 'Checkout via Stripe test or live account.',
        available: true,
      });
    }

    if (mode !== 'manual' && config.paypal.clientId && config.paypal.clientSecret) {
      methods.push({
        id: 'paypal',
        label: 'PayPal',
        description: 'Sandbox or live PayPal account.',
        available: true,
      });
    }

    if (mode !== 'manual') {
      const finance = getFinanceClient();
      const wiseConfigured = finance.isConfigured();
      methods.push({
        id: 'wise',
        label: 'International transfer (Wise)',
        description: wiseConfigured
          ? 'Wise transfer via finance integration — manual confirmation after funds arrive.'
          : 'Not configured — use bank transfer (IBAN) instead.',
        available: wiseConfigured,
      });
    }

    const kriptoman = getKriptomanClient();
    if (config.kriptoman.enabled && kriptoman.isConfigured()) {
      methods.push({
        id: 'kriptoman',
        label: 'Crypto (Kriptoman)',
        description: 'Pay USDT/BTC via Kriptoman checkout link.',
        available: true,
      });
    }

    return {
      mode,
      methods,
      manualConfigured: Boolean(config.payments.manual.accountName && config.payments.manual.iban),
      note:
        mode === 'manual'
          ? 'No-company mode: use bank transfer until you register a company and enable Stripe live.'
          : undefined,
      manualSetupMissing: !manual.configured,
    };
  }

  async createManualCheckout(
    userId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'yearly',
    industryCategory?: string
  ) {
    const methods = this.getPaymentMethods();
    if (!methods.methods.some((m) => m.id === 'manual' && m.available)) {
      throw new PaymentError('Manual bank transfer is not enabled. Set PAYMENTS_MODE=manual or bank details in .env.');
    }

    const plan = await billingService.getPlanBySlug(planSlug);
    const amount = resolveCheckoutAmount(plan, billingCycle, industryCategory);
    const currency = config.payments.manual.currency || 'USD';
    const reference = buildTransferReference(userId);
    const categoryLabel = categoryCheckoutLabel(industryCategory);

    const { rows } = await this.db.insertManualPendingPayment({
      userId,
      amount,
      currency: currency.toUpperCase(),
      description: `Manual bank transfer — ${plan.name} (${billingCycle})${categoryLabel}`,
      metadataJson: JSON.stringify({
        planSlug,
        billingCycle,
        reference,
        ...(industryCategory ? { industryCategory } : {}),
      }),
    });

    const instructions = buildTransferInstructions(reference, amount, currency, plan.name);
    const paymentId = rows[0].id;

    const { rows: userRows } = await this.db.getUserById(userId);
    if (userRows[0]?.email) {
      dispatchPaymentSideEffect(
        paymentNotifications.sendManualCheckoutInstructions({
          toEmail: userRows[0].email,
          toName: userRows[0].name,
          planName: plan.name,
          planSlug: plan.slug,
          planDescription: plan.description,
          billingCycle,
          amount,
          currency: currency.toUpperCase(),
          reference,
          instructions,
          paymentId,
        }),
        'manual_checkout_email'
      );
    }

    dispatchPaymentSideEffect(
      paymentNotifications.createInAppPaymentNotification(
        userId,
        'payment_pending',
        'Payment instructions sent',
        `Check your email or dashboard for IBAN and reference ${reference}.`,
        { paymentId, reference }
      ),
      'checkout_in_app_notification'
    );

    return {
      paymentId,
      reference,
      amount,
      currency: currency.toUpperCase(),
      instructions,
    };
  }

  async createDeliverableManualCheckout(
    userId: string,
    input: {
      deliverableId: string;
      industryCategory?: string;
      paymentProvider?: PaymentProviderId;
      marketIntensity?: number;
      tamEstimateUsd?: number;
      competitionScore?: number;
    }
  ) {
    const methods = this.getPaymentMethods();
    if (!methods.methods.some((m) => m.id === 'manual' && m.available)) {
      throw new PaymentError('Manual bank transfer is not enabled.');
    }

    const deliverable = getDeliverable(input.deliverableId);
    if (!deliverable) throw new PaymentError('Unknown deliverable');
    if (!canCheckoutPackage(input.deliverableId)) {
      throw new PaymentError(
        'This package is not available for self-serve checkout at the current budget/production profile. Contact sales.',
      );
    }

    const quote = calculateDeliverableQuote({
      deliverableId: input.deliverableId,
      industryCategory: input.industryCategory ?? null,
      billingCycle: deliverable.billing,
      paymentProvider: input.paymentProvider ?? 'manual',
      marketIntensity: input.marketIntensity ?? 55,
      tamEstimateUsd: input.tamEstimateUsd,
      competitionScore: input.competitionScore,
    });

    const amount = quote.clientPriceEur;
    const currency = config.payments.manual.currency || 'EUR';
    const reference = buildTransferReference(userId);
    const categoryLabel = categoryCheckoutLabel(input.industryCategory);

    const { rows } = await this.db.insertManualPendingPayment({
      userId,
      amount,
      currency: currency.toUpperCase(),
      description: `Deliverable — ${deliverable.name}${categoryLabel}`,
      metadataJson: JSON.stringify({
        purchaseType: 'deliverable',
        deliverableId: deliverable.id,
        industryCategory: input.industryCategory ?? null,
        billing: deliverable.billing,
        reference,
        quotedSubtotalEur: quote.subtotalEur,
        paymentFeeEur: quote.paymentFeeEur,
      }),
    });

    const instructions = buildTransferInstructions(reference, amount, currency, deliverable.name);
    const paymentId = rows[0].id;

    const { rows: userRows } = await this.db.getUserById(userId);
    if (userRows[0]?.email) {
      dispatchPaymentSideEffect(
        paymentNotifications.sendManualCheckoutInstructions({
          toEmail: userRows[0].email,
          toName: userRows[0].name,
          planName: deliverable.name,
          planSlug: deliverable.id,
          planDescription: deliverable.description,
          billingCycle: deliverable.billing,
          amount,
          currency: currency.toUpperCase(),
          reference,
          instructions,
          paymentId,
        }),
        'deliverable_checkout_email'
      );
    }

    dispatchPaymentSideEffect(
      paymentNotifications.createInAppPaymentNotification(
        userId,
        'payment_pending',
        'Delivery instructions',
        `Reference ${reference} · ${deliverable.name}`,
        { paymentId, reference, deliverableId: deliverable.id }
      ),
      'deliverable_checkout_in_app'
    );

    return {
      paymentId,
      reference,
      amount,
      currency: currency.toUpperCase(),
      instructions,
      quote: {
        deliverableName: deliverable.name,
        clientPriceEur: quote.clientPriceEur,
      },
    };
  }

  async createDeliverableStripeCheckout(
    userId: string,
    input: {
      deliverableId: string;
      industryCategory?: string;
      marketIntensity?: number;
      tamEstimateUsd?: number;
      competitionScore?: number;
    }
  ) {
    if (!config.stripe.secretKey) {
      throw new PaymentError('Stripe is not configured. Add STRIPE_SECRET_KEY and set PAYMENTS_MODE=live.');
    }
    if (config.payments.mode === 'manual') {
      throw new PaymentError('Card checkout is disabled. Set PAYMENTS_MODE=live in production.');
    }

    const deliverable = getDeliverable(input.deliverableId);
    if (!deliverable) throw new PaymentError('Unknown deliverable');
    if (!canCheckoutPackage(input.deliverableId)) {
      throw new PaymentError(
        'This package is not available for self-serve checkout at the current budget/production profile. Contact sales.',
      );
    }

    const quote = calculateDeliverableQuote({
      deliverableId: input.deliverableId,
      industryCategory: input.industryCategory ?? null,
      billingCycle: deliverable.billing,
      paymentProvider: 'stripe',
      marketIntensity: input.marketIntensity ?? 55,
      tamEstimateUsd: input.tamEstimateUsd,
      competitionScore: input.competitionScore,
    });

    const amount = applyFoundingPromoDiscount(quote.clientPriceEur, input.industryCategory);
    const currency = 'EUR';
    const categoryLabel = categoryCheckoutLabel(input.industryCategory);

    const { rows } = await this.db.insertStripePendingPayment({
      userId,
      amount,
      currency,
      description: `Deliverable — ${deliverable.name}${categoryLabel}`,
      metadataJson: JSON.stringify({
        purchaseType: 'deliverable',
        deliverableId: deliverable.id,
        industryCategory: input.industryCategory ?? null,
        billing: deliverable.billing,
        quotedSubtotalEur: quote.subtotalEur,
        paymentFeeEur: quote.paymentFeeEur,
        foundingPromo: isFoundingPromoActive(input.industryCategory) || undefined,
      }),
    });

    const paymentId = rows[0].id;
    const { rows: userRows } = await this.db.getUserById(userId);
    const session = await requireStripe().checkout.sessions.create({
      customer_email: userRows[0]?.email ?? undefined,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${deliverable.name}${categoryLabel}`,
              description: deliverable.description.slice(0, 200),
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: webAppUrl(`/dashboard?payment=success&deliverable=${encodeURIComponent(deliverable.id)}`),
      cancel_url: webAppUrl('/pricing?payment=cancel'),
      metadata: {
        purchaseType: 'deliverable',
        paymentId,
        userId,
        deliverableId: deliverable.id,
        industryCategory: input.industryCategory ?? '',
      },
    });

    await this.db.updateProviderPaymentId(paymentId, session.id);

    logger.info('Stripe deliverable checkout created', { paymentId, deliverableId: deliverable.id, sessionId: session.id });

    return {
      paymentId,
      sessionId: session.id,
      url: session.url,
      amount,
      currency,
    };
  }

  private async handleDeliverableStripeCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId || session.payment_status !== 'paid') return;
    try {
      await this.confirmPendingPayment(paymentId, 'stripe-webhook', 'stripe');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already confirmed')) return;
      throw err;
    }
  }

  async markManualPaymentSent(paymentId: string, userId: string): Promise<void> {
    const { rows } = await this.db.getManualPaymentOwnerStatus(paymentId);

    if (!rows[0] || rows[0].user_id !== userId) throw new NotFoundError('Payment');
    if (rows[0].status !== 'pending') {
      throw new PaymentError(`Payment is already '${rows[0].status}'`);
    }

    await this.db.markManualPaymentProcessing(paymentId);

    logger.info('Manual payment marked as sent', { paymentId, userId });

    const { rows: paymentRows } = await this.db.getPaymentByIdForUser(paymentId, userId, 'manual');
    const payment = paymentRows[0];
    if (!payment) return;

    const metadata = parsePaymentMetadata(payment.metadata);
    const purchaseType = String(metadata.purchaseType ?? 'platform_plan');
    const reference = String(metadata.reference ?? '');

    const { rows: userRows } = await this.db.getUserById(userId);
    const user = userRows[0];
    if (!user) return;

    if (purchaseType === 'deliverable') {
      const deliverableId = String(metadata.deliverableId ?? '');
      const deliverable = getDeliverable(deliverableId);
      dispatchPaymentSideEffect(
        paymentNotifications.notifyAdminPaymentPending({
          userEmail: user.email,
          userName: user.name,
          planName: deliverable?.name ?? deliverableId,
          billingCycle: String(metadata.billing ?? 'one_time'),
          amount: Number(payment.amount),
          currency: payment.currency,
          reference,
          paymentId,
        }),
        'admin_pending_email'
      );
      return;
    }

    const planSlug = String(metadata.planSlug ?? '');
    const billingCycle = String(metadata.billingCycle ?? 'monthly');
    if (!planSlug) return;

    const plan = await billingService.getPlanBySlug(planSlug);

    dispatchPaymentSideEffect(
      paymentNotifications.notifyAdminPaymentPending({
        userEmail: user.email,
        userName: user.name,
        planName: plan.name,
        billingCycle,
        amount: Number(payment.amount),
        currency: payment.currency,
        reference,
        paymentId,
      }),
      'admin_pending_email'
    );
  }

  private async activateLocalSubscription(
    client: PoolClient,
    userId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{ subscriptionId: string; periodStart: Date; periodEnd: Date }> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

    const { rows: subRows } = await this.db.insertActiveSubscriptionReturningId(client, {
      userId,
      planId,
      billingCycle,
      periodStart: now,
      periodEnd,
    });

    await this.db.updateUserPlanId(userId, planId, client);
    return { subscriptionId: subRows[0].id, periodStart: now, periodEnd };
  }

  // ========================
  // KRIPTOMAN (crypto checkout)
  // ========================

  async createKriptomanCheckout(
    userId: string,
    planSlug: string,
    billingCycle: 'monthly' | 'yearly',
    cryptoCurrency?: string,
    industryCategory?: string
  ) {
    const client = getKriptomanClient();
    if (!config.kriptoman.enabled || !client.isConfigured()) {
      throw new PaymentError(
        'Kriptoman is not enabled. Set KRIPTOMAN_ENABLED=true and KRIPTOMAN_URL + KRIPTOMAN_API_KEY (or FINANCE aggregator).'
      );
    }

    const plan = await billingService.getPlanBySlug(planSlug);
    const amount = resolveCheckoutAmount(plan, billingCycle, industryCategory);
    const currency = config.payments.manual.currency || 'EUR';
    const asset = (cryptoCurrency ?? config.kriptoman.defaultCrypto).toUpperCase();
    const categoryLabel = categoryCheckoutLabel(industryCategory);

    const { rows } = await this.db.insertKriptomanPendingPayment({
      userId,
      amount,
      currency: currency.toUpperCase(),
      description: `Kriptoman — ${plan.name} (${billingCycle})${categoryLabel}`,
      metadataJson: JSON.stringify({
        planSlug,
        billingCycle,
        cryptoCurrency: asset,
        ...(industryCategory ? { industryCategory } : {}),
      }),
    });

    const paymentId = rows[0].id;
    const callbackUrl = `${config.app.url}/api/v1/payments/kriptoman/webhook`;
    const invoice = await client.createInvoice({
      externalId: paymentId,
      amount,
      currency: currency.toUpperCase(),
      cryptoCurrency: asset,
      description: `${plan.name} ${billingCycle}`,
      callbackUrl,
      successUrl: `${webAppUrl('/dashboard/billing/success')}?provider=kriptoman&payment_id=${paymentId}`,
      cancelUrl: webAppUrl('/dashboard/billing/cancel?provider=kriptoman'),
      metadata: { userId, planSlug, billingCycle, paymentId },
    });

    if (!invoice) {
      throw new PaymentError('Kriptoman invoice creation failed');
    }

    await this.db.updateKriptomanPaymentMetadata(
      paymentId,
      invoice.invoiceId,
      JSON.stringify({
        planSlug,
        billingCycle,
        cryptoCurrency: asset,
        kriptoman: {
          paymentUrl: invoice.paymentUrl,
          payAddress: invoice.payAddress,
          cryptoAmount: invoice.cryptoAmount,
          expiresAt: invoice.expiresAt,
        },
      })
    );

    return {
      paymentId,
      invoiceId: invoice.invoiceId,
      paymentUrl: invoice.paymentUrl,
      payAddress: invoice.payAddress,
      cryptoAmount: invoice.cryptoAmount,
      cryptoCurrency: invoice.cryptoCurrency ?? asset,
      amount,
      currency: currency.toUpperCase(),
      expiresAt: invoice.expiresAt,
    };
  }

  async handleKriptomanWebhook(rawBody: Buffer | string, signatureHeader: string): Promise<void> {
    const client = getKriptomanClient();
    if (!client.verifyWebhookSignature(rawBody, signatureHeader)) {
      throw new PaymentError('Invalid Kriptoman webhook signature');
    }

    const parsed =
      typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : JSON.parse(rawBody.toString('utf8') || '{}');
    const event = client.parseWebhookPayload(parsed);
    if (!client.isPaidStatus(event.status)) {
      logger.info('Kriptoman webhook ignored (non-paid status)', { status: event.status });
      return;
    }

    await this.completeKriptomanPayment(event.invoiceId, event.externalId);
  }

  async syncKriptomanPayment(paymentId: string, userId: string): Promise<{ status: string; activated: boolean }> {
    const { rows } = await this.db.getKriptomanPaymentForSync(paymentId, userId);
    if (!rows[0]) throw new NotFoundError('Payment');
    if (rows[0].status === 'completed') {
      return { status: 'completed', activated: true };
    }

    const invoiceId = rows[0].provider_payment_id;
    if (!invoiceId) throw new PaymentError('Kriptoman invoice id missing');

    const remoteStatus = await getKriptomanClient().getInvoiceStatus(invoiceId);
    if (!remoteStatus || !getKriptomanClient().isPaidStatus(remoteStatus)) {
      return { status: rows[0].status, activated: false };
    }

    await this.completeKriptomanPayment(invoiceId, paymentId);
    return { status: 'completed', activated: true };
  }

  private async completeKriptomanPayment(
    invoiceId: string | undefined,
    externalId: string | undefined
  ): Promise<void> {
    let paymentId = externalId;
    if (!paymentId && invoiceId) {
      const { rows } = await this.db.findKriptomanPaymentIdByInvoiceId(invoiceId);
      paymentId = rows[0]?.id;
    }

    if (!paymentId) {
      logger.warn('Kriptoman webhook: payment not found', { invoiceId, externalId });
      return;
    }

    const { rows: statusRows } = await this.db.getKriptomanPaymentStatus(paymentId);
    if (!statusRows[0]) return;
    if (statusRows[0].status === 'completed') return;

    await this.confirmPendingPayment(paymentId, 'kriptoman-webhook', 'kriptoman');
  }

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { rows: countRows } = await this.db.countPaymentsByUser(userId);
    const { rows } = await this.db.listPaymentsByUser(userId, limit, offset);
    return { payments: rows, total: parseInt(countRows[0].count, 10) };
  }
}
