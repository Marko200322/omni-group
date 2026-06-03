import { query, transaction } from '../../../database/connection';
import type { PoolClient } from 'pg';

/** All SQL for payments module — service has no direct DB import. */
export class PaymentsRepository {
  runInTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
    return transaction(fn);
  }

  getUserById(userId: string) {
    return query<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE id = $1',
      [userId]
    );
  }

  getUserWithStripeCustomer(userId: string) {
    return query<{ email: string; name: string; stripe_customer_id?: string }>(
      `SELECT u.email, u.name, s.stripe_customer_id
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [userId]
    );
  }

  getPaymentByIdForUser(paymentId: string, userId: string, provider: string) {
    return query<{
      id: string;
      user_id: string;
      amount: number;
      currency: string;
      metadata: Record<string, unknown> | string;
    }>(
      `SELECT id, user_id, amount, currency, metadata
       FROM payments WHERE id = $1 AND user_id = $2 AND provider = $3`,
      [paymentId, userId, provider]
    );
  }

  upsertStripeCheckoutSubscription(
    client: PoolClient,
    params: {
      userId: string;
      planId: string;
      billingCycle: string;
      stripeSubscriptionId: string;
      stripeCustomerId: string;
      periodStart: Date;
      periodEnd: Date;
    }
  ) {
    return client.query(
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
        params.userId,
        params.planId,
        params.billingCycle,
        params.stripeSubscriptionId,
        params.stripeCustomerId,
        params.periodStart,
        params.periodEnd,
      ]
    );
  }

  updateUserPlanId(userId: string, planId: string, client?: PoolClient) {
    const sql = 'UPDATE users SET plan_id = $2 WHERE id = $1';
    const params = [userId, planId];
    return client ? client.query(sql, params) : query(sql, params);
  }

  updateSubscriptionFromStripeEvent(subscription: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
  }) {
    return query(
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

  cancelSubscriptionByStripeId(stripeSubscriptionId: string) {
    return query(
      `UPDATE subscriptions
       SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId]
    );
  }

  getSubscriptionUserIdByStripeId(stripeSubscriptionId: string) {
    return query<{ user_id: string }>(
      'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    );
  }

  getPlanIdBySlug(slug: string) {
    return query<{ id: string }>('SELECT id FROM plans WHERE slug = $1', [slug]);
  }

  getSubscriptionByStripeId(stripeSubscriptionId: string) {
    return query<{ user_id: string; plan_id: string; id: string }>(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    );
  }

  insertStripeCompletedPayment(params: {
    userId: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    stripeInvoiceId: string;
  }) {
    return query<{ id: string }>(
      `INSERT INTO payments
         (user_id, subscription_id, amount, currency, status, provider, provider_payment_id, description)
       VALUES ($1, $2, $3, $4, 'completed', 'stripe', $5, 'Subscription payment')
       RETURNING id`,
      [
        params.userId,
        params.subscriptionId,
        params.amount,
        params.currency,
        params.stripeInvoiceId,
      ]
    );
  }

  markSubscriptionPastDue(stripeSubscriptionId: string) {
    return query(
      `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId]
    );
  }

  insertStripeFailedPayment(params: {
    stripeSubscriptionId: string;
    stripeInvoiceId: string;
    amount: number;
    currency: string;
  }) {
    return query(
      `INSERT INTO payments
         (user_id, subscription_id, amount, currency, status, provider, provider_payment_id, description)
       SELECT s.user_id, s.id, $3, $4, 'failed', 'stripe', $2, 'Failed payment'
       FROM subscriptions s WHERE s.stripe_subscription_id = $1`,
      [params.stripeSubscriptionId, params.stripeInvoiceId, params.amount, params.currency]
    );
  }

  getActiveStripeSubscriptionId(userId: string) {
    return query<{ stripe_subscription_id: string }>(
      `SELECT stripe_subscription_id FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
  }

  setSubscriptionCancelAtPeriodEnd(stripeSubscriptionId: string) {
    return query(
      `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId]
    );
  }

  getStripeCustomerId(userId: string) {
    return query<{ stripe_customer_id: string }>(
      `SELECT stripe_customer_id FROM subscriptions
       WHERE user_id = $1 AND stripe_customer_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
  }

  insertPendingPayPalPayment(params: {
    userId: string;
    amount: number;
    orderId: string;
    description: string;
    metadataJson: string;
  }) {
    return query(
      `INSERT INTO payments
         (user_id, amount, currency, status, provider, provider_payment_id, description, metadata)
       VALUES ($1, $2, 'USD', 'pending', 'paypal', $3, $4, $5)`,
      [params.userId, params.amount, params.orderId, params.description, params.metadataJson]
    );
  }

  getPendingPayPalPaymentByOrderId(orderId: string) {
    return query<{ user_id: string; metadata: string | Record<string, unknown> }>(
      `SELECT user_id, metadata FROM payments
       WHERE provider_payment_id = $1 AND provider = 'paypal' AND status = 'pending'`,
      [orderId]
    );
  }

  completePayPalCapture(client: PoolClient, orderId: string, chargeId: string | null) {
    return client.query(
      `UPDATE payments SET status = 'completed', provider_charge_id = $2, updated_at = NOW()
       WHERE provider_payment_id = $1`,
      [orderId, chargeId]
    );
  }

  insertActiveSubscription(
    client: PoolClient,
    params: {
      userId: string;
      planId: string;
      billingCycle: string;
      periodStart: Date;
      periodEnd: Date;
    }
  ) {
    return client.query(
      `INSERT INTO subscriptions
         (user_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', $3, $4, $5)`,
      [params.userId, params.planId, params.billingCycle, params.periodStart, params.periodEnd]
    );
  }

  insertPendingWisePayment(params: {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    metadataJson: string;
  }) {
    return query<{ id: string }>(
      `INSERT INTO payments
         (user_id, amount, currency, status, provider, description, metadata)
       VALUES ($1, $2, $3, 'pending', 'wise', $4, $5)
       RETURNING id`,
      [params.userId, params.amount, params.currency, params.description, params.metadataJson]
    );
  }

  getPaymentForConfirm(paymentId: string, provider: string) {
    return query<{
      user_id: string;
      metadata: Record<string, unknown> | string;
      amount: number;
      currency: string;
      status: string;
    }>('SELECT user_id, metadata, amount, currency, status FROM payments WHERE id = $1 AND provider = $2', [
      paymentId,
      provider,
    ]);
  }

  markPaymentCompleted(client: PoolClient, paymentId: string) {
    return client.query(
      `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [paymentId]
    );
  }

  insertActiveSubscriptionReturningId(
    client: PoolClient,
    params: {
      userId: string;
      planId: string;
      billingCycle: string;
      periodStart: Date;
      periodEnd: Date;
    }
  ) {
    return client.query<{ id: string }>(
      `INSERT INTO subscriptions
         (user_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', $3, $4, $5)
       RETURNING id`,
      [params.userId, params.planId, params.billingCycle, params.periodStart, params.periodEnd]
    );
  }

  insertManualPendingPayment(params: {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    metadataJson: string;
  }) {
    return query<{ id: string }>(
      `INSERT INTO payments
         (user_id, amount, currency, status, provider, description, metadata)
       VALUES ($1, $2, $3, 'pending', 'manual', $4, $5)
       RETURNING id`,
      [params.userId, params.amount, params.currency, params.description, params.metadataJson]
    );
  }

  getManualPaymentOwnerStatus(paymentId: string) {
    return query<{ user_id: string; status: string }>(
      `SELECT user_id, status FROM payments WHERE id = $1 AND provider = 'manual'`,
      [paymentId]
    );
  }

  markManualPaymentProcessing(paymentId: string) {
    return query(
      `UPDATE payments SET status = 'processing', updated_at = NOW() WHERE id = $1`,
      [paymentId]
    );
  }

  insertKriptomanPendingPayment(params: {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    metadataJson: string;
  }) {
    return query<{ id: string }>(
      `INSERT INTO payments
         (user_id, amount, currency, status, provider, description, metadata)
       VALUES ($1, $2, $3, 'pending', 'kriptoman', $4, $5)
       RETURNING id`,
      [params.userId, params.amount, params.currency, params.description, params.metadataJson]
    );
  }

  updateKriptomanPaymentMetadata(paymentId: string, invoiceId: string, metadataPatchJson: string) {
    return query(
      `UPDATE payments
       SET provider_payment_id = $2,
           metadata = metadata || $3::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [paymentId, invoiceId, metadataPatchJson]
    );
  }

  getKriptomanPaymentForSync(paymentId: string, userId: string) {
    return query<{ status: string; provider_payment_id: string | null }>(
      `SELECT status, provider_payment_id FROM payments
       WHERE id = $1 AND user_id = $2 AND provider = 'kriptoman'`,
      [paymentId, userId]
    );
  }

  findKriptomanPaymentIdByInvoiceId(invoiceId: string) {
    return query<{ id: string }>(
      `SELECT id FROM payments
       WHERE provider = 'kriptoman' AND provider_payment_id = $1
       LIMIT 1`,
      [invoiceId]
    );
  }

  getKriptomanPaymentStatus(paymentId: string) {
    return query<{ status: string }>(
      `SELECT status FROM payments WHERE id = $1 AND provider = 'kriptoman'`,
      [paymentId]
    );
  }

  countPaymentsByUser(userId: string) {
    return query<{ count: string }>('SELECT COUNT(*) FROM payments WHERE user_id = $1', [userId]);
  }

  listPaymentsByUser(userId: string, limit: number, offset: number) {
    return query(
      `SELECT * FROM payments WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }
}
