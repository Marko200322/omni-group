import { Request, Response } from 'express';
import { TitanScoreController } from '../../modules/titan-score/controller/titan-score.controller';
import { TitanScoreService } from '../../modules/titan-score/service/titan-score.service';
import { TitanScoreStatusDtoType } from '../../modules/titan-score/dto/titan-score.dto';
import * as response from '../../utils/response';

jest.mock('../../modules/titan-score/service/titan-score.service');

const MockTitanScoreService = TitanScoreService as jest.MockedClass<typeof TitanScoreService>;

describe('TitanScoreController', () => {
  let controller: TitanScoreController;
  let mockService: jest.Mocked<TitanScoreService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TitanScoreController();
    mockService = MockTitanScoreService.mock.instances[0] as jest.Mocked<TitanScoreService>;
  });

  const mockRes = (): Response => {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  it('status returns service payload via sendSuccess', async () => {
    const payload: TitanScoreStatusDtoType = {
      modes: ['snapshot', 'trend', 'compare'],
      scoreRange: { min: 0, max: 100 },
      weightProfiles: ['balanced', 'ops', 'growth'],
    };
    mockService.status.mockResolvedValue(payload);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.status(authed(), res);
    expect(mockService.status).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledWith(res, payload);
    sendSpy.mockRestore();
  });

  it('list passes userId from auth', async () => {
    mockService.list.mockResolvedValue([{ id: 'w1' }]);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.list(authed('u99'), res);
    expect(mockService.list).toHaveBeenCalledWith('u99');
    expect(sendSpy).toHaveBeenCalledWith(res, [{ id: 'w1' }]);
    sendSpy.mockRestore();
  });

  it('create passes user and body', async () => {
    const body = { name: 'Workspace', budgetAllocated: 0, modelPreset: 'standard' as const };
    mockService.create.mockResolvedValue({ id: 'new' });
    const sendSpy = jest.spyOn(response, 'sendCreated').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.create({ ...authed(), body } as Request, res);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'new' }, 'Titan Score workspace created');
    sendSpy.mockRestore();
  });

  it('run passes id param, user, and body', async () => {
    const body = { mode: 'trend' as const, points: [{ key: 'k', value: 1 }] };
    mockService.run.mockResolvedValue({ id: 'run-1' });
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.run({ ...authed(), params: { id: 'sys-1' }, body } as unknown as Request, res);
    expect(mockService.run).toHaveBeenCalledWith('sys-1', 'u1', body);
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'run-1' }, 'Titan Score run completed');
    sendSpy.mockRestore();
  });
});
