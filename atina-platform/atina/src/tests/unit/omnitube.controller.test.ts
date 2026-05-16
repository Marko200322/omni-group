import { Request, Response } from 'express';
import { OmniTubeController } from '../../modules/omnitube/controller/omnitube.controller';
import { OmniTubeService } from '../../modules/omnitube/service/omnitube.service';

jest.mock('../../modules/omnitube/service/omnitube.service');

const MockOmniTubeService = OmniTubeService as jest.MockedClass<typeof OmniTubeService>;

describe('OmniTubeController', () => {
  let controller: OmniTubeController;
  let mockService: jest.Mocked<OmniTubeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OmniTubeController();
    mockService = MockOmniTubeService.mock.instances[0] as jest.Mocked<OmniTubeService>;
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
    const created = { id: 't1' };
    mockService.create.mockResolvedValue(created as never);
    const body = { name: 'Channel', budgetAllocated: 100, platform: 'youtube' as const };
    const r = res();
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('run forwards params, user and body', async () => {
    mockService.run.mockResolvedValue({ id: 'run-t' } as never);
    const body = { mode: 'publish' as const };
    const r = res();
    await controller.run({ ...authed(), params: { id: 'tube-9' }, body } as unknown as Request, r);
    expect(mockService.run).toHaveBeenCalledWith('tube-9', 'u1', body);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('list sends success envelope with data', async () => {
    const channels = [{ id: 'c1' }];
    mockService.list.mockResolvedValue(channels as never);
    const r = res();
    await controller.list(authed('u42'), r);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: channels,
        message: 'Success',
      }),
    );
  });

  it('create sends 201 envelope with message', async () => {
    const created = { id: 't-new' };
    mockService.create.mockResolvedValue(created as never);
    const r = res();
    await controller.create({ ...authed(), body: { name: 'Xy', budgetAllocated: 0, platform: 'youtube' as const } } as Request, r);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: created,
        message: 'OmniTube channel created',
      }),
    );
  });
});
