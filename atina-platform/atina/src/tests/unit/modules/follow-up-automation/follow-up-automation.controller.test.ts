import { Request, Response } from 'express';
import { FollowUpAutomationController } from '../../../../modules/follow-up-automation/controller/follow-up-automation.controller';
import { FollowUpAutomationService } from '../../../../modules/follow-up-automation/service/follow-up-automation.service';

jest.mock('../../../../modules/follow-up-automation/service/follow-up-automation.service');

const MockFollowUpAutomationService = FollowUpAutomationService as jest.MockedClass<
  typeof FollowUpAutomationService
>;

describe('FollowUpAutomationController', () => {
  let controller: FollowUpAutomationController;
  let mockService: jest.Mocked<FollowUpAutomationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FollowUpAutomationController();
    mockService = MockFollowUpAutomationService.mock.instances[0] as jest.Mocked<FollowUpAutomationService>;
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

  it('status returns service payload via sendSuccess', async () => {
    const payload = {
      strategies: ['aggressive', 'balanced', 'light'],
      activeStrategy: 'balanced',
      pipelineCapacity: { maxFollowUpsPerRun: 400, cooldownSeconds: 25 },
    };
    mockService.status.mockResolvedValue(payload as never);
    const r = res();
    await controller.status({} as Request, r);
    expect(mockService.status).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: payload, message: expect.any(String) })
    );
  });

  it('list passes userId from auth', async () => {
    mockService.list.mockResolvedValue([{ id: 'auto-1' }] as never);
    const r = res();
    await controller.list(authed('user-42'), r);
    expect(mockService.list).toHaveBeenCalledWith('user-42');
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('create parses body and returns 201', async () => {
    const created = { id: 'created-sys' };
    mockService.create.mockResolvedValue(created as never);
    const r = res();
    const body = { name: 'Auto WS', budgetAllocated: 100, followUpStrategy: 'light' as const };
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: created,
        message: 'Follow-up Automation workspace created',
      })
    );
  });

  it('run forwards params id, user, and body', async () => {
    const runRow = { id: 'run-x' };
    mockService.run.mockResolvedValue(runRow as never);
    const r = res();
    const body = { mode: 'escalate' as const, intensity: 30, revenueEstimate: 60 };
    await controller.run({ ...authed(), params: { id: 'sys-9' }, body } as unknown as Request, r);
    expect(mockService.run).toHaveBeenCalledWith('sys-9', 'u1', body);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: runRow,
        message: 'Follow-up Automation run completed',
      })
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
