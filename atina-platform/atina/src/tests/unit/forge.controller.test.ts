import { Request, Response } from 'express';
import { ForgeController } from '../../modules/forge/controller/forge.controller';
import { ForgeService } from '../../modules/forge/service/forge.service';

jest.mock('../../modules/forge/service/forge.service');

const MockForgeService = ForgeService as jest.MockedClass<typeof ForgeService>;

describe('ForgeController', () => {
  let controller: ForgeController;
  let mockService: jest.Mocked<ForgeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ForgeController();
    mockService = MockForgeService.mock.instances[0] as jest.Mocked<ForgeService>;
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
      providers: ['oracle'] as ('oracle' | 'aws' | 'azure')[],
      nextProvider: 'oracle' as const,
      budgetRsd: { initial: 100, remaining: 50, spent: 50 },
      budgetGuard: { minReserveRsd: 0, hardStopMode: false, availableToSpendRsd: 50 },
      recentEvents: [],
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
    mockService.list.mockResolvedValue([{ id: 'f1' }] as never);
    const r = res();
    await controller.list(authed('u77'), r);
    expect(mockService.list).toHaveBeenCalledWith('u77');
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('create parses body and returns 201', async () => {
    const created = { id: 'forge-new' };
    mockService.create.mockResolvedValue(created as never);
    const r = res();
    const body = { name: 'Forge WS', budgetAllocated: 5, operatingMode: 'steady' as const };
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: created,
        message: 'Forge workspace created',
      })
    );
  });

  it('run omits idempotency when header absent', async () => {
    mockService.run.mockResolvedValue({ id: 'run-f1' } as never);
    const r = res();
    const body = { mode: 'schedule' as const, intensity: 30 };
    const req = {
      ...authed(),
      params: { id: 'forge-sys' },
      body,
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    await controller.run(req, r);
    expect(req.header).toHaveBeenCalledWith('Idempotency-Key');
    expect(mockService.run).toHaveBeenCalledWith('forge-sys', 'u1', body, undefined);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { id: 'run-f1' }, message: 'Forge run completed' })
    );
  });

  it('run passes Idempotency-Key header to service', async () => {
    mockService.run.mockResolvedValue({ id: 'run-f2' } as never);
    const r = res();
    const body = { mode: 'digest' as const, intensity: 50 };
    const req = {
      ...authed(),
      params: { id: 'sid' },
      body,
      header: jest.fn().mockReturnValue('  forge-key  '),
    } as unknown as Request;
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('sid', 'u1', body, '  forge-key  ');
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
