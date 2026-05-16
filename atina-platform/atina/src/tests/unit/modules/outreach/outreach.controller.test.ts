import { Request, Response } from 'express';
import { OutreachController } from '../../../../modules/outreach/controller/outreach.controller';
import { OutreachService } from '../../../../modules/outreach/service/outreach.service';

jest.mock('../../../../modules/outreach/service/outreach.service');

const MockOutreachService = OutreachService as jest.MockedClass<typeof OutreachService>;

describe('OutreachController — modules/outreach', () => {
  let controller: OutreachController;
  let mockService: jest.Mocked<OutreachService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OutreachController();
    mockService = MockOutreachService.mock.instances[0] as jest.Mocked<OutreachService>;
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

  it('status delegates to service', async () => {
    mockService.status.mockResolvedValue({ channels: ['email'], dailyCap: 100 } as never);
    const r = res();
    await controller.status({} as Request, r);
    expect(mockService.status).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('list passes userId', async () => {
    mockService.list.mockResolvedValue([] as never);
    await controller.list(authed(), res());
    expect(mockService.list).toHaveBeenCalledWith('u1');
  });

  it('create returns 201', async () => {
    const created = { id: 'o1' };
    mockService.create.mockResolvedValue(created as never);
    const body = { name: 'Camp', budgetAllocated: 0, channelFocus: 'email' as const };
    const r = res();
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('run passes idempotency header value to service', async () => {
    mockService.run.mockResolvedValue({ id: 'run-o' } as never);
    const body = { mode: 'send' as const, intensity: 5, revenueEstimate: 10 };
    const req = {
      ...authed(),
      params: { id: 'ws-1' },
      body,
      header: jest.fn().mockReturnValue('idem-key-1'),
    } as unknown as Request;
    const r = res();
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('ws-1', 'u1', body, 'idem-key-1');
  });

  it('run passes undefined idempotency when header missing', async () => {
    mockService.run.mockResolvedValue({ id: 'run-o2' } as never);
    const body = { mode: 'sequence' as const, intensity: 3 };
    const req = {
      ...authed(),
      params: { id: 'ws-2' },
      body,
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    await controller.run(req, res());
    expect(mockService.run).toHaveBeenCalledWith('ws-2', 'u1', body, undefined);
  });
});
