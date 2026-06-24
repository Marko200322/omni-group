import {
  escapeHtml,
  formatBillingCycleSr,
  formatDateSr,
  formatMoney,
  renderManualCheckoutInvoiceEmail,
} from '../../modules/payments/templates/invoice-email.template';

describe('invoice-email.template helpers', () => {
  it('escapeHtml encodes dangerous characters', () => {
    expect(escapeHtml('<script>"x"&</script>')).toBe('&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;');
  });

  it('formatMoney formats known currencies', () => {
    expect(formatMoney(49.99, 'eur')).toMatch(/49\.99/);
  });

  it('formatMoney falls back for invalid currency codes', () => {
    expect(formatMoney(10, 'NOTREAL')).toBe('10.00 NOTREAL');
  });

  it('formatDateSr returns ISO input when date is invalid', () => {
    expect(formatDateSr('not-a-date')).toBe('not-a-date');
  });

  it('formatDateSr formats valid ISO dates', () => {
    expect(formatDateSr('2026-06-15T00:00:00.000Z')).toMatch(/2026/);
  });

  it('formatBillingCycleSr maps billing cycles', () => {
    expect(formatBillingCycleSr('yearly')).toBe('Annual subscription');
    expect(formatBillingCycleSr('monthly')).toBe('Monthly subscription');
  });

  it('renderManualCheckoutInvoiceEmail includes optional plan description line', () => {
    const { html, text } = renderManualCheckoutInvoiceEmail({
      brand: { name: 'Omni Group', url: 'https://omnigroup.io' },
      toName: 'Marko',
      toEmail: 'marko@test.com',
      planName: 'Pro',
      planSlug: 'pro',
      planDescription: '  For growing teams  ',
      billingCycle: 'monthly',
      amount: 49.99,
      currency: 'EUR',
      reference: 'ATINA-REF-1',
      proformaNumber: 'PRO-202606-REF1',
      instructions: { iban: 'RS123', accountName: 'Omni', bankName: 'Bank', note: 'Pay soon' },
      issueDate: '2026-06-01T12:00:00.000Z',
    });

    expect(html).toContain('For growing teams');
    expect(text).toContain('RS123');
  });
});
