import { Request, Response } from 'express';
import { BillingController } from '../../modules/billing/controller/billing.controller';
import { BillingService } from '../../modules/billing/service/billing.service';

jest.mock('../../modules/billing/service/billing.service');

const mockFulfillmentRead = {
  listForUser: jest.fn(),
  listForAdmin: jest.fn(),
  getJob: jest.fn(),
  getArtifactFile: jest.fn(),
};

const mockFulfillmentWrite = {
  approveRelease: jest.fn(),
  rejectRelease: jest.fn(),
};

jest.mock('../../modules/billing/service/deliverable-fulfillment-read.service', () => ({
  DeliverableFulfillmentReadService: jest.fn().mockImplementation(() => mockFulfillmentRead),
}));

jest.mock('../../modules/billing/service/deliverable-fulfillment.service', () => ({
  DeliverableFulfillmentService: jest.fn().mockImplementation(() => mockFulfillmentWrite),
}));

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  createReadStream: jest.fn(() => ({ pipe: jest.fn() })),
}));

const MockBillingService = BillingService as jest.MockedClass<typeof BillingService>;

describe('BillingController', () => {
  let controller: BillingController;
  let mockService: jest.Mocked<BillingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BillingController();
    mockService = MockBillingService.mock.instances[0] as jest.Mocked<BillingService>;
    mockFulfillmentRead.listForUser.mockResolvedValue([]);
    mockFulfillmentRead.listForAdmin.mockResolvedValue([]);
    mockFulfillmentRead.getJob.mockResolvedValue({ paymentId: 'pay-1', status: 'completed' });
    mockFulfillmentRead.getArtifactFile.mockResolvedValue({
      filePath: '/tmp/a.pdf',
      contentType: 'application/pdf',
      downloadName: 'report.pdf',
    });
    mockFulfillmentWrite.approveRelease.mockResolvedValue({ released: true });
    mockFulfillmentWrite.rejectRelease.mockResolvedValue(true);
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

  it('listFulfillmentJobs delegates to read service', async () => {
    mockFulfillmentRead.listForUser.mockResolvedValue([{ paymentId: 'p1' }]);
    const r = res();
    await controller.listFulfillmentJobs(
      { ...authed('buyer-3'), query: { limit: 10 } } as unknown as Request,
      r,
    );
    expect(mockFulfillmentRead.listForUser).toHaveBeenCalledWith('buyer-3', 10);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('getFulfillmentJob passes payment id and user context', async () => {
    const r = res();
    await controller.getFulfillmentJob(
      {
        ...authed('buyer-4'),
        params: { paymentId: 'pay-99' },
        user: { userId: 'buyer-4', role: 'user', email: 'a@b.com' },
      } as unknown as Request,
      r,
    );
    expect(mockFulfillmentRead.getJob).toHaveBeenCalledWith('pay-99', 'buyer-4', 'user');
  });

  it('approveFulfillmentJob and rejectFulfillmentJob delegate to write service', async () => {
    const approveRes = res();
    await controller.approveFulfillmentJob(
      { params: { paymentId: 'pay-approve' } } as unknown as Request,
      approveRes,
    );
    expect(mockFulfillmentWrite.approveRelease).toHaveBeenCalledWith('pay-approve');

    const rejectRes = res();
    await controller.rejectFulfillmentJob(
      { params: { paymentId: 'pay-reject' }, body: { notes: 'needs revision' } } as unknown as Request,
      rejectRes,
    );
    expect(mockFulfillmentWrite.rejectRelease).toHaveBeenCalledWith('pay-reject', 'needs revision');
  });

  it('downloadFulfillmentArtifact streams artifact file', async () => {
    const r = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    await controller.downloadFulfillmentArtifact(
      {
        ...authed('buyer-5'),
        params: { paymentId: 'pay-dl', filename: 'brief.pdf' },
        user: { userId: 'buyer-5', role: 'user', email: 'a@b.com' },
      } as unknown as Request,
      r,
    );
    expect(mockFulfillmentRead.getArtifactFile).toHaveBeenCalledWith({
      paymentId: 'pay-dl',
      filename: 'brief.pdf',
      userId: 'buyer-5',
      role: 'user',
    });
    expect(r.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  });
});
