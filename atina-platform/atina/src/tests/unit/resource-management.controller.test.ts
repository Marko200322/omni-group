import { Request, Response } from 'express';
import { ResourceManagementController } from '../../modules/resource-management/controller/resource-management.controller';
import { ResourceManagementService } from '../../modules/resource-management/service/resource-management.service';

jest.mock('../../modules/resource-management/service/resource-management.service');

const MockResourceManagementService = ResourceManagementService as jest.MockedClass<
  typeof ResourceManagementService
>;

describe('ResourceManagementController', () => {
  let controller: ResourceManagementController;
  let mockService: jest.Mocked<ResourceManagementService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ResourceManagementController();
    mockService = MockResourceManagementService.mock.instances[0] as jest.Mocked<ResourceManagementService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  it('overview sends service result', async () => {
    const payload = { budgetAllocated: 1, realizedRevenue: 2, roi: 200 };
    mockService.getOverview.mockResolvedValue(payload);
    const r = res();
    await controller.overview({} as Request, r);
    expect(mockService.getOverview).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: payload, message: 'Success' })
    );
  });

  it('allocate uses userId and body', async () => {
    mockService.allocateBudget.mockResolvedValue({
      allocations: [{ id: 'x' }],
      updatedCount: 1,
    });
    const r = res();
    const req = {
      user: { userId: 'admin1', role: 'admin', email: 'a@test.com' },
      body: { systemSlug: 'craftor', amount: 10, reason: 'Valid reason text' },
    } as Request;
    await controller.allocate(req, r);
    expect(mockService.allocateBudget).toHaveBeenCalledWith('admin1', req.body);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { allocations: [{ id: 'x' }], updatedCount: 1 },
        message: 'Budget allocation applied',
      })
    );
  });
});
