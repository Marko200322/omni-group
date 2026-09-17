import PDFDocument from 'pdfkit';
import type { InvoiceLineItem } from '../templates/invoice-email.template';

function issuerLines(instructions: Record<string, string>): string[] {
  const lines: string[] = [];
  const legal = instructions.companyLegalName?.trim();
  const tax = instructions.companyTaxId?.trim();
  const address = instructions.companyAddress?.trim();
  const accountName = instructions.accountName?.trim();
  if (legal) {
    lines.push(`Legal name: ${legal}`);
  } else if (accountName) {
    lines.push(`Beneficiary: ${accountName}`);
  }
  if (tax) lines.push(`Tax ID / PIB: ${tax}`);
  if (address) lines.push(`Address: ${address}`);
  return lines;
}

function paymentInstructionLines(instructions: Record<string, string>): string[] {
  const lines: string[] = [];
  const labels: Record<string, string> = {
    accountName: 'Beneficiary',
    iban: 'IBAN',
    bankName: 'Bank',
    swift: 'SWIFT/BIC',
  };
  for (const [key, label] of Object.entries(labels)) {
    const value = instructions[key]?.trim();
    if (value) lines.push(`${label}: ${value}`);
  }
  return lines;
}

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
  issuer?: {
    companyLegalName?: string;
    companyTaxId?: string;
    companyAddress?: string;
    accountName?: string;
  };
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

    const issuer = issuerLines({
      companyLegalName: input.issuer?.companyLegalName ?? '',
      companyTaxId: input.issuer?.companyTaxId ?? '',
      companyAddress: input.issuer?.companyAddress ?? '',
      accountName: input.issuer?.accountName ?? '',
    });
    if (issuer.length) {
      doc.fontSize(11).text('Issuer:', { underline: true });
      issuer.forEach((line) => doc.text(line));
      doc.moveDown();
    }

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

export type ProformaPdfInput = {
  proformaNumber: string;
  brandName: string;
  toName: string;
  toEmail: string;
  planName: string;
  billingCycle: string;
  amount: number;
  currency: string;
  reference: string;
  instructions: Record<string, string>;
  issueDate: string;
};

/** Proforma invoice PDF for manual bank-transfer checkout (attached to proforma email). */
export function generateProformaPdfBuffer(input: ProformaPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(input.brandName, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555').text('Proforma invoice');
    doc.fillColor('#000');
    doc.moveDown();

    doc.fontSize(12).text(`Number: ${input.proformaNumber}`);
    doc.text(`Date: ${dateFmt(input.issueDate)}`);
    doc.text(`Payment reference: ${input.reference}`);
    doc.moveDown();

    doc.text(`Bill to: ${input.toName}`);
    doc.text(`Email: ${input.toEmail}`);
    doc.moveDown();

    const proformaIssuer = issuerLines(input.instructions);
    if (proformaIssuer.length) {
      doc.fontSize(11).text('Issuer:', { underline: true });
      proformaIssuer.forEach((line) => doc.text(line));
      doc.moveDown();
    }

    doc.fontSize(14).text(input.planName, { underline: true });
    doc.fontSize(11).text(`Billing cycle: ${input.billingCycle}`);
    doc.text(`Amount due: ${input.amount.toFixed(2)} ${input.currency}`);
    doc.moveDown();

    doc.fontSize(11).text('Payment instructions:', { underline: true });
    paymentInstructionLines(input.instructions).forEach((line) => doc.text(line));
    const note = input.instructions.note?.trim();
    if (note) {
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#444').text(note);
      doc.fillColor('#000');
    }
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666').text('This proforma is not a tax invoice until payment is confirmed.', {
      align: 'center',
    });

    doc.end();
  });
}
