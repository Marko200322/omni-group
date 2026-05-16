import { query } from '../../../database/connection';
import { NotFoundError, ValidationError } from '../../../utils/errors';

export interface Plan {
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
}

export class BillingService {
  async getPlans(): Promise<Plan[]> {
    const { rows } = await query<Plan>(
      'SELECT * FROM plans WHERE is_active = true ORDER BY sort_order'
    );
    return rows;
  }

  async getPlanBySlug(slug: string): Promise<Plan> {
    const { rows } = await query<Plan>(
      'SELECT * FROM plans WHERE slug = $1 AND is_active = true',
      [slug]
    );
    if (!rows[0]) throw new NotFoundError('Plan');
    return rows[0];
  }

  async getPlanById(id: string): Promise<Plan> {
    const { rows } = await query<Plan>('SELECT * FROM plans WHERE id = $1', [id]);
    if (!rows[0]) throw new NotFoundError('Plan');
    return rows[0];
  }

  async getUserCurrentSubscription(userId: string) {
    const { rows } = await query(
      `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug,
              p.price_monthly, p.price_yearly, p.features, p.limits
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async getUserInvoices(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
    const offset = (safePage - 1) * safeLimit;
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM invoices WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const { rows } = await query(
      `SELECT * FROM invoices WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, safeLimit, offset]
    );

    return { invoices: rows, total };
  }

  async getInvoiceById(invoiceId: string, userId: string) {
    const { rows } = await query(
      'SELECT * FROM invoices WHERE id = $1 AND user_id = $2',
      [invoiceId, userId]
    );
    if (!rows[0]) throw new NotFoundError('Invoice');
    return rows[0];
  }

  async checkPlanLimit(userId: string, limitKey: string): Promise<boolean> {
    const { rows } = await query(
      `SELECT p.limits FROM users u
       JOIN plans p ON u.plan_id = p.id
       WHERE u.id = $1`,
      [userId]
    );

    if (!rows[0]) return false;
    const limits = (rows[0] as any).limits as Record<string, unknown>;
    const limitVal = limits[limitKey];

    if (limitVal === -1) return true; // unlimited
    if (typeof limitVal !== 'number') return false;

    // Count current usage (example for tasks)
    if (limitKey === 'tasks_per_month') {
      const { rows: usage } = await query<{ count: string }>(
        `SELECT COUNT(*) FROM tasks
         WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
        [userId]
      );
      return parseInt(usage[0].count, 10) < limitVal;
    }

    return true;
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*) FROM invoices
       WHERE created_at >= date_trunc('month', NOW())`,
      []
    );
    const seq = String(parseInt(rows[0].count, 10) + 1).padStart(4, '0');
    return `INV-${year}${month}-${seq}`;
  }

  async createInvoice(data: {
    userId: string;
    subscriptionId?: string;
    paymentId?: string;
    amount: number;
    taxAmount?: number;
    currency?: string;
    lineItems: Array<{ description: string; amount: number; quantity: number }>;
    billingDetails?: Record<string, unknown>;
    stripeInvoiceId?: string;
  }) {
    if (!data.userId?.trim()) {
      throw new ValidationError('Invoice requires userId');
    }
    if (!Array.isArray(data.lineItems) || data.lineItems.length === 0) {
      throw new ValidationError('Invoice requires at least one line item');
    }
    if (!Number.isFinite(data.amount) || data.amount < 0) {
      throw new ValidationError('Invoice amount must be a non-negative finite number');
    }
    const tax = data.taxAmount ?? 0;
    if (!Number.isFinite(tax) || tax < 0) {
      throw new ValidationError('Invoice taxAmount must be a non-negative finite number');
    }
    for (const line of data.lineItems) {
      if (!line.description?.trim()) {
        throw new ValidationError('Each line item requires a description');
      }
      if (!Number.isFinite(line.amount) || line.amount < 0) {
        throw new ValidationError('Each line item amount must be a non-negative finite number');
      }
      const q = line.quantity;
      if (!Number.isFinite(q) || !Number.isInteger(q) || q < 1) {
        throw new ValidationError('Each line item quantity must be a positive integer');
      }
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const total = data.amount + (data.taxAmount || 0);

    const { rows } = await query(
      `INSERT INTO invoices
         (invoice_number, user_id, subscription_id, payment_id, amount,
          tax_amount, total_amount, currency, status, line_items, billing_details, stripe_invoice_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9, $10, $11)
       RETURNING *`,
      [
        invoiceNumber, data.userId, data.subscriptionId || null, data.paymentId || null,
        data.amount, data.taxAmount || 0, total, data.currency || 'USD',
        JSON.stringify(data.lineItems), JSON.stringify(data.billingDetails || {}),
        data.stripeInvoiceId || null,
      ]
    );

    return rows[0];
  }
}
