import crypto from 'crypto';
import { KriptomanClient, resetKriptomanClientForTests } from '../../integrations/kriptoman-client';

jest.mock('../../config', () => ({
  config: {
    app: { url: 'http://localhost:3000', isDev: false },
    aggregators: { finance: { url: '', key: '' } },
    kriptoman: {
      enabled: true,
      url: '',
      apiKey: '',
      webhookSecret: 'test-secret',
      merchantId: '',
      defaultCrypto: 'USDT',
      devMock: true,
    },
    payments: { manual: { currency: 'EUR' } },
  },
}));

describe('KriptomanClient', () => {
  afterEach(() => {
    resetKriptomanClientForTests();
  });

  it('dev mock creates invoice without HTTP', async () => {
    const client = new KriptomanClient();
    const out = await client.createInvoice({
      externalId: 'pay-1',
      amount: 29,
      currency: 'EUR',
      description: 'Pro monthly',
      callbackUrl: 'http://localhost/cb',
      successUrl: 'http://localhost/ok',
      cancelUrl: 'http://localhost/cancel',
      metadata: { userId: 'u1' },
    });
    expect(out?.invoiceId).toContain('km_mock_');
    expect(out?.paymentUrl).toContain('pay-1');
    expect(client.isConfigured()).toBe(true);
  });

  it('verifyWebhookSignature validates HMAC', () => {
    const client = new KriptomanClient();
    const body = JSON.stringify({ status: 'paid', external_id: 'p1' });
    const sig = crypto.createHmac('sha256', 'test-secret').update(body).digest('hex');
    expect(client.verifyWebhookSignature(body, sig)).toBe(true);
    expect(client.verifyWebhookSignature(body, 'bad')).toBe(false);
  });

  it('parseWebhookPayload reads nested data', () => {
    const client = new KriptomanClient();
    const event = client.parseWebhookPayload({
      type: 'payment.paid',
      data: { invoice_id: 'inv-9', external_id: 'pay-9', status: 'paid' },
    });
    expect(event.invoiceId).toBe('inv-9');
    expect(event.externalId).toBe('pay-9');
    expect(client.isPaidStatus(event.status)).toBe(true);
  });
});
