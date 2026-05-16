import Stripe from 'stripe';
import axios from 'axios';
import { config } from '../../../config';
import { query, transaction } from '../../../database/connection';
import { PaymentError, NotFoundError } from '../../../utils/errors';
import { BillingService } from '../../billing/service/billing.service';
import logger from '../../../utils/logger';

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2023-10-16' });
const billingService = new BillingService();

/** N3-E1: Stripe may send `subscription` as an id string or an expanded object; DB queries need the id. */
function stripeSubscriptionId(ref: string | Stripe.Subscription | null | undefined): string | null {
  if (ref == null) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

export class PaymentsService {
  // ========================
  // STRIPE
  // ========================

  async createStripeCheckoutSession(userId: string, planSlug: string, billingCycle: 'monthly' | 'yearly') {
    const plan = await billingService.getPlanBySlug(planSlug);

    const priceId = billingCycle === 'yearly'
      ? plan.stripe_price_id_yearly
      : plan.stripe_price_id_monthly;

    if (!priceId) {
      throw new PaymentError(`No Stripe price configured for plan '${planSlug}' (${billingCycle})`);
    }

    // Get or create Stripe customer
    const { rows: userRows } = await query<{ email: string; name: string; stripe_customer_id?: string }>(
      `SELECT u.email, u.name, s.stripe_customer_id
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [userId]
    );

    let customerId = userRows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRows[0]?.email,
        name: userRows[0]?.name,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${config.app.url}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app.url}/billing/cancel`,
      metadata: { userId, planSlug, billingCycle },
      subscription_data: {
        metadata: { userId, planSlug },
        trial_period_days: planSlug === 'starter' ? 14 : 0,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
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
    const { userId, planSlug, billingCycle } = session.metadata || {};
    if (!userId || !planSlug) return;

    const plan = await billingService.getPlanBySlug(planSlug);
    const subscriptionRef = stripeSubscriptionId(session.subscription as string | Stripe.Subscription | null);
    if (!subscriptionRef) return;
    const subscription = await stripe.subscriptions.retrieve(subscriptionRef);

    await transaction(async (client) => {
      // Create/update subscription
      await client.query(
        `INSERT INTO subscriptions
           (user_id, plan_id, status, billing_cycle, stripe_subscription_id,
            stripe_customer_id, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', $3, $4, $5, $6, $7)
         ON CONFLICT (stripe_subscription_id) DO UPDATE SET
           status = 'active',
           current_period_start = EXCLUDED.current_period_start,
           current_period_end = EXCLUDED.current_period_end,
           updated_at = NOW()`,
        [
          userId, plan.id, billingCycle || 'monthly',
          subscription.id, session.customer as string,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
        ]
      );

      // Update user plan
      await client.query('UPDATE users SET plan_id = $2 WHERE id = $1', [userId, plan.id]);
    });

    logger.info('Stripe checkout completed', { userId, planSlug });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    await query(
      `UPDATE subscriptions
       SET status = $2, current_period_start = $3, current_period_end = $4,
           cancel_at_period_end = $5, updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [
        subscription.id,
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end,
      ]
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await query(
      `UPDATE subscriptions
       SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );

    // Downgrade user to starter
    const { rows } = await query<{ user_id: string }>(
      'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscription.id]
    );
    if (rows[0]) {
      const { rows: starter } = await query<{ id: string }>('SELECT id FROM plans WHERE slug = $1', ['starter']);
      if (starter[0]) {
        await query('UPDATE users SET plan_id = $2 WHERE id = $1', [rows[0].user_id, starter[0].id]);
      }
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = stripeSubscriptionId(invoice.subscription as string | Stripe.Subscription | null);
    if (!subscriptionId) return;

    const { rows: subRows } = await query<{ user_id: string; plan_id: string; id: string }>(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscriptionId]
    );

    if (!subRows[0]) return;

    // Record payment
    const { rows: paymentRows } = await query<{ id: string }>(
      `INSERT INTO payments
         (user_id, subscription_id, amount, currency, status, provider, provider_payment_id, description)
       VALUES ($1, $2, $3, $4, 'completed', 'stripe', $5, 'Subscription payment')
       RETURNING id`,
      [subRows[0].user_id, subRows[0].id, invoice.amount_paid / 100, invoice.currency.toUpperCase(), invoice.id]
    );

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
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = stripeSubscriptionId(invoice.subscription as string | Stripe.Subscription | null);
    if (!subscriptionId) return;

    await query(
      `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscriptionId]
    );

    await query(
      `INSERT INTO payments
         (user_id, subscription_id, amount, currency, status, provider, provider_payment_id, description)
       SELECT s.user_id, s.id, $3, $4, 'failed', 'stripe', $2, 'Failed payment'
       FROM subscriptions s WHERE s.stripe_subscription_id = $1`,
      [subscriptionId, invoice.id, invoice.amount_due / 100, invoice.currency.toUpperCase()]
    );
  }

  async cancelSubscription(userId: string): Promise<void> {
    const { rows } = await query<{ stripe_subscription_id: string }>(
      `SELECT stripe_subscription_id FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (!rows[0]?.stripe_subscription_id) throw new NotFoundError('Active subscription');

    await stripe.subscriptions.update(rows[0].stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await query(
      `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [rows[0].stripe_subscription_id]
    );
  }

  async createBillingPortalSession(userId: string): Promise<string> {
    const { rows } = await query<{ stripe_customer_id: string }>(
      `SELECT stripe_customer_id FROM subscriptions
       WHERE user_id = $1 AND stripe_customer_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (!rows[0]) throw new PaymentError('No Stripe customer found');

    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: `${config.app.url}/billing`,
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

  async createPayPalOrder(userId: string, planSlug: string, billingCycle: 'monthly' | 'yearly') {
    const plan = await billingService.getPlanBySlug(planSlug);
    const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

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
          return_url: `${config.app.url}/billing/paypal/success`,
          cancel_url: `${config.app.url}/billing/cancel`,
        },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    const order = res.data;
    const approveLink = order.links.find((l: any) => l.rel === 'approve')?.href;

    // Store pending payment
    await query(
      `INSERT INTO payments
         (user_id, amount, currency, status, provider, provider_payment_id, description, metadata)
       VALUES ($1, $2, 'USD', 'pending', 'paypal', $3, $4, $5)`,
      [
        userId, amount, order.id,
        `PayPal ${plan.name} ${billingCycle}`,
        JSON.stringify({ planSlug, billingCycle, orderId: order.id }),
      ]
    );

    return { orderId: order.id, approveUrl: approveLink };
  }

  async capturePayPalOrder(orderId: string, userId: string): Promise<void> {
    const { rows: ownerRows } = await query<{ user_id: string }>(
      `SELECT user_id FROM payments
       WHERE provider_payment_id = $1 AND provider = 'paypal' AND status = 'pending'`,
      [orderId]
    );
    if (!ownerRows[0] || ownerRows[0].user_id !== userId) {
      throw new NotFoundError('Order');
    }

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
    const [customUserId, planSlug, billingCycle] = (unit?.custom_id || '').split(':');

    if (!customUserId || !planSlug) throw new PaymentError('Invalid PayPal order metadata');
    if (customUserId !== userId) throw new PaymentError('PayPal order user mismatch');

    const plan = await billingService.getPlanBySlug(planSlug);

    await transaction(async (client) => {
      // Update payment status
      await client.query(
        `UPDATE payments SET status = 'completed', provider_charge_id = $2, updated_at = NOW()
         WHERE provider_payment_id = $1`,
        [orderId, capture?.id]
      );

      // Create subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

      await client.query(
        `INSERT INTO subscriptions
           (user_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', $3, $4, $5)`,
        [userId, plan.id, billingCycle, now, periodEnd]
      );

      // Update user plan
      await client.query('UPDATE users SET plan_id = $2 WHERE id = $1', [userId, plan.id]);
    });

    logger.info('PayPal order captured', { orderId, userId, planSlug, customUserId });
  }

  // ========================
  // WISE (Manual tracking)
  // ========================

  async createWiseTransfer(userId: string, planSlug: string, billingCycle: 'monthly' | 'yearly') {
    const plan = await billingService.getPlanBySlug(planSlug);
    const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    const reference = `ATINA-${userId.slice(0, 8).toUpperCase()}-${Date.now()}`;

    const { rows } = await query(
      `INSERT INTO payments
         (user_id, amount, currency, status, provider, description, metadata)
       VALUES ($1, $2, 'USD', 'pending', 'wise', $3, $4)
       RETURNING id`,
      [
        userId, amount,
        `Wise transfer for ${plan.name} plan`,
        JSON.stringify({ planSlug, billingCycle, reference, instructions: 'pending_manual_verification' }),
      ]
    );

    return {
      paymentId: rows[0].id,
      reference,
      amount,
      currency: 'USD',
      instructions: {
        accountName: 'ATINA Platform Ltd',
        bankName: 'TransferWise',
        reference,
        amount: `$${amount.toFixed(2)} USD`,
        note: 'Include reference code in transfer description. Subscription activates within 24 hours of confirmed payment.',
      },
    };
  }

  async confirmWisePayment(paymentId: string, adminId: string): Promise<void> {
    const { rows } = await query<{
      user_id: string;
      metadata: Record<string, unknown>;
      amount: number;
      currency: string;
    }>(
      'SELECT * FROM payments WHERE id = $1 AND provider = $2',
      [paymentId, 'wise']
    );

    if (!rows[0]) throw new NotFoundError('Payment');

    const { planSlug, billingCycle } = rows[0].metadata as any;
    const plan = await billingService.getPlanBySlug(planSlug as string);

    await transaction(async (client) => {
      await client.query(
        `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [paymentId]
      );

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + ((billingCycle as string) === 'yearly' ? 12 : 1));

      const { rows: subRows } = await client.query(
        `INSERT INTO subscriptions
           (user_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', $3, $4, $5)
         RETURNING id`,
        [rows[0].user_id, plan.id, billingCycle, now, periodEnd]
      );

      await client.query('UPDATE users SET plan_id = $2 WHERE id = $1', [rows[0].user_id, plan.id]);

      await billingService.createInvoice({
        userId: rows[0].user_id,
        subscriptionId: subRows[0].id,
        paymentId,
        amount: rows[0].amount,
        currency: rows[0].currency,
        lineItems: [{ description: `${plan.name} Plan (${billingCycle})`, amount: rows[0].amount, quantity: 1 }],
      });
    });

    logger.info('Wise payment confirmed', { paymentId, adminId });
  }

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { rows: countRows } = await query<{ count: string }>(
      'SELECT COUNT(*) FROM payments WHERE user_id = $1', [userId]
    );
    const { rows } = await query(
      `SELECT * FROM payments WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return { payments: rows, total: parseInt(countRows[0].count, 10) };
  }
}
