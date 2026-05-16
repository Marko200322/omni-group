import { Request, Response } from 'express';
import { TitanMonitorController } from '../../modules/titan-monitor/controller/titan-monitor.controller';
import { TitanMonitorService } from '../../modules/titan-monitor/service/titan-monitor.service';
import * as response from '../../utils/response';

jest.mock('../../modules/titan-monitor/service/titan-monitor.service');

const MockTitanMonitorService = TitanMonitorService as jest.MockedClass<typeof TitanMonitorService>;

describe('TitanMonitorController', () => {
  let controller: TitanMonitorController;
  let mockService: jest.Mocked<TitanMonitorService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TitanMonitorController();
    mockService = MockTitanMonitorService.mock.instances[0] as jest.Mocked<TitanMonitorService>;
  });

  const mockRes = (): Response => {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  it('snapshot returns service payload via sendSuccess', async () => {
    const payload = {
      activeUsers: 1,
      totalRevenue: 0,
      activeTasks: 0,
      activeEcosystems: 0,
      healthScore: 40,
      monitoredAt: '2026-01-01T00:00:00.000Z',
    };
    mockService.getSnapshot.mockResolvedValue(payload);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.snapshot({} as Request, res);
    expect(mockService.getSnapshot).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledWith(res, payload);
    sendSpy.mockRestore();
  });
});
