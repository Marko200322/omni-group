import { Request, Response } from 'express';
import { ProxyRotationController } from '../../modules/proxy-rotation/controller/proxy-rotation.controller';
import { ProxyRotationService } from '../../modules/proxy-rotation/service/proxy-rotation.service';
import * as response from '../../utils/response';

jest.mock('../../modules/proxy-rotation/service/proxy-rotation.service');

const MockProxyRotationService = ProxyRotationService as jest.MockedClass<typeof ProxyRotationService>;

describe('ProxyRotationController', () => {
  let controller: ProxyRotationController;
  let mockService: jest.Mocked<ProxyRotationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProxyRotationController();
    mockService = MockProxyRotationService.mock.instances[0] as jest.Mocked<ProxyRotationService>;
  });

  const mockRes = (): Response => {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  it('status delegates to service and sendSuccess', async () => {
    mockService.status.mockResolvedValue({ poolPolicy: 'round-robin', activeProxies: 2, lastRotationAt: null });
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.status({} as Request, res);
    expect(mockService.status).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledWith(res, {
      poolPolicy: 'round-robin',
      activeProxies: 2,
      lastRotationAt: null,
    });
    sendSpy.mockRestore();
  });

  it('list passes userId', async () => {
    mockService.list.mockResolvedValue([]);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.list(authed('u99'), res);
    expect(mockService.list).toHaveBeenCalledWith('u99');
    expect(sendSpy).toHaveBeenCalledWith(res, []);
    sendSpy.mockRestore();
  });

  it('create passes user and body', async () => {
    const body = { name: 'Pool A', budgetAllocated: 0, poolSize: 5 };
    mockService.create.mockResolvedValue({ id: 'w1' });
    const sendSpy = jest.spyOn(response, 'sendCreated').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.create({ ...authed(), body } as Request, res);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'w1' }, 'Proxy Rotation workspace created');
    sendSpy.mockRestore();
  });

  it('run passes id, user, and body', async () => {
    const body = { mode: 'health' as const, intensity: 50 };
    mockService.run.mockResolvedValue({ ok: true });
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.run({ ...authed(), params: { id: 'ws-1' }, body } as unknown as Request, res);
    expect(mockService.run).toHaveBeenCalledWith('ws-1', 'u1', body);
    expect(sendSpy).toHaveBeenCalledWith(res, { ok: true }, 'Proxy Rotation run completed');
    sendSpy.mockRestore();
  });
});
