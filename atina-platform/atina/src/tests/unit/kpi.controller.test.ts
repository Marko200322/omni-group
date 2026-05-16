import { Request, Response } from 'express';
import { KpiController } from '../../modules/kpi/controller/kpi.controller';
import { KpiService } from '../../modules/kpi/service/kpi.service';

jest.mock('../../modules/kpi/service/kpi.service');

const MockKpiService = KpiService as jest.MockedClass<typeof KpiService>;

describe('KpiController', () => {
  let controller: KpiController;
  let mockService: jest.Mocked<KpiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new KpiController();
    mockService = MockKpiService.mock.instances[0] as jest.Mocked<KpiService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  it('dashboard sends service payload', async () => {
    const data = {
      activeUsers: 1,
      activeSubscriptions: 0,
      totalRevenue: 0,
      activeTasks: 0,
      activeEcosystemSystems: 0,
    };
    mockService.getDashboard.mockResolvedValue(data);
    const r = res();
    await controller.dashboard({} as Request, r);
    expect(mockService.getDashboard).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data, message: 'Success' })
    );
  });
});
