import { Request, Response } from 'express';
import { SistemNaplateController } from '../../modules/sistem-naplate/controller/sistem-naplate.controller';
import { SistemNaplateService } from '../../modules/sistem-naplate/service/sistem-naplate.service';
import * as response from '../../utils/response';

jest.mock('../../modules/sistem-naplate/service/sistem-naplate.service');

const MockSistemNaplateService = SistemNaplateService as jest.MockedClass<typeof SistemNaplateService>;

describe('SistemNaplateController', () => {
  let controller: SistemNaplateController;
  let mockService: jest.Mocked<SistemNaplateService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SistemNaplateController();
    mockService = MockSistemNaplateService.mock.instances[0] as jest.Mocked<SistemNaplateService>;
  });

  const mockRes = (): Response => {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  it('list passes userId and returns rows', async () => {
    mockService.list.mockResolvedValue([{ id: 'w1' }]);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.list(authed(), res);
    expect(mockService.list).toHaveBeenCalledWith('u1');
    expect(sendSpy).toHaveBeenCalledWith(res, [{ id: 'w1' }]);
    sendSpy.mockRestore();
  });

  it('list sends empty array when user has no workspaces', async () => {
    mockService.list.mockResolvedValue([]);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.list(authed(), res);
    expect(sendSpy).toHaveBeenCalledWith(res, []);
    sendSpy.mockRestore();
  });

  it('create passes user and body', async () => {
    const body = { name: 'Naplata', budgetAllocated: 100, billingCadence: 'monthly' as const };
    mockService.create.mockResolvedValue({ id: 'created' });
    const sendSpy = jest.spyOn(response, 'sendCreated').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.create({ ...authed(), body } as Request, res);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'created' }, 'Sistem naplate workspace created');
    sendSpy.mockRestore();
  });

  it('run passes id, user, and body', async () => {
    const body = { mode: 'settlement' as const, batchSize: 10 };
    mockService.run.mockResolvedValue({ id: 'run-1' });
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.run({ ...authed(), params: { id: 'sid' }, body } as unknown as Request, res);
    expect(mockService.run).toHaveBeenCalledWith('sid', 'u1', body);
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'run-1' }, 'Sistem naplate cycle completed');
    sendSpy.mockRestore();
  });
});
