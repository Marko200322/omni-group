import { Request, Response } from 'express';
import { LoadBalancerController } from '../../modules/load-balancer/controller/load-balancer.controller';
import { LoadBalancerService } from '../../modules/load-balancer/service/load-balancer.service';

jest.mock('../../modules/load-balancer/service/load-balancer.service');

const MockLoadBalancerService = LoadBalancerService as jest.MockedClass<typeof LoadBalancerService>;

describe('LoadBalancerController', () => {
  let controller: LoadBalancerController;
  let mockService: jest.Mocked<LoadBalancerService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new LoadBalancerController();
    mockService = MockLoadBalancerService.mock.instances[0] as jest.Mocked<LoadBalancerService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  it('register delegates to service and returns 201', async () => {
    const row = { id: 'n1' };
    mockService.register.mockResolvedValue(row as never);
    const body = { nodeName: 'a', zone: 'eu', capacityScore: 10, metadata: { k: 1 } };
    const r = res();
    await controller.register({ body } as Request, r);
    expect(mockService.register).toHaveBeenCalledWith('a', 'eu', 10, { k: 1 });
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('list returns rows', async () => {
    mockService.list.mockResolvedValue([{ id: 'n1' }] as never);
    const r = res();
    await controller.list({} as Request, r);
    expect(mockService.list).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('dispatch passes workloadKey', async () => {
    const data = { node: {}, workloadKey: 'w1', loadAdded: 2 };
    mockService.dispatch.mockResolvedValue(data as never);
    const r = res();
    await controller.dispatch({ body: { workloadKey: 'w1' } } as Request, r);
    expect(mockService.dispatch).toHaveBeenCalledWith('w1');
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
