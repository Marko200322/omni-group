import { Request, Response } from 'express';
import { SelfHealingController } from '../../modules/self-healing/controller/self-healing.controller';
import { SelfHealingService } from '../../modules/self-healing/service/self-healing.service';
import * as response from '../../utils/response';

jest.mock('../../modules/self-healing/service/self-healing.service');

const MockSelfHealingService = SelfHealingService as jest.MockedClass<typeof SelfHealingService>;

describe('SelfHealingController', () => {
  let controller: SelfHealingController;
  let mockService: jest.Mocked<SelfHealingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SelfHealingController();
    mockService = MockSelfHealingService.mock.instances[0] as jest.Mocked<SelfHealingService>;
  });

  const mockRes = (): Response => {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  it('report passes subsystem, issueKey, details', async () => {
    const body = { subsystem: 'tasks', issueKey: 'task_failed:x', details: { taskId: 't1' } };
    mockService.report.mockResolvedValue({ id: 'e1' });
    const sendSpy = jest.spyOn(response, 'sendCreated').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.report({ body } as Request, res);
    expect(mockService.report).toHaveBeenCalledWith('tasks', 'task_failed:x', { taskId: 't1' });
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'e1' }, 'Issue reported');
    sendSpy.mockRestore();
  });

  it('heal passes id, remediationAction, and userId', async () => {
    mockService.heal.mockResolvedValue({ id: 'e1', status: 'healed' });
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.heal(
      { ...authed(), params: { id: 'ev-1' }, body: { remediationAction: 'retry-task' } } as unknown as Request,
      res
    );
    expect(mockService.heal).toHaveBeenCalledWith('ev-1', 'retry-task', 'u1');
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'e1', status: 'healed' }, 'Issue healed');
    sendSpy.mockRestore();
  });

  it('list delegates without user', async () => {
    mockService.list.mockResolvedValue([{ id: 'a' }]);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.list({} as Request, res);
    expect(mockService.list).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledWith(res, [{ id: 'a' }]);
    sendSpy.mockRestore();
  });

  it('autoScan passes userId and body', async () => {
    const body = { includeTasks: false, includePayments: true, includeIntegrations: true };
    const scanResult = { totalCreated: 1, events: [{ id: 'e1' }] };
    mockService.autoScan.mockResolvedValue(scanResult);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.autoScan({ ...authed(), body } as Request, res);
    expect(mockService.autoScan).toHaveBeenCalledWith('u1', body);
    expect(sendSpy).toHaveBeenCalledWith(res, scanResult, 'Auto-scan complete');
    sendSpy.mockRestore();
  });

  it('autoHeal passes userId and maxEvents', async () => {
    const healResult = { attempted: 3, healed: 2, events: [{ id: 'h1' }] };
    mockService.autoHeal.mockResolvedValue(healResult);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.autoHeal({ ...authed(), body: { maxEvents: 5 } } as Request, res);
    expect(mockService.autoHeal).toHaveBeenCalledWith('u1', 5);
    expect(sendSpy).toHaveBeenCalledWith(res, healResult, 'Auto-heal complete');
    sendSpy.mockRestore();
  });

  it('autoHeal passes maxEvents 0 (no-op cap, N3-I4)', async () => {
    const healResult = { attempted: 0, healed: 0, events: [] };
    mockService.autoHeal.mockResolvedValue(healResult);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.autoHeal({ ...authed(), body: { maxEvents: 0 } } as Request, res);
    expect(mockService.autoHeal).toHaveBeenCalledWith('u1', 0);
    expect(sendSpy).toHaveBeenCalledWith(res, healResult, 'Auto-heal complete');
    sendSpy.mockRestore();
  });
});
