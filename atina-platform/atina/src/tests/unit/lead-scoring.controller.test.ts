import { Request, Response } from 'express';
import { LeadScoringController } from '../../modules/lead-scoring/controller/lead-scoring.controller';
import { LeadScoringService } from '../../modules/lead-scoring/service/lead-scoring.service';

jest.mock('../../modules/lead-scoring/service/lead-scoring.service');

const MockLeadScoringService = LeadScoringService as jest.MockedClass<typeof LeadScoringService>;

describe('LeadScoringController', () => {
  let controller: LeadScoringController;
  let mockService: jest.Mocked<LeadScoringService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new LeadScoringController();
    mockService = MockLeadScoringService.mock.instances[0] as jest.Mocked<LeadScoringService>;
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
    mockService.status.mockResolvedValue({ tiers: [] } as never);
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
    const created = { id: 'ls1' };
    mockService.create.mockResolvedValue(created as never);
    const body = { name: 'Score', budgetAllocated: 5, modelPreset: 'standard' as const };
    const r = res();
    await controller.create({ ...authed(), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u1', body);
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('run passes trimmed idempotency key', async () => {
    mockService.run.mockResolvedValue({ id: 'run-x' } as never);
    const r = res();
    const body = { mode: 'score' as const, intensity: 3 };
    const req = {
      ...authed(),
      params: { id: 'ws-1' },
      body,
      header: jest.fn().mockReturnValue('  ktrim  '),
    } as unknown as Request;
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('ws-1', 'u1', body, 'ktrim');
  });

  it('run passes undefined idempotency when header blank after trim', async () => {
    mockService.run.mockResolvedValue({ id: 'run-y' } as never);
    const req = {
      ...authed(),
      params: { id: 'ws-2' },
      body: { mode: 'score' as const, intensity: 1 },
      header: jest.fn().mockReturnValue('   '),
    } as unknown as Request;
    const r = res();
    await controller.run(req, r);
    expect(mockService.run).toHaveBeenCalledWith('ws-2', 'u1', req.body, undefined);
  });
});
