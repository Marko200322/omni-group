import { attributeTouchpoints } from '../../modules/marketing/lib/attribution';

jest.mock('../../database/connection', () => ({
  query: jest.fn(),
}));

describe('payment attribution dispatch', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('exports fail-soft dispatcher that does not throw', async () => {
    const { query } = await import('../../database/connection');
    (query as jest.Mock).mockRejectedValue(new Error('db_down'));
    const { dispatchPaymentAttribution, attributeCompletedPayment } = await import(
      '../../modules/marketing/lib/payment-attribution'
    );
    expect(() =>
      dispatchPaymentAttribution({
        paymentId: 'pay-1',
        userId: 'user-1',
        amountEur: 99,
        metadata: { planSlug: 'starter' },
      })
    ).not.toThrow();
    const r = await attributeCompletedPayment({
      paymentId: 'pay-1',
      userId: 'user-1',
      amountEur: 99,
      metadata: { planSlug: 'starter' },
    });
    expect(r.ok).toBe(false);
  });

  it('last-touch attribution still works for package matrix inputs', () => {
    const r = attributeTouchpoints(
      [
        { id: '1', channelCode: 'google_ads', occurredAt: '2026-01-01T00:00:00Z' },
        { id: '2', channelCode: 'email', occurredAt: '2026-01-02T00:00:00Z' },
      ],
      'last_touch'
    );
    expect(r.shares[0].channelCode).toBe('email');
    expect(r.labeledUncertain).toBe(false);
  });
});
