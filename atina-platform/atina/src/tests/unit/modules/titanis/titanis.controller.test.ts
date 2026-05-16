import { Request, Response } from 'express';
import { TitanisController } from '../../../../modules/titanis/controller/titanis.controller';
import { TitanisService } from '../../../../modules/titanis/service/titanis.service';

jest.mock('../../../../modules/titanis/service/titanis.service');

const MockTitanisService = TitanisService as jest.MockedClass<typeof TitanisService>;

describe('TitanisController', () => {
  let controller: TitanisController;
  let mockService: jest.Mocked<TitanisService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TitanisController();
    mockService = MockTitanisService.mock.instances[0] as jest.Mocked<TitanisService>;
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

  it('list passes userId and returns 200 payload', async () => {
    mockService.list.mockResolvedValue([{ id: 'w1' }] as never);
    const r = res();
    await controller.list(authed('u42'), r);
    expect(mockService.list).toHaveBeenCalledWith('u42');
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalled();
  });

  it('create calls service with body and uses 201', async () => {
    mockService.create.mockResolvedValue({ id: 'new' } as never);
    const body = { name: 'Workspace', outreachChannel: 'dm' as const, budgetAllocated: 5 };
    const r = res();
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalled();
  });

  it('run forwards id, userId, and body', async () => {
    mockService.run.mockResolvedValue({ id: 'run1' } as never);
    const body = { mode: 'follow-up' as const, targetCount: 12 };
    const r = res();
    await controller.run(
      { ...authed(), params: { id: 'sys-1' }, body } as unknown as Request,
      r
    );
    expect(mockService.run).toHaveBeenCalledWith('sys-1', 'u1', body);
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
