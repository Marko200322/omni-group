/**
 * Pregled faktura — isti HTML kao Atina email šabloni.
 * Drži sinhronizovano sa atina-platform/atina/src/modules/payments/templates/invoice-email.template.ts
 */
import {
  renderAdminPendingEmail,
  renderManualCheckoutInvoiceEmail,
  renderPaidInvoiceEmail,
} from './invoice-email-template';

const brand = {
  name: 'Omni Group',
  url: 'https://omnigroup.io',
  tagline: 'Digitalna platforma za rast i automatizaciju',
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
    toEmail: 'marko@primer.rs',
    planName: 'Rast',
    planSlug: 'pro',
    planDescription: 'Napredni moduli, više automatskih zadataka i prioritetna podrška.',
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
      note: 'U polje poziv na broj unesite tačno referencu ATINA-MK7F2A9B. Bez reference uplata se ne može automatski povezati.',
    },
    issueDate,
  });

  const paid = renderPaidInvoiceEmail({
    brand,
    toName: 'Marko Kosic',
    toEmail: 'marko@primer.rs',
    invoiceNumber: 'INV-202605-0042',
    planName: 'Rast',
    planSlug: 'pro',
    planDescription: 'Napredni moduli, više automatskih zadataka i prioritetna podrška.',
    billingCycle: 'yearly',
    amount: 990,
    total: 990,
    currency: 'EUR',
    lineItems: [
      { description: 'Rast (pro) — Godišnja pretplata', amount: 990, quantity: 1 },
      { description: 'Uključeno: CRM, automatizacije, video sastanci', amount: 0, quantity: 1 },
    ],
    periodStart: '2026-05-27T00:00:00.000Z',
    periodEnd: '2027-05-27T00:00:00.000Z',
    purchasedAt: issueDate,
    billingUrl: 'https://omnigroup.io/dashboard#billing',
  });

  const admin = renderAdminPendingEmail({
    brand,
    userEmail: 'marko@primer.rs',
    userName: 'Marko Kosic',
    planName: 'Poslovni',
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
      title: 'Proforma faktura',
      description: 'Šalje se klijentu pri manual checkout-u — IBAN, referenca i stavke.',
      subject: proforma.subject,
      html: proforma.html,
    },
    {
      id: 'paid',
      title: 'Faktura (plaćeno)',
      description: 'Potvrda nakon admin potvrde uplate — zvanična faktura sa periodom važenja.',
      subject: paid.subject,
      html: paid.html,
    },
    {
      id: 'admin',
      title: 'Admin obaveštenje',
      description: 'Interni email operatoru kada klijent označi da je poslao uplatu.',
      subject: admin.subject,
      html: admin.html,
    },
  ];
}
