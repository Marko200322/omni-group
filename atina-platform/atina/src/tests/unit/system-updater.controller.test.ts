import { Request, Response } from 'express';
import { SystemUpdaterController } from '../../modules/system-updater/controller/system-updater.controller';
import { SystemUpdaterService } from '../../modules/system-updater/service/system-updater.service';
import * as response from '../../utils/response';

jest.mock('../../modules/system-updater/service/system-updater.service');

const MockSystemUpdaterService = SystemUpdaterService as jest.MockedClass<typeof SystemUpdaterService>;

describe('SystemUpdaterController', () => {
  let controller: SystemUpdaterController;
  let mockService: jest.Mocked<SystemUpdaterService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SystemUpdaterController();
    mockService = MockSystemUpdaterService.mock.instances[0] as jest.Mocked<SystemUpdaterService>;
  });

  const mockRes = (): Response => {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  it('queue passes userId, targetVersion, and empty notes when omitted', async () => {
    mockService.queue.mockResolvedValue({ id: 'job-1' });
    const sendSpy = jest.spyOn(response, 'sendCreated').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.queue({ ...authed(), body: { targetVersion: '2.4.0' } } as Request, res);
    expect(mockService.queue).toHaveBeenCalledWith('u1', '2.4.0', '');
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'job-1' }, 'Updater job queued');
    sendSpy.mockRestore();
  });

  it('queue passes notes when provided', async () => {
    mockService.queue.mockResolvedValue({ id: 'j2' });
    const sendSpy = jest.spyOn(response, 'sendCreated').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.queue({
      ...authed(),
      body: { targetVersion: '2.4.1', notes: 'after hotfix' },
    } as Request, res);
    expect(mockService.queue).toHaveBeenCalledWith('u1', '2.4.1', 'after hotfix');
    sendSpy.mockRestore();
  });

  it('list delegates to service', async () => {
    mockService.list.mockResolvedValue([{ id: 'j' }]);
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.list({} as Request, res);
    expect(mockService.list).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledWith(res, [{ id: 'j' }]);
    sendSpy.mockRestore();
  });

  it('finish passes id, status, and result', async () => {
    mockService.finish.mockResolvedValue({ id: 'j', status: 'completed' });
    const sendSpy = jest.spyOn(response, 'sendSuccess').mockReturnValue(undefined as never);
    const res = mockRes();
    await controller.finish(
      {
        params: { id: 'job-x' },
        body: { status: 'completed', result: { steps: 3 } },
      } as unknown as Request,
      res
    );
    expect(mockService.finish).toHaveBeenCalledWith('job-x', 'completed', { steps: 3 });
    expect(sendSpy).toHaveBeenCalledWith(res, { id: 'j', status: 'completed' }, 'Updater job finalized');
    sendSpy.mockRestore();
  });
});
