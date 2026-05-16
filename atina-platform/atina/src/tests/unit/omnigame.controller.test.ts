import { Request, Response } from 'express';
import { OmniGameController } from '../../modules/omnigame/controller/omnigame.controller';
import { OmniGameService } from '../../modules/omnigame/service/omnigame.service';

jest.mock('../../modules/omnigame/service/omnigame.service');

const MockOmniGameService = OmniGameService as jest.MockedClass<typeof OmniGameService>;

describe('OmniGameController', () => {
  let controller: OmniGameController;
  let mockService: jest.Mocked<OmniGameService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OmniGameController();
    mockService = MockOmniGameService.mock.instances[0] as jest.Mocked<OmniGameService>;
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

  it('list passes userId', async () => {
    mockService.list.mockResolvedValue([] as never);
    await controller.list(authed(), res());
    expect(mockService.list).toHaveBeenCalledWith('u1');
  });

  it('create returns 201', async () => {
    const created = { id: 'g1' };
    mockService.create.mockResolvedValue(created as never);
    const body = { name: 'Proj', budgetAllocated: 1, genre: 'puzzle' };
    const r = res();
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('run forwards params, user and body', async () => {
    mockService.run.mockResolvedValue({ id: 'run-1' } as never);
    const body = { mode: 'prototype' as const };
    const r = res();
    await controller.run({ ...authed(), params: { id: 'sys-1' }, body } as unknown as Request, r);
    expect(mockService.run).toHaveBeenCalledWith('sys-1', 'u1', body);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('run success response includes cycle message', async () => {
    mockService.run.mockResolvedValue({ id: 'run-2' } as never);
    const r = res();
    await controller.run({ ...authed(), params: { id: 'g-7' }, body: { mode: 'validate' as const } } as unknown as Request, r);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { id: 'run-2' },
        message: 'OmniGame cycle completed',
      }),
    );
  });

  it('list passes distinct userId from auth', async () => {
    mockService.list.mockResolvedValue([] as never);
    await controller.list(authed('other-user'), res());
    expect(mockService.list).toHaveBeenCalledWith('other-user');
  });
});
