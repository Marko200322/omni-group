import {
  generateInvoicePdfBuffer,
  generateProformaPdfBuffer,
} from '../../modules/payments/service/invoice-pdf.service';

describe('invoice-pdf.service', () => {
  it('generateInvoicePdfBuffer returns a non-empty PDF buffer', async () => {
    const buf = await generateInvoicePdfBuffer({
      invoiceNumber: 'INV-202606-0001',
      brandName: 'Omni Group',
      toName: 'Marko',
      toEmail: 'marko@test.com',
      planName: 'Pro',
      billingCycle: 'monthly',
      amount: 49.99,
      total: 49.99,
      currency: 'EUR',
      lineItems: [{ description: 'Pro Plan (monthly)', amount: 49.99, quantity: 1 }],
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-07-01T00:00:00.000Z',
      purchasedAt: '2026-06-01T12:00:00.000Z',
    });

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(200);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('generateInvoicePdfBuffer omits period block when dates are missing', async () => {
    const buf = await generateInvoicePdfBuffer({
      invoiceNumber: 'INV-202606-0003',
      brandName: 'Omni Group',
      toName: 'Marko',
      toEmail: 'marko@test.com',
      planName: 'Pro',
      billingCycle: 'monthly',
      amount: 49.99,
      total: 49.99,
      currency: 'EUR',
      lineItems: [{ description: 'Pro Plan (monthly)', amount: 49.99, quantity: 2 }],
      purchasedAt: '2026-06-01T12:00:00.000Z',
    });

    expect(buf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('generateInvoicePdfBuffer handles line items without explicit quantity', async () => {
    const buf = await generateInvoicePdfBuffer({
      invoiceNumber: 'INV-202606-0002',
      brandName: 'Omni Group',
      toName: 'Ana',
      toEmail: 'ana@test.com',
      planName: 'Starter',
      billingCycle: 'yearly',
      amount: 199,
      total: 199,
      currency: 'EUR',
      lineItems: [{ description: 'Starter Plan (yearly)', amount: 199, quantity: 1 }],
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2027-06-01T00:00:00.000Z',
      purchasedAt: '2026-06-01T12:00:00.000Z',
    });

    expect(buf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('generateProformaPdfBuffer returns a non-empty PDF buffer', async () => {
    const buf = await generateProformaPdfBuffer({
      proformaNumber: 'PRO-202606-REF1',
      brandName: 'Omni Group',
      toName: 'Marko',
      toEmail: 'marko@test.com',
      planName: 'Pro',
      billingCycle: 'monthly',
      amount: 49.99,
      currency: 'EUR',
      reference: 'ATINA-REF-1',
      instructions: { iban: 'RS123', accountName: 'Omni Group DOO' },
      issueDate: '2026-06-01T12:00:00.000Z',
    });

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(200);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('generateProformaPdfBuffer skips blank instruction values', async () => {
    const buf = await generateProformaPdfBuffer({
      proformaNumber: 'PRO-202606-REF2',
      brandName: 'Omni Group',
      toName: 'Marko',
      toEmail: 'marko@test.com',
      planName: 'Pro',
      billingCycle: 'monthly',
      amount: 49.99,
      currency: 'EUR',
      reference: 'ATINA-REF-2',
      instructions: { iban: 'RS123', note: '   ' },
      issueDate: '2026-06-01T12:00:00.000Z',
    });

    expect(buf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });
});
