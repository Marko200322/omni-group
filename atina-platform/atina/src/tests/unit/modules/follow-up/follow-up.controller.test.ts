import { Request, Response } from 'express';
import { FollowUpController } from '../../../../modules/follow-up/controller/follow-up.controller';
import { FollowUpService } from '../../../../modules/follow-up/service/follow-up.service';

jest.mock('../../../../modules/follow-up/service/follow-up.service');

const MockFollowUpService = FollowUpService as jest.MockedClass<typeof FollowUpService>;

describe('FollowUpController', () => {
  let controller: FollowUpController;
  let mockService: jest.Mocked<FollowUpService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FollowUpController();
    mockService = MockFollowUpService.mock.instances[0] as jest.Mocked<FollowUpService>;
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
      cadences: ['steady', 'persistent', 'light'],
      activeCadence: 'steady' as const,
      pipelineCapacity: { maxTouchpointsPerRun: 120, cooldownSeconds: 30 },
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
    mockService.list.mockResolvedValue([{ id: 'w1' }] as never);
    const r = res();
    await controller.list(authed('u99'), r);
    expect(mockService.list).toHaveBeenCalledWith('u99');
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalled();
  });

  it('create parses body and returns 201', async () => {
    const created = { id: 'new-w' };
    mockService.create.mockResolvedValue(created as never);
    const r = res();
    const body = { name: 'My FU', budgetAllocated: 25, cadencePreset: 'steady' as const };
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: created,
        message: 'Follow-up workspace created',
      })
    );
  });

  it('run forwards id, user, body and omits idempotency when header absent', async () => {
    const runRow = { id: 'run-1' };
    mockService.run.mockResolvedValue(runRow as never);
    const r = res();
    const body = { mode: 'schedule' as const, intensity: 20 };
    const req = {
      ...authed(),
      params: { id: 'sys-1' },
      body,
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    await controller.run(req, r);
    expect(req.header).toHaveBeenCalledWith('Idempotency-Key');
    expect(mockService.run).toHaveBeenCalledWith('sys-1', 'u1', body, undefined);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: runRow, message: 'Follow-up run completed' })
    );
  });

  it('run passes Idempotency-Key header to service', async () => {
    mockService.run.mockResolvedValue({ id: 'run-2' } as never);
    const r = res();
    const body = { mode: 'digest' as const, intensity: 40 };
    const req = {
      ...authed(),
      params: { id: 'sid' },
      body,
      header: jest.fn().mockReturnValue('  key-abc  '),
    } as unknown as Request;
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('sid', 'u1', body, '  key-abc  ');
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
