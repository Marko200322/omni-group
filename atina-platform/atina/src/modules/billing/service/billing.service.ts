import { NotFoundError, ValidationError } from '../../../utils/errors';
import { BillingRepository, type PlanRow } from '../repository/billing.repository';

export type Plan = PlanRow;

function normalizePlan(row: PlanRow): Plan {
  return {
    ...row,
    price_monthly: Number(row.price_monthly ?? 0),
    price_yearly: Number(row.price_yearly ?? 0),
  };
}

export class BillingService {
  private readonly repo = new BillingRepository();

  async getPlans(): Promise<Plan[]> {
    const { rows } = await this.repo.listActivePlans();
    return rows.map(normalizePlan);
  }

  async getPlanBySlug(slug: string): Promise<Plan> {
    const { rows } = await this.repo.getPlanBySlug(slug);
    if (!rows[0]) throw new NotFoundError('Plan');
    return normalizePlan(rows[0]);
  }

  async getPlanById(id: string): Promise<Plan> {
    const { rows } = await this.repo.getPlanById(id);
    if (!rows[0]) throw new NotFoundError('Plan');
    return normalizePlan(rows[0]);
  }

  async getUserCurrentSubscription(userId: string) {
    const { rows } = await this.repo.getUserCurrentSubscription(userId);
    return rows[0] || null;
  }

  async getUserInvoices(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
    const offset = (safePage - 1) * safeLimit;
    const countResult = await this.repo.countUserInvoices(userId);
    const total = parseInt(countResult.rows[0].count, 10);
    const { rows } = await this.repo.listUserInvoices(userId, safeLimit, offset);
    return { invoices: rows, total };
  }

  async getInvoiceById(invoiceId: string, userId: string) {
    const { rows } = await this.repo.getInvoiceById(invoiceId, userId);
    if (!rows[0]) throw new NotFoundError('Invoice');
    return rows[0];
  }

  async checkPlanLimit(userId: string, limitKey: string): Promise<boolean> {
    const { rows } = await this.repo.getUserPlanLimits(userId);
    if (!rows[0]) return false;
    const limits = (rows[0] as { limits: Record<string, unknown> }).limits;
    const limitVal = limits[limitKey];
    if (limitVal === -1) return true;
    if (typeof limitVal !== 'number') return false;
    if (limitKey === 'tasks_per_month') {
      const { rows: usage } = await this.repo.countUserTasksThisMonth(userId);
      return parseInt(usage[0].count, 10) < limitVal;
    }
    return true;
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}`;
    const { rows } = await this.repo.countInvoicesByNumberPrefix(prefix);
    const seq = String(parseInt(rows[0].count, 10) + 1).padStart(4, '0');
    return `${prefix}-${seq}`;
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
    const { rows } = await this.repo.insertInvoice({
      invoiceNumber,
      userId: data.userId,
      subscriptionId: data.subscriptionId ?? null,
      paymentId: data.paymentId ?? null,
      amount: data.amount,
      taxAmount: data.taxAmount || 0,
      total,
      currency: data.currency || 'EUR',
      lineItemsJson: JSON.stringify(data.lineItems),
      billingDetailsJson: JSON.stringify(data.billingDetails || {}),
      stripeInvoiceId: data.stripeInvoiceId ?? null,
    });
    return rows[0];
  }
}
