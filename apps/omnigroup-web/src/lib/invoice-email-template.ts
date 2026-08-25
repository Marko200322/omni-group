/** Premium email/HTML invoices — compatible with email clients (tables + inline CSS). */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatMoney(amount: number, currency: string): string {
  const cur = currency.toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

export function formatDateSr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatBillingCycleSr(billingCycle: string): string {
  return billingCycle === 'yearly' ? 'Annual subscription' : 'Monthly subscription';
}

export type InvoiceLineItem = {
  description: string;
  amount: number;
  quantity: number;
};

export type InvoiceBrand = {
  name: string;
  url: string;
  tagline?: string;
  supportEmail?: string;
};

type InvoiceShellInput = {
  brand: InvoiceBrand;
  documentTitle: string;
  documentSubtitle?: string;
  invoiceNumber: string;
  issueDate: string;
  statusLabel: string;
  statusColor: string;
  clientName: string;
  clientEmail: string;
  bodyHtml: string;
  footerNote?: string;
};

function invoiceShell(input: InvoiceShellInput): string {
  const brandUrl = input.brand.url.replace(/\/+$/, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(input.documentTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f8;font-family:Segoe UI,system-ui,-apple-system,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f8;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.12)">
        <tr>
          <td style="padding:28px 32px;background:linear-gradient(135deg,#5b21b6 0%,#7c3aed 42%,#0891b2 100%);color:#fff">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.88">Omni Group Platform</p>
                  <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.2">${escapeHtml(input.brand.name)}</h1>
                  ${input.brand.tagline ? `<p style="margin:8px 0 0;font-size:13px;opacity:0.9">${escapeHtml(input.brand.tagline)}</p>` : ''}
                </td>
                <td align="right" style="vertical-align:top">
                  <p style="margin:0;font-size:12px;opacity:0.85;text-transform:uppercase;letter-spacing:0.12em">${escapeHtml(input.documentTitle)}</p>
                  ${input.documentSubtitle ? `<p style="margin:6px 0 0;font-size:13px;opacity:0.95">${escapeHtml(input.documentSubtitle)}</p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 12px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:50%;vertical-align:top;padding-right:12px">
                  <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b">Document number</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e1b4b">${escapeHtml(input.invoiceNumber)}</p>
                </td>
                <td style="width:50%;vertical-align:top;padding-left:12px" align="right">
                  <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b">Date</p>
                  <p style="margin:0;font-size:15px;font-weight:600">${escapeHtml(input.issueDate)}</p>
                  <p style="margin:12px 0 0;display:inline-block;padding:6px 12px;border-radius:999px;background:${input.statusColor};color:#fff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${escapeHtml(input.statusLabel)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 24px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
              <tr>
                <td style="padding:16px 18px">
                  <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b">Bill to</p>
                  <p style="margin:0;font-size:16px;font-weight:700">${escapeHtml(input.clientName)}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#475569">${escapeHtml(input.clientEmail)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px">
            ${input.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">
            <p style="margin:0 0 8px;font-size:12px;color:#64748b">${escapeHtml(input.footerNote ?? 'Thank you for your business. This message was automatically generated by the Omni Group platform.')}</p>
            <p style="margin:0;font-size:12px;color:#94a3b8">
              <a href="${escapeHtml(brandUrl)}" style="color:#7c3aed;text-decoration:none;font-weight:600">${escapeHtml(brandUrl)}</a>
              ${input.brand.supportEmail ? ` · <a href="mailto:${escapeHtml(input.brand.supportEmail)}" style="color:#7c3aed;text-decoration:none">${escapeHtml(input.brand.supportEmail)}</a>` : ''}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function lineItemsTable(lineItems: InvoiceLineItem[], currency: string, subtotal: number): string {
  const rows = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a">${escapeHtml(item.description)}</td>
        <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569">${item.quantity}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a">${escapeHtml(formatMoney(item.amount, currency))}</td>
      </tr>`
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:0 0 20px">
      <thead>
        <tr style="background:linear-gradient(180deg,#f8fafc,#f1f5f9)">
          <th align="left" style="padding:12px 16px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Item</th>
          <th style="padding:12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Qty</th>
          <th align="right" style="padding:12px 16px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#faf5ff">
          <td colspan="2" style="padding:16px;text-align:right;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em">Total</td>
          <td style="padding:16px;text-align:right;font-size:20px;font-weight:800;color:#5b21b6">${escapeHtml(formatMoney(subtotal, currency))}</td>
        </tr>
      </tfoot>
    </table>`;
}

function paymentBox(title: string, rows: Array<[string, string]>, note?: string): string {
  const body = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 0;color:#64748b;font-size:13px;width:38%;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:#0f172a">${value}</td>
      </tr>`
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#faf5ff,#ecfeff);border:1px solid #ddd6fe;border-radius:12px;margin:0 0 8px">
      <tr><td style="padding:18px 20px">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6d28d9;font-weight:700">${escapeHtml(title)}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${body}</table>
        ${note ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.55;color:#475569">${note}</p>` : ''}
      </td></tr>
    </table>`;
}

export type ManualInvoiceEmailInput = {
  brand: InvoiceBrand;
  toName: string;
  toEmail: string;
  planName: string;
  planSlug: string;
  planDescription?: string;
  billingCycle: string;
  amount: number;
  currency: string;
  reference: string;
  proformaNumber: string;
  instructions: Record<string, string>;
  issueDate: string;
};

export function renderManualCheckoutInvoiceEmail(input: ManualInvoiceEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const cycleLabel = formatBillingCycleSr(input.billingCycle);
  const lineItems: InvoiceLineItem[] = [
    {
      description: `${input.planName} (${input.planSlug}) — ${cycleLabel}`,
      amount: input.amount,
      quantity: 1,
    },
  ];
  if (input.planDescription?.trim()) {
    lineItems.push({
      description: input.planDescription.trim(),
      amount: 0,
      quantity: 1,
    });
  }

  const iban = input.instructions.iban ?? '';
  const accountName = input.instructions.accountName ?? '';
  const bankName = input.instructions.bankName ?? '';
  const swift = input.instructions.swift ?? '';
  const note = input.instructions.note ?? '';
  const companyLegalName = input.instructions.companyLegalName ?? '';
  const companyTaxId = input.instructions.companyTaxId ?? '';
  const companyAddress = input.instructions.companyAddress ?? '';

  const issuerRows: Array<[string, string]> = [];
  if (companyLegalName) issuerRows.push(['Legal name', escapeHtml(companyLegalName)]);
  if (companyTaxId) issuerRows.push(['Tax ID / PIB', escapeHtml(companyTaxId)]);
  if (companyAddress) issuerRows.push(['Address', escapeHtml(companyAddress)]);

  const bodyHtml = `
    ${lineItemsTable(lineItems, input.currency, input.amount)}
    ${issuerRows.length ? paymentBox('Issuer', issuerRows) : ''}
    ${paymentBox(
      'Bank transfer details',
      [
        ['Amount', `<span style="font-size:18px;color:#5b21b6">${escapeHtml(formatMoney(input.amount, input.currency))}</span>`],
        ['Reference / payment ID', `<code style="background:#fff;padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0">${escapeHtml(input.reference)}</code>`],
        ['Beneficiary', escapeHtml(accountName)],
        ['IBAN', escapeHtml(iban)],
        ['Bank', escapeHtml(bankName)],
        ...(swift ? [['SWIFT/BIC', escapeHtml(swift)] as [string, string]] : []),
      ],
      escapeHtml(note) +
        '<br/><br/>After payment, click <strong>"I have sent the payment"</strong> in the app. Your plan will be activated after admin confirmation.'
    )}
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.6">
      VAT and fiscal receipts are issued in accordance with applicable regulations when the issuer is registered for trade.
      These instructions serve as a proforma invoice for payment identification.
    </p>`;

  const html = invoiceShell({
    brand: input.brand,
    documentTitle: 'Proforma invoice',
    documentSubtitle: 'Payment instructions',
    invoiceNumber: input.proformaNumber,
    issueDate: formatDateSr(input.issueDate),
    statusLabel: 'Awaiting payment',
    statusColor: '#d97706',
    clientName: input.toName || input.toEmail,
    clientEmail: input.toEmail,
    bodyHtml,
  });

  const subject = `Proforma invoice ${input.proformaNumber} — ${input.planName} (${cycleLabel})`;
  const text = [
    `Proforma: ${input.proformaNumber}`,
    `Plan: ${input.planName} — ${cycleLabel}`,
    `Total: ${formatMoney(input.amount, input.currency)}`,
    `Reference: ${input.reference}`,
    `IBAN: ${iban}`,
    `Beneficiary: ${accountName}`,
    note,
  ].join('\n');

  return { subject, html, text };
}

export type PaidInvoiceEmailInput = {
  brand: InvoiceBrand;
  toName: string;
  toEmail: string;
  invoiceNumber: string;
  planName: string;
  planSlug: string;
  planDescription?: string;
  billingCycle: string;
  amount: number;
  total: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  periodStart: string;
  periodEnd: string;
  purchasedAt: string;
  billingUrl: string;
};

export function renderPaidInvoiceEmail(input: PaidInvoiceEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const cycleLabel = formatBillingCycleSr(input.billingCycle);
  const items =
    input.lineItems.length > 0
      ? input.lineItems
      : [{ description: `${input.planName} (${input.planSlug}) — ${cycleLabel}`, amount: input.amount, quantity: 1 }];

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155">
      Payment verified and confirmed. Your <strong>${escapeHtml(input.planName)}</strong> plan is now active.
    </p>
    ${lineItemsTable(items, input.currency, input.total)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px">
      <tr>
        <td style="width:50%;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
          <p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase">Service period</p>
          <p style="margin:0;font-size:14px;font-weight:600">${escapeHtml(formatDateSr(input.periodStart))} — ${escapeHtml(formatDateSr(input.periodEnd))}</p>
        </td>
        <td style="width:8px"></td>
        <td style="width:50%;padding:12px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px">
          <p style="margin:0 0 4px;font-size:11px;color:#047857;text-transform:uppercase">Status</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:#047857">Paid · ${escapeHtml(formatMoney(input.total, input.currency))}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;text-align:center">
      <a href="${escapeHtml(input.billingUrl)}" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">View invoice in dashboard</a>
    </p>`;

  const html = invoiceShell({
    brand: input.brand,
    documentTitle: 'Invoice',
    documentSubtitle: 'Purchase confirmation',
    invoiceNumber: input.invoiceNumber,
    issueDate: formatDateSr(input.purchasedAt),
    statusLabel: 'Paid',
    statusColor: '#059669',
    clientName: input.toName || input.toEmail,
    clientEmail: input.toEmail,
    bodyHtml,
    footerNote: 'Keep this message as proof of payment. For plan and support questions, use the link above.',
  });

  const subject = `Invoice ${input.invoiceNumber} — ${input.planName} · ${formatMoney(input.total, input.currency)}`;
  const text = [
    `Invoice: ${input.invoiceNumber}`,
    `Plan: ${input.planName}`,
    `Total: ${formatMoney(input.total, input.currency)}`,
    `Status: Paid`,
    `Period: ${formatDateSr(input.periodStart)} - ${formatDateSr(input.periodEnd)}`,
    ...items.map((item) => `- ${item.description}: ${formatMoney(item.amount, input.currency)}`),
    input.billingUrl,
  ].join('\n');

  return { subject, html, text };
}

export type AdminPendingEmailInput = {
  brand: InvoiceBrand;
  userEmail: string;
  userName: string;
  planName: string;
  billingCycle: string;
  amount: number;
  currency: string;
  reference: string;
  paymentId: string;
  dashboardUrl: string;
  issueDate: string;
};

export function renderAdminPendingEmail(input: AdminPendingEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const cycleLabel = formatBillingCycleSr(input.billingCycle);
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">
      The client marked the payment as sent. Review the bank statement and confirm in the admin panel.
    </p>
    ${paymentBox('Payment details', [
      ['Client', `${escapeHtml(input.userName)} &lt;${escapeHtml(input.userEmail)}&gt;`],
      ['Purchase', `<strong>${escapeHtml(input.planName)}</strong> · ${escapeHtml(cycleLabel)}`],
      ['Amount', escapeHtml(formatMoney(input.amount, input.currency))],
      ['Reference', escapeHtml(input.reference)],
      ['Payment ID', `<code style="font-size:12px">${escapeHtml(input.paymentId)}</code>`],
    ])}
    <p style="margin:0;text-align:center">
      <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;padding:12px 22px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Open admin panel</a>
    </p>`;

  const html = invoiceShell({
    brand: input.brand,
    documentTitle: 'Notification',
    documentSubtitle: 'Payment pending review',
    invoiceNumber: input.reference,
    issueDate: formatDateSr(input.issueDate),
    statusLabel: 'Under review',
    statusColor: '#2563eb',
    clientName: input.userName || input.userEmail,
    clientEmail: input.userEmail,
    bodyHtml,
    footerNote: 'Internal operator notification — do not forward to the client.',
  });

  const subject = `Payment pending review — ${input.userName || input.userEmail} · ${formatMoney(input.amount, input.currency)}`;
  const text = [
    `Client: ${input.userName} <${input.userEmail}>`,
    `Plan: ${input.planName} (${cycleLabel})`,
    `Amount: ${formatMoney(input.amount, input.currency)}`,
    `Reference: ${input.reference}`,
    `Payment ID: ${input.paymentId}`,
    input.dashboardUrl,
  ].join('\n');

  return { subject, html, text };
}
