import { Request, Response } from 'express';
import { PhaseLaunchController } from '../../modules/phase-launch/controller/phase-launch.controller';
import { PhaseLaunchService } from '../../modules/phase-launch/service/phase-launch.service';

jest.mock('../../modules/phase-launch/service/phase-launch.service');

const MockPhaseLaunchService = PhaseLaunchService as jest.MockedClass<typeof PhaseLaunchService>;

describe('PhaseLaunchController', () => {
  let controller: PhaseLaunchController;
  let mockService: jest.Mocked<PhaseLaunchService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PhaseLaunchController();
    mockService = MockPhaseLaunchService.mock.instances[0] as jest.Mocked<PhaseLaunchService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'admin', email: 'a@b.com' } }) as Request;

  it('get returns current phase payload', async () => {
    const payload = { currentPhase: 'v2', notes: '', updatedAt: null };
    mockService.getCurrentPhase.mockResolvedValue(payload as never);
    const r = res();
    await controller.get({} as Request, r);
    expect(mockService.getCurrentPhase).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: payload })
    );
  });

  it('set forwards actor and body to service', async () => {
    const after = {
      currentPhase: 'v3',
      notes: 'rollout',
      updatedAt: '2026-01-01',
      changed: true,
      previousPhase: 'v2',
    };
    mockService.setCurrentPhaseWithAudit.mockResolvedValue(after as never);
    const r = res();
    const body = { phase: 'v3' as const, notes: 'rollout' };
    await controller.set({ ...authed('actor-7'), body } as Request, r);
    expect(mockService.setCurrentPhaseWithAudit).toHaveBeenCalledWith('actor-7', body);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: after,
        message: 'Phase updated',
      })
    );
  });
});
