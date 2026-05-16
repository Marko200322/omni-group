import { Request, Response } from 'express';
import { ClientHunterController } from '../../modules/client-hunter/controller/client-hunter.controller';
import { ClientHunterService } from '../../modules/client-hunter/service/client-hunter.service';

jest.mock('../../modules/client-hunter/service/client-hunter.service');

const MockClientHunterService = ClientHunterService as jest.MockedClass<typeof ClientHunterService>;

describe('ClientHunterController', () => {
  let controller: ClientHunterController;
  let mockService: jest.Mocked<ClientHunterService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ClientHunterController();
    mockService = MockClientHunterService.mock.instances[0] as jest.Mocked<ClientHunterService>;
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

  it('status returns service payload', async () => {
    const payload = { regions: ['eu'] };
    mockService.status.mockResolvedValue(payload as never);
    const r = res();
    await controller.status({} as Request, r);
    expect(mockService.status).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('list passes userId', async () => {
    mockService.list.mockResolvedValue([] as never);
    const r = res();
    await controller.list(authed('u42'), r);
    expect(mockService.list).toHaveBeenCalledWith('u42');
  });

  it('create returns 201', async () => {
    const row = { id: 'ch1' };
    mockService.create.mockResolvedValue(row as never);
    const body = { name: 'Hunt', budgetAllocated: 10, huntStrategy: 'targeted' as const };
    const r = res();
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('run passes trimmed idempotency key', async () => {
    mockService.run.mockResolvedValue({ id: 'r1' } as never);
    const r = res();
    const body = { mode: 'hunt' as const, intensity: 5 };
    const req = {
      ...authed(),
      params: { id: 'sys-9' },
      body,
      header: jest.fn().mockReturnValue('  key-a  '),
    } as unknown as Request;
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('sys-9', 'u1', body, 'key-a');
  });

  it('run omits idempotency when header absent', async () => {
    mockService.run.mockResolvedValue({ id: 'r2' } as never);
    const req = {
      ...authed(),
      params: { id: 's1' },
      body: { mode: 'hunt' as const, intensity: 1 },
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    const r = res();
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('s1', 'u1', req.body, undefined);
  });

  it('run passes undefined idempotency when header blank after trim', async () => {
    mockService.run.mockResolvedValue({ id: 'r3' } as never);
    const req = {
      ...authed(),
      params: { id: 's2' },
      body: { mode: 'discover' as const, intensity: 2 },
      header: jest.fn().mockReturnValue('   '),
    } as unknown as Request;
    const r = res();
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('s2', 'u1', req.body, undefined);
  });
});
