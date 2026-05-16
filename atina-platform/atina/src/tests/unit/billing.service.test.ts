import { BillingService } from '../../modules/billing/service/billing.service';
import * as db from '../../database/connection';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BillingService();
  });

  describe('getPlans', () => {
    it('should return array of active plans', async () => {
      const fakePlans = [
        { id: '1', name: 'Starter', slug: 'starter', price_monthly: 9.99, is_active: true },
        { id: '2', name: 'Pro', slug: 'pro', price_monthly: 49.99, is_active: true },
      ];
      mockQuery.mockResolvedValue({ rows: fakePlans, rowCount: 2 } as any);

      const plans = await service.getPlans();

      expect(plans).toHaveLength(2);
      expect(plans[0].name).toBe('Starter');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_active = true'));
    });
  });

  describe('getPlanBySlug', () => {
    it('should return plan when found', async () => {
      const fakePlan = { id: '1', name: 'Pro', slug: 'pro', price_monthly: 49.99 };
      mockQuery.mockResolvedValue({ rows: [fakePlan], rowCount: 1 } as any);

      const plan = await service.getPlanBySlug('pro');

      expect(plan.slug).toBe('pro');
      expect(plan.price_monthly).toBe(49.99);
    });

    it('should throw NotFoundError when plan not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await expect(service.getPlanBySlug('nonexistent')).rejects.toThrow('Plan not found');
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate correctly formatted invoice number', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '5' }], rowCount: 1 } as any);

      const number = await service.generateInvoiceNumber();
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');

      expect(number).toMatch(new RegExp(`^INV-${year}${month}-\\d{4}$`));
    });
  });

  describe('getPlanById', () => {
    it('returns plan', async () => {
      const plan = { id: 'p1', slug: 's', name: 'n', price_monthly: 1 } as any;
      mockQuery.mockResolvedValue({ rows: [plan], rowCount: 1 } as any);
      await expect(service.getPlanById('p1')).resolves.toBe(plan);
    });
    it('throws when missing', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await expect(service.getPlanById('x')).rejects.toThrow('Plan not found');
    });
  });

  describe('getUserCurrentSubscription', () => {
    it('returns row or null', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 } as any);
      await expect(service.getUserCurrentSubscription('u1')).resolves.toEqual({ id: 's1' });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      await expect(service.getUserCurrentSubscription('u1')).resolves.toBeNull();
    });
  });

  describe('getUserInvoices', () => {
    it('returns invoices and total', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'i1' }], rowCount: 1 } as any);
      const r = await service.getUserInvoices('u1', 1, 10);
      expect(r.total).toBe(2);
      expect(r.invoices).toHaveLength(1);
    });

    it('uses default page and limit when omitted', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      const r = await service.getUserInvoices('u1');
      expect(r.total).toBe(1);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['u1', 20, 0]
      );
    });

    it('clamps page below 1 and caps limit at 100', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      await service.getUserInvoices('u1', 0, 500);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['u1', 100, 0]
      );
    });
  });

  describe('getInvoiceById', () => {
    it('returns invoice', async () => {
      const inv = { id: '1', user_id: 'u' } as any;
      mockQuery.mockResolvedValue({ rows: [inv], rowCount: 1 } as any);
      await expect(service.getInvoiceById('1', 'u')).resolves.toBe(inv);
    });
    it('throws when missing', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await expect(service.getInvoiceById('1', 'u')).rejects.toThrow('Invoice not found');
    });
  });

  describe('checkPlanLimit', () => {
    it('returns false when no plan row', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
      await expect(service.checkPlanLimit('u', 'any')).resolves.toBe(false);
    });
    it('returns true for unlimited (-1)', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ limits: { tasks_per_month: -1 } }],
        rowCount: 1,
      } as any);
      await expect(service.checkPlanLimit('u', 'tasks_per_month')).resolves.toBe(true);
    });
    it('returns false when limit not a number', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ limits: { tasks_per_month: 'x' } }],
        rowCount: 1,
      } as any);
      await expect(service.checkPlanLimit('u', 'tasks_per_month')).resolves.toBe(false);
    });
    it('compares tasks_per_month usage', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ limits: { tasks_per_month: 10 } }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 } as any);
      await expect(service.checkPlanLimit('u', 'tasks_per_month')).resolves.toBe(true);
    });
    it('returns false when tasks_per_month usage reaches limit', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ limits: { tasks_per_month: 10 } }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [{ count: '10' }], rowCount: 1 } as any);
      await expect(service.checkPlanLimit('u', 'tasks_per_month')).resolves.toBe(false);
    });
    it('returns true for unknown limit key', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ limits: { other: 1 } }],
        rowCount: 1,
      } as any);
      await expect(service.checkPlanLimit('u', 'other')).resolves.toBe(true);
    });
  });

  describe('createInvoice', () => {
    it('inserts and returns row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'inv1' }], rowCount: 1 } as any);
      const row = await service.createInvoice({
        userId: 'u1',
        amount: 100,
        lineItems: [{ description: 'a', amount: 50, quantity: 2 }],
      });
      expect(row).toEqual({ id: 'inv1' });
    });

    it('rejects negative amount', async () => {
      await expect(
        service.createInvoice({
          userId: 'u1',
          amount: -1,
          lineItems: [{ description: 'x', amount: 1, quantity: 1 }],
        })
      ).rejects.toThrow('non-negative finite number');
    });

    it('rejects empty line items', async () => {
      await expect(
        service.createInvoice({
          userId: 'u1',
          amount: 0,
          lineItems: [],
        })
      ).rejects.toThrow('at least one line item');
    });

    it('rejects invalid line quantity', async () => {
      await expect(
        service.createInvoice({
          userId: 'u1',
          amount: 10,
          lineItems: [{ description: 'x', amount: 10, quantity: 0 }],
        })
      ).rejects.toThrow('positive integer');
    });
  });
});
