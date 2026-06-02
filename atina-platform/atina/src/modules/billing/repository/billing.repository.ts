import { query } from '../../../database/connection';

export type PlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  stripe_price_id_monthly?: string | null;
  stripe_price_id_yearly?: string | null;
};

export class BillingRepository {
  listActivePlans() {
    return query<PlanRow>('SELECT * FROM plans WHERE is_active = true ORDER BY sort_order');
  }

  getPlanBySlug(slug: string) {
    return query<PlanRow>('SELECT * FROM plans WHERE slug = $1 AND is_active = true', [slug]);
  }

  getPlanById(id: string) {
    return query<PlanRow>('SELECT * FROM plans WHERE id = $1', [id]);
  }

  getUserCurrentSubscription(userId: string) {
    return query(
      `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug,
              p.price_monthly, p.price_yearly, p.features, p.limits
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );
  }

  countUserInvoices(userId: string) {
    return query<{ count: string }>('SELECT COUNT(*) FROM invoices WHERE user_id = $1', [userId]);
  }

  listUserInvoices(userId: string, limit: number, offset: number) {
    return query(
      `SELECT * FROM invoices WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  getInvoiceById(invoiceId: string, userId: string) {
    return query('SELECT * FROM invoices WHERE id = $1 AND user_id = $2', [invoiceId, userId]);
  }

  getUserPlanLimits(userId: string) {
    return query(
      `SELECT p.limits FROM users u
       JOIN plans p ON u.plan_id = p.id
       WHERE u.id = $1`,
      [userId]
    );
  }

  countUserTasksThisMonth(userId: string) {
    return query<{ count: string }>(
      `SELECT COUNT(*) FROM tasks
       WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
      [userId]
    );
  }

  countInvoicesThisMonth() {
    return query<{ count: string }>(
      `SELECT COUNT(*) FROM invoices
       WHERE created_at >= date_trunc('month', NOW())`
    );
  }

  countInvoicesByNumberPrefix(prefix: string) {
    return query<{ count: string }>(
      `SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1`,
      [`${prefix}-%`]
    );
  }

  insertInvoice(params: {
    invoiceNumber: string;
    userId: string;
    subscriptionId: string | null;
    paymentId: string | null;
    amount: number;
    taxAmount: number;
    total: number;
    currency: string;
    lineItemsJson: string;
    billingDetailsJson: string;
    stripeInvoiceId: string | null;
  }) {
    return query(
      `INSERT INTO invoices
         (invoice_number, user_id, subscription_id, payment_id, amount,
          tax_amount, total_amount, currency, status, line_items, billing_details, stripe_invoice_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9, $10, $11)
       RETURNING *`,
      [
        params.invoiceNumber,
        params.userId,
        params.subscriptionId,
        params.paymentId,
        params.amount,
        params.taxAmount,
        params.total,
        params.currency,
        params.lineItemsJson,
        params.billingDetailsJson,
        params.stripeInvoiceId,
      ]
    );
  }
}
