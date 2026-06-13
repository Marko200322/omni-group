import { Request, Response } from 'express';
import { BillingController } from '../../modules/billing/controller/billing.controller';
import { BillingService } from '../../modules/billing/service/billing.service';

jest.mock('../../modules/billing/service/billing.service');

const MockBillingService = BillingService as jest.MockedClass<typeof BillingService>;

describe('BillingController', () => {
  let controller: BillingController;
  let mockService: jest.Mocked<BillingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BillingController();
    mockService = MockBillingService.mock.instances[0] as jest.Mocked<BillingService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  it('getPlans delegates to service', async () => {
    mockService.getPlans.mockResolvedValue([{ id: 'p1' }] as never);
    const r = res();
    await controller.getPlans({} as Request, r);
    expect(mockService.getPlans).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('getPlan passes slug param', async () => {
    mockService.getPlanBySlug.mockResolvedValue({ slug: 'pro' } as never);
    const r = res();
    await controller.getPlan({ params: { slug: 'pro' } } as unknown as Request, r);
    expect(mockService.getPlanBySlug).toHaveBeenCalledWith('pro', undefined);
  });

  it('getCurrentSubscription uses authenticated user', async () => {
    mockService.getUserCurrentSubscription.mockResolvedValue({ id: 'sub' } as never);
    const r = res();
    await controller.getCurrentSubscription(authed('buyer-2'), r);
    expect(mockService.getUserCurrentSubscription).toHaveBeenCalledWith('buyer-2');
  });

  it('getInvoices passes pagination from query', async () => {
    mockService.getUserInvoices.mockResolvedValue({ invoices: [], total: 0 } as never);
    const r = res();
    await controller.getInvoices(
      { ...authed(), query: { page: 2, limit: 10 } } as unknown as Request,
      r
    );
    expect(mockService.getUserInvoices).toHaveBeenCalledWith('u1', 2, 10);
  });

  it('getInvoice passes id and user', async () => {
    mockService.getInvoiceById.mockResolvedValue({ id: 'inv1' } as never);
    const r = res();
    await controller.getInvoice(
      { ...authed(), params: { id: 'inv-uuid' } } as unknown as Request,
      r
    );
    expect(mockService.getInvoiceById).toHaveBeenCalledWith('inv-uuid', 'u1');
  });

  it('checkLimit passes limit key', async () => {
    mockService.checkPlanLimit.mockResolvedValue(false as never);
    const r = res();
    await controller.checkLimit(
      { ...authed(), params: { key: 'api_calls' } } as unknown as Request,
      r
    );
    expect(mockService.checkPlanLimit).toHaveBeenCalledWith('u1', 'api_calls');
  });
});
