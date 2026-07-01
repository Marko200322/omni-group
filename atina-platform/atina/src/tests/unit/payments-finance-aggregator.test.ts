import * as db from '../../database/connection';
import axios from 'axios';

jest.mock('../../database/connection');
jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// eslint-disable-next-line no-var
var billingApi: { getPlanBySlug: jest.Mock };

jest.mock('../../modules/billing/service/billing.service', () => {
  billingApi = {
    getPlanBySlug: jest.fn().mockResolvedValue({
      id: 'plan-pro',
      name: 'Pro',
      price_monthly: 29,
      price_yearly: 290,
    }),
  };
  return { BillingService: jest.fn().mockImplementation(() => billingApi) };
});

const mockFinance = {
  isConfigured: jest.fn().mockReturnValue(true),
  createPayPalOrder: jest.fn(),
  capturePayPalOrder: jest.fn(),
  createWiseTransfer: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getFinanceClient: () => mockFinance,
  getAiClient: jest.fn().mockReturnValue({ chat: jest.fn().mockResolvedValue({ content: '' }) }),
}));

jest.mock('../../modules/billing/service/deliverable-fulfillment.service', () => ({
  DeliverableFulfillmentService: jest.fn().mockImplementation(() => ({
    dispatchAfterPaymentConfirm: jest.fn(),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PaymentsService } = require('../../modules/payments/service/payments.service');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const mockTransaction = db.transaction as jest.MockedFunction<typeof db.transaction>;
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('PaymentsService FINANCE aggregator', () => {
  const service = new PaymentsService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFinance.isConfigured.mockReturnValue(true);
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    mockTransaction.mockImplementation(async (fn) => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
      return fn(client as never);
    });
  });

  it('createPayPalOrder delegates to finance client', async () => {
    mockFinance.createPayPalOrder.mockResolvedValue({ orderId: 'FIN_ORD', approveUrl: 'https://fin/approve' });
    const out = await service.createPayPalOrder('u1', 'pro', 'monthly');
    expect(out).toEqual({ orderId: 'FIN_ORD', approveUrl: 'https://fin/approve' });
    expect(mockAxios.post).not.toHaveBeenCalled();
  });

  it('capturePayPalOrder uses finance capture for aggregator orders', async () => {
    mockFinance.capturePayPalOrder.mockResolvedValue({
      captureId: 'CAP_FIN',
      planSlug: 'pro',
      billingCycle: 'monthly',
    });
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          metadata: JSON.stringify({
            planSlug: 'pro',
            billingCycle: 'monthly',
            via: 'finance_aggregator',
          }),
        },
      ],
      rowCount: 1,
    } as never);

    await service.capturePayPalOrder('FIN_ORD', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(mockAxios.post).not.toHaveBeenCalled();
    expect(mockFinance.capturePayPalOrder).toHaveBeenCalledWith('FIN_ORD', { userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
  });

  it('capturePayPalOrder throws when finance capture returns null', async () => {
    mockFinance.capturePayPalOrder.mockResolvedValue(null);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          metadata: JSON.stringify({
            planSlug: 'pro',
            billingCycle: 'monthly',
            via: 'finance_aggregator',
          }),
        },
      ],
      rowCount: 1,
    } as never);

    await expect(
      service.capturePayPalOrder('FIN_ORD', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    ).rejects.toThrow('Finance aggregator PayPal capture failed');
  });

  it('createWiseTransfer returns finance remote payload', async () => {
    mockFinance.createWiseTransfer.mockResolvedValue({
      paymentId: 'wise-remote',
      reference: 'REF-1',
      amount: 29,
      currency: 'USD',
      instructions: { iban: 'X' },
    });
    const out = await service.createWiseTransfer('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pro', 'monthly');
    expect(out.paymentId).toBe('wise-remote');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
