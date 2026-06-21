/**
 * Invoice preview — same HTML as Atina email templates.
 * Keep in sync with atina-platform/atina/src/modules/payments/templates/invoice-email.template.ts
 */
import {
  renderAdminPendingEmail,
  renderManualCheckoutInvoiceEmail,
  renderPaidInvoiceEmail,
} from './invoice-email-template';

const brand = {
  name: 'Omni Group',
  url: 'https://omnigroup.io',
  tagline: 'Digital platform for growth and automation',
  supportEmail: 'billing@omnigroup.io',
};

const issueDate = '2026-05-27T10:30:00.000Z';

export type InvoicePreviewVariant = 'proforma' | 'paid' | 'admin';

export type InvoicePreviewSample = {
  id: InvoicePreviewVariant;
  title: string;
  description: string;
  subject: string;
  html: string;
};

export function getInvoicePreviewSamples(): InvoicePreviewSample[] {
  const proforma = renderManualCheckoutInvoiceEmail({
    brand,
    toName: 'Marko Kosic',
    toEmail: 'marko@example.com',
    planName: 'Growth',
    planSlug: 'pro',
    planDescription: 'Advanced modules, more automated tasks, and priority support.',
    billingCycle: 'monthly',
    amount: 99,
    currency: 'EUR',
    reference: 'ATINA-MK7F2A9B',
    proformaNumber: 'PRO-202605-MK7F2A9B',
    instructions: {
      accountName: 'Marko Kosic pr Omni Group',
      iban: 'RS35260000556211337868',
      bankName: 'Raiffeisen banka a.d. Beograd',
      swift: 'RZBSRSBG',
      note: 'Enter reference ATINA-MK7F2A9B exactly in the payment reference field. Payments without a reference cannot be matched automatically.',
    },
    issueDate,
  });

  const paid = renderPaidInvoiceEmail({
    brand,
    toName: 'Marko Kosic',
    toEmail: 'marko@example.com',
    invoiceNumber: 'INV-202605-0042',
    planName: 'Growth',
    planSlug: 'pro',
    planDescription: 'Advanced modules, more automated tasks, and priority support.',
    billingCycle: 'yearly',
    amount: 990,
    total: 990,
    currency: 'EUR',
    lineItems: [
      { description: 'Growth (pro) — Annual subscription', amount: 990, quantity: 1 },
      { description: 'Included: CRM, automations, video meetings', amount: 0, quantity: 1 },
    ],
    periodStart: '2026-05-27T00:00:00.000Z',
    periodEnd: '2027-05-27T00:00:00.000Z',
    purchasedAt: issueDate,
    billingUrl: 'https://omnigroup.io/dashboard#billing',
  });

  const admin = renderAdminPendingEmail({
    brand,
    userEmail: 'marko@example.com',
    userName: 'Marko Kosic',
    planName: 'Business',
    billingCycle: 'monthly',
    amount: 39,
    currency: 'EUR',
    reference: 'ATINA-MK7F2A9B',
    paymentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    dashboardUrl: 'https://omnigroup.io/admin',
    issueDate,
  });

  return [
    {
      id: 'proforma',
      title: 'Proforma invoice',
      description: 'Sent to the client during manual checkout — IBAN, reference, and line items.',
      subject: proforma.subject,
      html: proforma.html,
    },
    {
      id: 'paid',
      title: 'Invoice (paid)',
      description: 'Confirmation after admin payment approval — official invoice with service period.',
      subject: paid.subject,
      html: paid.html,
    },
    {
      id: 'admin',
      title: 'Admin notification',
      description: 'Internal email to the operator when the client marks a payment as sent.',
      subject: admin.subject,
      html: admin.html,
    },
  ];
}
