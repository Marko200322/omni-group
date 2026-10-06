import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';
import { escapeHtml, formatDateSr, formatMoney } from '@/lib/invoice-email-template';

type InvoiceDetail = {
  id?: string;
  invoice_number?: string;
  total_amount?: number | string;
  amount?: number | string;
  currency?: string;
  status?: string;
  line_items?: Array<{ description?: string; amount?: number; quantity?: number }>;
  created_at?: string;
  billing_details?: {
    clientName?: string;
    clientEmail?: string;
    planName?: string;
    planSlug?: string;
    billingCycle?: string;
    documentKind?: string;
    receiptType?: string;
  } | null;
};

function unwrapInvoice(payload: unknown): InvoiceDetail | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as { data?: InvoiceDetail };
  if (root.data && typeof root.data === 'object') return root.data;
  return payload as InvoiceDetail;
}

function renderPrintableInvoice(inv: InvoiceDetail, viewerEmail: string): string {
  const currency = (inv.currency ?? 'EUR').toUpperCase();
  const total = Number(inv.total_amount ?? inv.amount ?? 0);
  const lines =
    Array.isArray(inv.line_items) && inv.line_items.length > 0
      ? inv.line_items
      : [{ description: 'Subscription / service', amount: total, quantity: 1 }];
  const rows = lines
    .map((li) => {
      const amt = Number(li.amount ?? 0);
      const qty = Number(li.quantity ?? 1) || 1;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${escapeHtml(li.description ?? 'Item')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${escapeHtml(formatMoney(amt, currency))}</td>
      </tr>`;
    })
    .join('');
  const clientName = inv.billing_details?.clientName ?? 'Client';
  const clientEmail = inv.billing_details?.clientEmail ?? viewerEmail;
  const number = inv.invoice_number ?? inv.id?.slice(0, 8) ?? 'invoice';
  const issued = inv.created_at ? formatDateSr(inv.created_at) : '—';
  const isReceipt = inv.billing_details?.documentKind === 'payment_receipt';
  const docLabel = isReceipt ? 'Payment receipt' : 'Invoice';
  const footer = isReceipt
    ? 'Payment confirmation receipt. Not a VAT tax invoice — company tax identity was not configured when this was issued. Questions: hello@omnigrouptech.com'
    : 'Thank you for your business. Questions: hello@omnigrouptech.com';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docLabel)} ${escapeHtml(number)} · Omni Group Tech</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .wrap { max-width: 720px; margin: 32px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
    h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: -0.02em; }
    .muted { color: #64748b; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; }
    .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: 700; }
    .actions { margin-top: 28px; display: flex; gap: 12px; }
    .actions button, .actions a { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; text-decoration: none; color: #0f172a; cursor: pointer; }
    @media print { .actions { display: none; } body { background: #fff; } .wrap { border: none; margin: 0; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Omni Group Tech</h1>
    <p class="muted">${escapeHtml(docLabel)} · ${escapeHtml(number)} · ${escapeHtml(issued)}</p>
    <p class="muted" style="margin-top:16px">Bill to: <strong>${escapeHtml(clientName)}</strong> · ${escapeHtml(clientEmail)}</p>
    <p class="muted">Status: <strong>${escapeHtml(String(inv.status ?? 'issued').toUpperCase())}</strong></p>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #0f172a">Description</th>
          <th style="text-align:right;padding:10px 12px;border-bottom:2px solid #0f172a">Qty</th>
          <th style="text-align:right;padding:10px 12px;border-bottom:2px solid #0f172a">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="total">Total ${escapeHtml(formatMoney(Number.isFinite(total) ? total : 0, currency))}</p>
    <p class="muted">${escapeHtml(footer)}</p>
    <div class="actions">
      <button type="button" onclick="window.print()">Print / Save PDF</button>
      <a href="/dashboard/billing">Back to billing</a>
    </div>
  </div>
</body>
</html>`;
}

/** GET /api/atina/billing/invoices/:id — printable HTML invoice for clients. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const params = await Promise.resolve(ctx.params);
  const id = String(params.id || '').trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
  }

  const invRes = await fetchAtinaForBff<unknown>(`/api/v1/billing/invoices/${encodeURIComponent(id)}`, session);
  if (!invRes.ok) {
    return NextResponse.json(
      { ok: false, error: invRes.message ?? 'invoice_failed' },
      { status: invRes.status && invRes.status >= 400 ? invRes.status : 502 },
    );
  }

  const inv = unwrapInvoice(invRes.data);
  if (!inv) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const accept = req.headers.get('accept') ?? '';
  const wantsJson = accept.includes('application/json') && !accept.includes('text/html');
  if (wantsJson) {
    return NextResponse.json({ ok: true, data: inv });
  }

  return new NextResponse(renderPrintableInvoice(inv, session.user.email ?? ''), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
