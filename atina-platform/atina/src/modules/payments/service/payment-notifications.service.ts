import { config } from '../../../config';
import { NotificationsService } from '../../notifications/service/notifications.service';
import logger from '../../../utils/logger';
import {
  formatBillingCycleSr,
  formatDateSr,
  formatMoney,
  renderAdminPendingEmail,
  renderManualCheckoutInvoiceEmail,
  renderPaidInvoiceEmail,
  type InvoiceLineItem,
} from '../templates/invoice-email.template';
import { generateInvoicePdfBuffer, generateProformaPdfBuffer } from './invoice-pdf.service';

export { formatBillingCycleSr, formatDateSr, type InvoiceLineItem };

export function buildProformaNumber(reference: string, date = new Date()): string {
  const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const suffix = reference.replace(/^ATINA-?/i, '').slice(-8).toUpperCase() || reference.slice(-6).toUpperCase();
  return `PRO-${ym}-${suffix}`;
}

function invoiceBrand() {
  return {
    name: config.app.name || 'Omni Group',
    url: config.app.url || 'https://omnigroup.io',
    tagline: 'Digital platform for growth and automation',
    supportEmail: config.paymentNotifyEmail.trim() || config.admin.email || undefined,
  };
}

export type ManualCheckoutEmailInput = {
  toEmail: string;
  toName: string;
  planName: string;
  planSlug: string;
  planDescription?: string;
  billingCycle: string;
  amount: number;
  currency: string;
  reference: string;
  instructions: Record<string, string>;
  paymentId: string;
};

export type PaymentPendingAdminInput = {
  userEmail: string;
  userName: string;
  planName: string;
  billingCycle: string;
  amount: number;
  currency: string;
  reference: string;
  paymentId: string;
};

export type InvoicePaidEmailInput = {
  toEmail: string;
  toName: string;
  invoiceNumber: string;
  planName: string;
  planSlug: string;
  planDescription?: string;
  billingCycle: string;
  amount: number;
  total: number;
  currency: string;
  paymentId: string;
  lineItems: InvoiceLineItem[];
  periodStart: string;
  periodEnd: string;
  purchasedAt: string;
};

export class PaymentNotificationsService {
  private readonly notifications = new NotificationsService();

  private paymentNotifyEmail(): string {
    return config.paymentNotifyEmail.trim() || config.admin.email;
  }

  async sendManualCheckoutInstructions(input: ManualCheckoutEmailInput): Promise<void> {
    const issueDate = new Date().toISOString();
    const proformaNumber = buildProformaNumber(input.reference, new Date(issueDate));
    const { subject, html, text } = renderManualCheckoutInvoiceEmail({
      brand: invoiceBrand(),
      toName: input.toName,
      toEmail: input.toEmail,
      planName: input.planName,
      planSlug: input.planSlug,
      planDescription: input.planDescription,
      billingCycle: input.billingCycle,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      proformaNumber,
      instructions: input.instructions,
      issueDate,
    });

    const pdf = await generateProformaPdfBuffer({
      proformaNumber,
      brandName: invoiceBrand().name,
      toName: input.toName,
      toEmail: input.toEmail,
      planName: input.planName,
      billingCycle: input.billingCycle,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      instructions: input.instructions,
      issueDate,
    });

    await this.notifications.sendEmail(input.toEmail, subject, html, text, [
      {
        filename: `${proformaNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ]);
  }

  async notifyAdminPaymentPending(input: PaymentPendingAdminInput): Promise<void> {
    const adminTo = this.paymentNotifyEmail();
    const dashboardUrl = `${config.app.url.replace(/\/+$/, '')}/admin`;
    const { subject, html, text } = renderAdminPendingEmail({
      brand: invoiceBrand(),
      userEmail: input.userEmail,
      userName: input.userName,
      planName: input.planName,
      billingCycle: input.billingCycle,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      paymentId: input.paymentId,
      dashboardUrl,
      issueDate: new Date().toISOString(),
    });

    await this.notifications.sendEmail(adminTo, subject, html, text);

    try {
      const { WebPushService } = await import('../../admin/service/web-push.service');
      const push = new WebPushService();
      if (push.isConfigured()) {
        await push.notifyAdmins({
          title: 'New payment pending',
          body: `${input.userName} · ${formatMoney(input.amount, input.currency)} · ${input.planName}`,
          url: '/admin/mobile',
          tag: `payment-pending-${input.paymentId}`,
        });
      }
    } catch {
      /* push optional */
    }
  }

  async sendInvoiceConfirmationToClient(input: InvoicePaidEmailInput): Promise<void> {
    const billingUrl = `${config.app.url.replace(/\/+$/, '')}/dashboard#billing`;
    const { subject, html, text } = renderPaidInvoiceEmail({
      brand: invoiceBrand(),
      toName: input.toName,
      toEmail: input.toEmail,
      invoiceNumber: input.invoiceNumber,
      planName: input.planName,
      planSlug: input.planSlug,
      planDescription: input.planDescription,
      billingCycle: input.billingCycle,
      amount: input.amount,
      total: input.total,
      currency: input.currency,
      lineItems: input.lineItems,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      purchasedAt: input.purchasedAt,
      billingUrl,
    });

    const pdf = await generateInvoicePdfBuffer({
      invoiceNumber: input.invoiceNumber,
      brandName: invoiceBrand().name,
      toName: input.toName,
      toEmail: input.toEmail,
      planName: input.planName,
      billingCycle: input.billingCycle,
      amount: input.amount,
      total: input.total,
      currency: input.currency,
      lineItems: input.lineItems,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      purchasedAt: input.purchasedAt,
    });

    await this.notifications.sendEmail(input.toEmail, subject, html, text, [
      {
        filename: `${input.invoiceNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ]);
  }

  buildPurchaseConfirmedMessage(input: {
    planName: string;
    billingCycle: string;
    total: number;
    currency: string;
    invoiceNumber: string;
    periodEnd: string;
  }): string {
    return [
      `Purchased: ${input.planName} (${formatBillingCycleSr(input.billingCycle)}).`,
      `Amount: ${formatMoney(input.total, input.currency)}.`,
      `Invoice: ${input.invoiceNumber}.`,
      `Plan active until ${formatDateSr(input.periodEnd)}.`,
    ].join(' ');
  }

  async createInAppPaymentNotification(
    userId: string,
    type: 'payment_pending' | 'payment_confirmed',
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.notifications.createNotification({
        userId,
        type,
        title,
        message,
        channel: 'in_app',
        actionUrl: '/dashboard#billing',
        metadata,
      });
    } catch (err) {
      logger.warn('In-app payment notification failed', {
        userId,
        type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
