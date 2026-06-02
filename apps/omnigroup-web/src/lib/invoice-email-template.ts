/** Premium email/HTML fakture — kompatibilno sa email klijentima (tabele + inline CSS). */

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
    return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: cur }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

export function formatDateSr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatBillingCycleSr(billingCycle: string): string {
  return billingCycle === 'yearly' ? 'Godišnja pretplata' : 'Mesečna pretplata';
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
<html lang="sr">
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
                  <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b">Broj dokumenta</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e1b4b">${escapeHtml(input.invoiceNumber)}</p>
                </td>
                <td style="width:50%;vertical-align:top;padding-left:12px" align="right">
                  <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b">Datum</p>
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
                  <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b">Kupac</p>
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
            <p style="margin:0 0 8px;font-size:12px;color:#64748b">${escapeHtml(input.footerNote ?? 'Hvala na poverenju. Ova poruka je automatski generisana iz Omni Group platforme.')}</p>
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
          <th align="left" style="padding:12px 16px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Stavka</th>
          <th style="padding:12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Kol.</th>
          <th align="right" style="padding:12px 16px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Iznos</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#faf5ff">
          <td colspan="2" style="padding:16px;text-align:right;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em">Ukupno</td>
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

  const bodyHtml = `
    ${lineItemsTable(lineItems, input.currency, input.amount)}
    ${paymentBox(
      'Podaci za bankovnu uplatu',
      [
        ['Iznos', `<span style="font-size:18px;color:#5b21b6">${escapeHtml(formatMoney(input.amount, input.currency))}</span>`],
        ['Referenca / poziv na broj', `<code style="background:#fff;padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0">${escapeHtml(input.reference)}</code>`],
        ['Primalac', escapeHtml(accountName)],
        ['IBAN', escapeHtml(iban)],
        ['Banka', escapeHtml(bankName)],
        ...(swift ? [['SWIFT/BIC', escapeHtml(swift)] as [string, string]] : []),
      ],
      escapeHtml(note) +
        '<br/><br/>Posle uplate, u aplikaciji klikni <strong>„Poslao sam uplatu“</strong>. Aktivacija plana nakon admin potvrde.'
    )}
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.6">
      PDV i fiskalni račun izdaju se po važećim propisima kada izdavalac bude registrovan za promet.
      Ovo uputstvo služi kao proforma faktura za identifikaciju uplate.
    </p>`;

  const html = invoiceShell({
    brand: input.brand,
    documentTitle: 'Proforma faktura',
    documentSubtitle: 'Uputstvo za uplatu',
    invoiceNumber: input.proformaNumber,
    issueDate: formatDateSr(input.issueDate),
    statusLabel: 'Na čekanju uplate',
    statusColor: '#d97706',
    clientName: input.toName || input.toEmail,
    clientEmail: input.toEmail,
    bodyHtml,
  });

  const subject = `Proforma faktura ${input.proformaNumber} — ${input.planName} (${cycleLabel})`;
  const text = [
    `Proforma: ${input.proformaNumber}`,
    `Plan: ${input.planName} — ${cycleLabel}`,
    `Ukupno: ${formatMoney(input.amount, input.currency)}`,
    `Referenca: ${input.reference}`,
    `IBAN: ${iban}`,
    `Primalac: ${accountName}`,
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
      Uplata je proverena i potvrđena. Tvoj plan <strong>${escapeHtml(input.planName)}</strong> je sada aktivan.
    </p>
    ${lineItemsTable(items, input.currency, input.total)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px">
      <tr>
        <td style="width:50%;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
          <p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase">Period važenja</p>
          <p style="margin:0;font-size:14px;font-weight:600">${escapeHtml(formatDateSr(input.periodStart))} — ${escapeHtml(formatDateSr(input.periodEnd))}</p>
        </td>
        <td style="width:8px"></td>
        <td style="width:50%;padding:12px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px">
          <p style="margin:0 0 4px;font-size:11px;color:#047857;text-transform:uppercase">Status</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:#047857">Plaćeno · ${escapeHtml(formatMoney(input.total, input.currency))}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;text-align:center">
      <a href="${escapeHtml(input.billingUrl)}" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Pogledaj fakturu u dashboardu</a>
    </p>`;

  const html = invoiceShell({
    brand: input.brand,
    documentTitle: 'Faktura',
    documentSubtitle: 'Potvrda kupovine',
    invoiceNumber: input.invoiceNumber,
    issueDate: formatDateSr(input.purchasedAt),
    statusLabel: 'Plaćeno',
    statusColor: '#059669',
    clientName: input.toName || input.toEmail,
    clientEmail: input.toEmail,
    bodyHtml,
    footerNote: 'Sačuvaj ovu poruku kao potvrdu uplate. Za pitanja o planu i podršci koristi link iznad.',
  });

  const subject = `Faktura ${input.invoiceNumber} — ${input.planName} · ${formatMoney(input.total, input.currency)}`;
  const text = [
    `Faktura: ${input.invoiceNumber}`,
    `Plan: ${input.planName}`,
    `Ukupno: ${formatMoney(input.total, input.currency)}`,
    `Status: Plaćeno`,
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
      Klijent je označio da je poslao uplatu. Proveri bankovni izvod i potvrdi u admin panelu.
    </p>
    ${paymentBox('Detalji uplate', [
      ['Klijent', `${escapeHtml(input.userName)} &lt;${escapeHtml(input.userEmail)}&gt;`],
      ['Kupljeno', `<strong>${escapeHtml(input.planName)}</strong> · ${escapeHtml(cycleLabel)}`],
      ['Iznos', escapeHtml(formatMoney(input.amount, input.currency))],
      ['Referenca', escapeHtml(input.reference)],
      ['Payment ID', `<code style="font-size:12px">${escapeHtml(input.paymentId)}</code>`],
    ])}
    <p style="margin:0;text-align:center">
      <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;padding:12px 22px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Otvori admin panel</a>
    </p>`;

  const html = invoiceShell({
    brand: input.brand,
    documentTitle: 'Obaveštenje',
    documentSubtitle: 'Uplata na čekanju',
    invoiceNumber: input.reference,
    issueDate: formatDateSr(input.issueDate),
    statusLabel: 'Provera',
    statusColor: '#2563eb',
    clientName: input.userName || input.userEmail,
    clientEmail: input.userEmail,
    bodyHtml,
    footerNote: 'Interno obaveštenje za operatora — ne prosleđuj klijentu.',
  });

  const subject = `Uplata na čekanju — ${input.userName || input.userEmail} · ${formatMoney(input.amount, input.currency)}`;
  const text = [
    `Klijent: ${input.userName} <${input.userEmail}>`,
    `Plan: ${input.planName} (${cycleLabel})`,
    `Iznos: ${formatMoney(input.amount, input.currency)}`,
    `Referenca: ${input.reference}`,
    `Payment ID: ${input.paymentId}`,
    input.dashboardUrl,
  ].join('\n');

  return { subject, html, text };
}
