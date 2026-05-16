import * as db from '../../database/connection';
import axios from 'axios';
import { config } from '../../config';
import { PaymentError, NotFoundError } from '../../utils/errors';

jest.mock('../../database/connection');

jest.mock('axios');

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// eslint-disable-next-line no-var
var testStripeApi: {
  customers: { create: jest.Mock };
  checkout: { sessions: { create: jest.Mock } };
  webhooks: { constructEvent: jest.Mock };
  subscriptions: { retrieve: jest.Mock; update: jest.Mock };
  billingPortal: { sessions: { create: jest.Mock } };
};

jest.mock('stripe', () => {
  testStripeApi = {
    customers: { create: jest.fn().mockResolvedValue({ id: 'cus_new' }) },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'cs_1', url: 'https://checkout.test' }),
      },
    },
    webhooks: { constructEvent: jest.fn() },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_ret',
        current_period_start: 1700000000,
        current_period_end: 1702600000,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    billingPortal: {
      sessions: { create: jest.fn().mockResolvedValue({ url: 'https://portal.test' }) },
    },
  };
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => testStripeApi),
  };
});

// eslint-disable-next-line no-var
var billingApi: { getPlanBySlug: jest.Mock; createInvoice: jest.Mock };

jest.mock('../../modules/billing/service/billing.service', () => {
  billingApi = {
    getPlanBySlug: jest.fn(),
    createInvoice: jest.fn().mockResolvedValue(undefined),
  };
  return {
    BillingService: jest.fn().mockImplementation(() => billingApi),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PaymentsService } = require('../../modules/payments/service/payments.service');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockLogger = require('../../utils/logger').default as {
  info: jest.Mock;
  debug: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
};

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const mockTransaction = db.transaction as jest.MockedFunction<typeof db.transaction>;
const mockAxios = axios as jest.Mocked<typeof axios>;

const planFull = {
  id: 'plan-1',
  name: 'Pro',
  slug: 'pro',
  stripe_price_id_monthly: 'price_m',
  stripe_price_id_yearly: 'price_y',
  price_monthly: 29,
  price_yearly: 290,
};

describe('PaymentsService', () => {
  let service: InstanceType<typeof PaymentsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
    testStripeApi.customers.create.mockResolvedValue({ id: 'cus_new' });
    testStripeApi.checkout.sessions.create.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.test' });
    testStripeApi.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_ret',
      current_period_start: 1700000000,
      current_period_end: 1702600000,
    });
    testStripeApi.subscriptions.update.mockResolvedValue({});
    testStripeApi.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal.test' });
    billingApi.getPlanBySlug.mockResolvedValue(planFull as never);
    billingApi.createInvoice.mockResolvedValue(undefined);
    service = new PaymentsService();
  });

  describe('createStripeCheckoutSession', () => {
    it('uses existing stripe_customer_id and monthly price', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ email: 'a@b.com', name: 'A', stripe_customer_id: 'cus_old' }],
        rowCount: 1,
      } as never);

      const out = await service.createStripeCheckoutSession('u1', 'pro', 'monthly');

      expect(out.sessionId).toBe('cs_1');
      expect(testStripeApi.customers.create).not.toHaveBeenCalled();
      expect(testStripeApi.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_old',
          line_items: [{ price: 'price_m', quantity: 1 }],
        })
      );
    });

    it('creates customer when missing and uses yearly price', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ email: 'b@b.com', name: 'B' }],
        rowCount: 1,
      } as never);

      await service.createStripeCheckoutSession('u2', 'pro', 'yearly');

      expect(testStripeApi.customers.create).toHaveBeenCalled();
      expect(testStripeApi.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_y', quantity: 1 }],
        })
      );
    });

    it('sets trial for starter plan', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ email: 'c@c.com', name: 'C', stripe_customer_id: 'cus_s' }],
        rowCount: 1,
      } as never);
      billingApi.getPlanBySlug.mockResolvedValueOnce({ ...planFull, slug: 'starter' } as never);

      await service.createStripeCheckoutSession('u3', 'starter', 'monthly');

      expect(testStripeApi.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({ trial_period_days: 14 }),
        })
      );
    });

    it('throws when Stripe price missing', async () => {
      billingApi.getPlanBySlug.mockResolvedValueOnce({
        ...planFull,
        stripe_price_id_monthly: null,
        stripe_price_id_yearly: null,
      } as never);

      await expect(service.createStripeCheckoutSession('u1', 'pro', 'monthly')).rejects.toBeInstanceOf(
        PaymentError
      );
    });
  });

  describe('handleStripeWebhook', () => {
    it('throws on invalid signature', async () => {
      testStripeApi.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('bad sig');
      });
      await expect(service.handleStripeWebhook(Buffer.from('x'), 'sig')).rejects.toBeInstanceOf(PaymentError);
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('handles checkout.session.completed', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'u1', planSlug: 'pro', billingCycle: 'yearly' },
            subscription: 'sub_x',
            customer: 'cus_x',
          },
        },
      } as never);

      const clientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(mockTransaction).toHaveBeenCalled();
      expect(clientQuery).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Stripe webhook received',
        expect.objectContaining({ type: 'checkout.session.completed' })
      );
      const infoPayloads = mockLogger.info.mock.calls.map((c) => JSON.stringify(c));
      expect(infoPayloads.some((s) => s.includes('sk_live') || s.includes('424242424242'))).toBe(false);
    });

    it('checkout.session.completed retrieves subscription when session.subscription is expanded object (N3-E1)', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'u1', planSlug: 'pro', billingCycle: 'monthly' },
            subscription: { id: 'sub_obj' } as { id: string },
            customer: 'cus_x',
          },
        },
      } as never);

      const clientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(testStripeApi.subscriptions.retrieve).toHaveBeenCalledWith('sub_obj');
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('checkout completed defaults billingCycle when omitted in metadata', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'u1', planSlug: 'pro' },
            subscription: 'sub_x',
            customer: 'cus_x',
          },
        },
      } as never);

      const clientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      const insertArgs = clientQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO subscriptions'))?.[1];
      expect(insertArgs?.[2]).toBe('monthly');
    });

    it('skips checkout when metadata incomplete', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { metadata: { userId: 'u1' }, subscription: 'sub_x', customer: 'cus_x' } },
      } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('checkout.session.completed skips when subscription reference missing (N3-E1)', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'u1', planSlug: 'pro' },
            subscription: null,
            customer: 'cus_x',
          },
        },
      } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(testStripeApi.subscriptions.retrieve).not.toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('checkout completed treats missing metadata as empty object', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: { subscription: 'sub_x', customer: 'cus_x' } as { metadata?: Record<string, string> },
        },
      } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('handles customer.subscription.updated', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            current_period_start: 10,
            current_period_end: 20,
            cancel_at_period_end: true,
          },
        },
      } as never);
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE subscriptions'),
        expect.arrayContaining(['sub_1', 'active'])
      );
    });

    it('handles customer.subscription.deleted with starter downgrade', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_del' } },
      } as never);

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ user_id: 'u9' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'starter-plan' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET plan_id'),
        ['u9', 'starter-plan']
      );
    });

    it('subscription.deleted skips user plan update when starter plan row missing', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_no_starter' } },
      } as never);

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ user_id: 'u8' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      const userPlanUpdates = mockQuery.mock.calls.filter((c) =>
        String(c[0]).includes('UPDATE users SET plan_id')
      );
      expect(userPlanUpdates).toHaveLength(0);
    });

    it('handles subscription.deleted when no user row', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_del2' } },
      } as never);

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');
      expect(mockQuery).toHaveBeenCalled();
    });

    it('handles invoice.payment_succeeded', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_1',
            subscription: 'sub_inv',
            amount_paid: 2500,
            currency: 'usd',
            lines: {
              data: [
                { description: 'A', amount: 1000, quantity: 2 },
                { description: null, amount: 500, quantity: null },
              ],
            },
          },
        },
      } as never);

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ user_id: 'u1', plan_id: 'p1', id: 's1' }],
          rowCount: 1,
        } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'pay_new' }], rowCount: 1 } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(billingApi.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          paymentId: 'pay_new',
          lineItems: expect.arrayContaining([
            expect.objectContaining({ description: 'A', quantity: 2 }),
            expect.objectContaining({ description: 'Subscription', quantity: 1 }),
          ]),
        })
      );
    });

    it('handles invoice.payment_succeeded when subscription is expanded object (N3-E1)', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_exp',
            subscription: { id: 'sub_expanded' } as { id: string },
            amount_paid: 1000,
            currency: 'usd',
            lines: { data: [{ description: 'Line', amount: 1000, quantity: 1 }] },
          },
        },
      } as never);

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ user_id: 'u1', plan_id: 'p1', id: 's1' }],
          rowCount: 1,
        } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'pay_exp' }], rowCount: 1 } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE stripe_subscription_id = $1'),
        ['sub_expanded']
      );
      expect(billingApi.createInvoice).toHaveBeenCalled();
    });

    it('invoice.payment_succeeded skips when subscription id missing (N3-E1)', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_no_sub',
            subscription: null,
            amount_paid: 0,
            currency: 'usd',
            lines: { data: [] },
          },
        },
      } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(mockQuery).not.toHaveBeenCalled();
      expect(billingApi.createInvoice).not.toHaveBeenCalled();
    });

    it('invoice.payment_succeeds early exit when no subscription row', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_2',
            subscription: 'sub_none',
            amount_paid: 0,
            currency: 'usd',
            lines: { data: [] },
          },
        },
      } as never);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');
      expect(billingApi.createInvoice).not.toHaveBeenCalled();
    });

    it('handles invoice.payment_failed', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_fail',
            subscription: 'sub_pd',
            amount_due: 1500,
            currency: 'eur',
          },
        },
      } as never);
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'past_due'"),
        expect.arrayContaining(['sub_pd'])
      );
    });

    it('skips invoice.payment_failed when subscription id missing (N3-E1)', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_no_sub',
            subscription: null,
            amount_due: 100,
            currency: 'usd',
          },
        },
      } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');

      const pastDue = mockQuery.mock.calls.filter((c) => String(c[0]).includes("status = 'past_due'"));
      expect(pastDue).toHaveLength(0);
    });

    it('logs unhandled event types', async () => {
      testStripeApi.webhooks.constructEvent.mockReturnValue({
        type: 'customer.created',
        data: { object: {} },
      } as never);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig');
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('throws when no active subscription', async () => {
      mockQuery.mockResolvedValue({ rows: [{}], rowCount: 1 } as never);
      await expect(service.cancelSubscription('u1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('updates Stripe and DB', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ stripe_subscription_id: 'sub_c' }],
          rowCount: 1,
        } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await service.cancelSubscription('u1');

      expect(testStripeApi.subscriptions.update).toHaveBeenCalledWith('sub_c', { cancel_at_period_end: true });
    });
  });

  describe('createBillingPortalSession', () => {
    it('throws when no customer', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
      await expect(service.createBillingPortalSession('u1')).rejects.toBeInstanceOf(PaymentError);
    });

    it('returns portal url', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ stripe_customer_id: 'cus_bp' }],
        rowCount: 1,
      } as never);

      const url = await service.createBillingPortalSession('u1');
      expect(url).toBe('https://portal.test');
    });
  });

  describe('PayPal', () => {
    it('createPayPalOrder stores pending payment', async () => {
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'tok' } } as never)
        .mockResolvedValueOnce({
          data: {
            id: 'ORD_1',
            links: [{ rel: 'approve', href: 'https://paypal.test/approve' }],
          },
        } as never);
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);

      const out = await service.createPayPalOrder('u1', 'pro', 'monthly');

      expect(out).toEqual({
        orderId: 'ORD_1',
        approveUrl: 'https://paypal.test/approve',
      });
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO payments'), expect.any(Array));
    });

    it('createPayPalOrder uses live API host when PAYPAL_MODE is live', async () => {
      const prev = config.paypal.mode;
      (config as { paypal: { mode: string } }).paypal.mode = 'live';
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'tok' } } as never)
        .mockResolvedValueOnce({
          data: { id: 'L1', links: [{ rel: 'approve', href: 'https://live' }] },
        } as never);
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);

      await service.createPayPalOrder('u1', 'pro', 'monthly');

      expect(mockAxios.post.mock.calls[0][0]).toContain('api-m.paypal.com');
      (config as { paypal: { mode: string } }).paypal.mode = prev;
    });

    it('createPayPalOrder allows missing approve link', async () => {
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 't' } } as never)
        .mockResolvedValueOnce({ data: { id: 'ORD2', links: [{ rel: 'self', href: '#' }] } } as never);
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);

      const out = await service.createPayPalOrder('u1', 'pro', 'yearly');

      expect(out.orderId).toBe('ORD2');
      expect(out.approveUrl).toBeUndefined();
    });

    it('capturePayPalOrder throws NotFound when no pending PayPal order', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(service.capturePayPalOrder('ORD_MISSING', 'u1')).rejects.toBeInstanceOf(NotFoundError);
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('capturePayPalOrder throws NotFound when order belongs to another user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'victim' }], rowCount: 1 } as never);

      await expect(service.capturePayPalOrder('ORD_X', 'attacker')).rejects.toBeInstanceOf(NotFoundError);
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('capturePayPalOrder throws on bad custom_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'u1' }], rowCount: 1 } as never);
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 't' } } as never)
        .mockResolvedValueOnce({
          data: { purchase_units: [{ custom_id: 'bad', payments: { captures: [{ amount: { value: '10' } }] } }] },
        } as never);

      await expect(service.capturePayPalOrder('ORD_X', 'u1')).rejects.toBeInstanceOf(PaymentError);
    });

    it('capturePayPalOrder throws when purchase unit has no custom_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'u1' }], rowCount: 1 } as never);
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 't' } } as never)
        .mockResolvedValueOnce({
          data: {
            purchase_units: [{ payments: { captures: [{ id: 'c' }] } }],
          },
        } as never);

      await expect(service.capturePayPalOrder('ORD_NO_CID', 'u1')).rejects.toBeInstanceOf(PaymentError);
    });

    it('capturePayPalOrder throws when purchase_units missing', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'u1' }], rowCount: 1 } as never);
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 't' } } as never)
        .mockResolvedValueOnce({ data: {} } as never);

      await expect(service.capturePayPalOrder('ORD_NOPU', 'u1')).rejects.toBeInstanceOf(PaymentError);
    });

    it('capturePayPalOrder completes monthly subscription path', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'user-uuid-here' }], rowCount: 1 } as never);
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 't' } } as never)
        .mockResolvedValueOnce({
          data: {
            purchase_units: [
              {
                custom_id: 'user-uuid-here:pro:monthly',
                payments: { captures: [{ id: 'cap_1', amount: { value: '29.00' } }] },
              },
            ],
          },
        } as never);

      const clientQuery = jest
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'sub_pp' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });

      billingApi.getPlanBySlug.mockResolvedValueOnce(planFull as never);

      await service.capturePayPalOrder('ORD_1', 'user-uuid-here');

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('capturePayPalOrder uses yearly billing cycle in subscription window', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
        rowCount: 1,
      } as never);
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 't' } } as never)
        .mockResolvedValueOnce({
          data: {
            purchase_units: [
              {
                custom_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:pro:yearly',
                payments: { captures: [{ id: 'cap_y', amount: { value: '290.00' } }] },
              },
            ],
          },
        } as never);

      const clientQuery = jest
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'sub_y' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });

      billingApi.getPlanBySlug.mockResolvedValueOnce(planFull as never);

      await service.capturePayPalOrder('ORD_Y', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('capturePayPalOrder handles missing capture amount value', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
        rowCount: 1,
      } as never);
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 't' } } as never)
        .mockResolvedValueOnce({
          data: {
            purchase_units: [
              {
                custom_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:pro:monthly',
                payments: { captures: [{ id: 'cap_z' }] },
              },
            ],
          },
        } as never);

      const clientQuery = jest
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'sub_z' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });

      billingApi.getPlanBySlug.mockResolvedValueOnce(planFull as never);

      await service.capturePayPalOrder('ORD_Z', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('capturePayPalOrder uses live PayPal host when mode is live', async () => {
      const prev = config.paypal.mode;
      (config as { paypal: { mode: string } }).paypal.mode = 'live';
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
        rowCount: 1,
      } as never);
      mockAxios.post
        .mockResolvedValueOnce({ data: { access_token: 't' } } as never)
        .mockResolvedValueOnce({
          data: {
            purchase_units: [
              {
                custom_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:pro:monthly',
                payments: { captures: [{ id: 'c' }] },
              },
            ],
          },
        } as never);
      const clientQuery = jest
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 's' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });
      billingApi.getPlanBySlug.mockResolvedValueOnce(planFull as never);

      await service.capturePayPalOrder('ORD_LIVE', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

      expect(mockAxios.post.mock.calls[0][0]).toContain('api-m.paypal.com');
      (config as { paypal: { mode: string } }).paypal.mode = prev;
    });
  });

  describe('Wise', () => {
    it('createWiseTransfer returns instructions (yearly amount)', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 'wise-pay-1' }],
        rowCount: 1,
      } as never);

      const out = await service.createWiseTransfer('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pro', 'yearly');

      expect(out.paymentId).toBe('wise-pay-1');
      expect(out.reference).toContain('ATINA-');
      expect(out.instructions.bankName).toBe('TransferWise');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payments'),
        expect.arrayContaining([290])
      );
    });

    it('createWiseTransfer uses monthly price when billingCycle is monthly', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 'wise-m' }],
        rowCount: 1,
      } as never);

      await service.createWiseTransfer('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pro', 'monthly');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payments'),
        expect.arrayContaining([29])
      );
    });

    it('confirmWisePayment throws when payment missing', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
      await expect(service.confirmWisePayment('pid', 'admin')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('confirmWisePayment throws when metadata missing planSlug', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'u1', amount: 10, currency: 'USD', metadata: { billingCycle: 'monthly' } }],
        rowCount: 1,
      } as never);
      billingApi.getPlanBySlug.mockRejectedValueOnce(new NotFoundError('Plan'));

      await expect(service.confirmWisePayment('pay-bad-meta', 'admin-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('confirmWisePayment runs transaction', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'u1',
            amount: 50,
            currency: 'USD',
            metadata: { planSlug: 'pro', billingCycle: 'monthly' },
          },
        ],
        rowCount: 1,
      } as never);

      const clientQuery = jest
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'sub_w' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });

      await service.confirmWisePayment('pay-w', 'admin-1');

      expect(billingApi.createInvoice).toHaveBeenCalled();
    });

    it('confirmWisePayment extends period by 12 months when billingCycle is yearly', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'u1',
            amount: 100,
            currency: 'USD',
            metadata: { planSlug: 'pro', billingCycle: 'yearly' },
          },
        ],
        rowCount: 1,
      } as never);

      const clientQuery = jest
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'sub_wy' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      mockTransaction.mockImplementation(async (fn) => {
        await fn({ query: clientQuery } as never);
      });

      await service.confirmWisePayment('pay-y', 'admin-1');

      expect(billingApi.createInvoice).toHaveBeenCalled();
    });
  });

  describe('getPaymentHistory', () => {
    it('returns payments and total', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'p1' }, { id: 'p2' }], rowCount: 2 } as never);

      const out = await service.getPaymentHistory('u1', 1, 10);

      expect(out.total).toBe(2);
      expect(out.payments).toHaveLength(2);
    });

    it('defaults page and limit when omitted', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const out = await service.getPaymentHistory('u1');

      expect(out.total).toBe(0);
      expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 20, 0]);
    });
  });
});
