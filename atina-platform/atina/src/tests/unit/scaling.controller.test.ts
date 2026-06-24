import { Request, Response } from 'express';
import { ScalingController } from '../../modules/scaling/controller/scaling.controller';
import { ScalingService } from '../../modules/scaling/service/scaling.service';

jest.mock('../../modules/scaling/service/scaling.service');

const MockScalingService = ScalingService as jest.MockedClass<typeof ScalingService>;

describe('ScalingController', () => {
  let controller: ScalingController;
  let mockService: jest.Mocked<ScalingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ScalingController();
    mockService = MockScalingService.mock.instances[0] as jest.Mocked<ScalingService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  it('listNodes returns active nodes', async () => {
    mockService.listNodes.mockResolvedValue([{ node_name: 'n1' }]);
    const r = res();
    await controller.listNodes({} as Request, r);
    expect(mockService.listNodes).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [{ node_name: 'n1' }] }),
    );
  });

  it('registerNode creates a node', async () => {
    mockService.registerNode.mockResolvedValue({ node_name: 'n2', zone: 'eu' });
    const r = res();
    const req = {
      body: { nodeName: 'n2', zone: 'eu', capacityScore: 80, metadata: { rack: 'a1' } },
    } as Request;
    await controller.registerNode(req, r);
    expect(mockService.registerNode).toHaveBeenCalledWith('n2', 'eu', 80, { rack: 'a1' });
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('evaluate returns scaling recommendation', async () => {
    mockService.evaluate.mockResolvedValue({
      action: 'scale_up',
      reason: 'No active nodes registered',
      averageUtilizationPct: 0,
      activeNodes: 0,
      targetUtilizationPct: 75,
      workloadKey: null,
      evaluatedAt: '2026-06-24T00:00:00.000Z',
    });
    const r = res();
    const req = { body: { targetUtilizationPct: 75 } } as Request;
    await controller.evaluate(req, r);
    expect(mockService.evaluate).toHaveBeenCalledWith({ targetUtilizationPct: 75 });
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
