import { config } from '../../../config';
import { BillingService } from '../../billing/service/billing.service';

export type ClientDocumentRow = {
  id: string;
  kind: 'invoice' | 'payment_receipt' | 'tax_invoice';
  title: string;
  invoiceNumber: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  createdAt: string | null;
  href: string;
  vatNote: string;
};

export class DocumentsService {
  private readonly billing = new BillingService();

  sellerVatReady(): boolean {
    const legal = config.payments.manual.companyLegalName?.trim() ?? '';
    const tax = config.payments.manual.companyTaxId?.trim() ?? '';
    return Boolean(legal && tax);
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const { invoices, total } = await this.billing.getUserInvoices(userId, page, limit);
    const vatReady = this.sellerVatReady();
    const documents: ClientDocumentRow[] = invoices.map((inv) => {
      const details =
        inv && typeof inv === 'object' && inv.billing_details && typeof inv.billing_details === 'object'
          ? (inv.billing_details as Record<string, unknown>)
          : {};
      const storedKind =
        typeof details.documentKind === 'string' ? details.documentKind : null;
      const kind =
        storedKind === 'tax_invoice' || storedKind === 'payment_receipt'
          ? storedKind
          : vatReady
            ? 'tax_invoice'
            : 'payment_receipt';
      const number = (inv as { invoice_number?: string }).invoice_number ?? null;
      const amountRaw = (inv as { total_amount?: number | string; amount?: number | string }).total_amount
        ?? (inv as { amount?: number | string }).amount
        ?? null;
      const amount = amountRaw == null ? null : Number(amountRaw);
      return {
        id: String((inv as { id?: string }).id ?? number ?? ''),
        kind,
        title:
          kind === 'tax_invoice'
            ? `Tax invoice ${number ?? ''}`.trim()
            : `Payment receipt ${number ?? ''}`.trim(),
        invoiceNumber: number,
        amount: Number.isFinite(amount as number) ? (amount as number) : null,
        currency: (inv as { currency?: string }).currency ?? 'EUR',
        status: (inv as { status?: string }).status ?? null,
        createdAt: (inv as { created_at?: string }).created_at ?? null,
        href: number
          ? `/api/atina/billing/invoices/${encodeURIComponent(String((inv as { id?: string }).id ?? ''))}`
          : '/dashboard/billing',
        vatNote: vatReady
          ? 'Seller legal entity + Tax ID are set — formal tax invoice path enabled.'
          : 'Seller VAT/legal entity not set yet (Marko P2). Soft start issues payment receipts, not formal e-invoices.',
      };
    });

    return {
      documents,
      total,
      sellerVatReady: vatReady,
      vatStatus: vatReady
        ? 'tax_invoice_enabled'
        : 'payment_receipt_only_pending_company_legal_name',
    };
  }
}
