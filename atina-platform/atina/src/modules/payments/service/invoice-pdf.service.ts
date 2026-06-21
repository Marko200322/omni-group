import PDFDocument from 'pdfkit';
import type { InvoiceLineItem } from '../templates/invoice-email.template';

export type InvoicePdfInput = {
  invoiceNumber: string;
  brandName: string;
  toName: string;
  toEmail: string;
  planName: string;
  billingCycle: string;
  amount: number;
  total: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  periodStart?: string;
  periodEnd?: string;
  purchasedAt: string;
};

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function generateInvoicePdfBuffer(input: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(input.brandName, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555').text('Invoice');
    doc.fillColor('#000');
    doc.moveDown();

    doc.fontSize(12).text(`Number: ${input.invoiceNumber}`);
    doc.text(`Date: ${dateFmt(input.purchasedAt)}`);
    doc.moveDown();

    doc.text(`Bill to: ${input.toName}`);
    doc.text(`Email: ${input.toEmail}`);
    doc.moveDown();

    doc.fontSize(14).text(input.planName, { underline: true });
    doc.fontSize(11).text(`Billing cycle: ${input.billingCycle}`);
    if (input.periodStart && input.periodEnd) {
      doc.text(`Period: ${dateFmt(input.periodStart)} – ${dateFmt(input.periodEnd)}`);
    }
    doc.moveDown();

    doc.fontSize(11).text('Line items:', { underline: true });
    input.lineItems.forEach((item) => {
      const qty = item.quantity ?? 1;
      doc.text(`• ${item.description} — ${item.amount.toFixed(2)} ${input.currency} × ${qty}`);
    });
    doc.moveDown();

    doc.fontSize(13).text(`Total: ${input.total.toFixed(2)} ${input.currency}`, { align: 'right' });
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666').text('Thank you for your business. This invoice was generated automatically.', {
      align: 'center',
    });

    doc.end();
  });
}
