import { Request, Response } from 'express';
import { PhaseLaunchController } from '../../modules/phase-launch/controller/phase-launch.controller';
import { PhaseLaunchService } from '../../modules/phase-launch/service/phase-launch.service';
import { PhaseBootService } from '../../modules/phase-launch/service/phase-boot.service';

jest.mock('../../modules/phase-launch/service/phase-launch.service');
jest.mock('../../modules/phase-launch/service/phase-boot.service');

const MockPhaseLaunchService = PhaseLaunchService as jest.MockedClass<typeof PhaseLaunchService>;
const MockPhaseBootService = PhaseBootService as jest.MockedClass<typeof PhaseBootService>;

describe('PhaseLaunchController', () => {
  let controller: PhaseLaunchController;
  let mockService: jest.Mocked<PhaseLaunchService>;
  let mockBoot: jest.Mocked<PhaseBootService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PhaseLaunchController();
    mockService = MockPhaseLaunchService.mock.instances[0] as jest.Mocked<PhaseLaunchService>;
    mockBoot = MockPhaseBootService.mock.instances[0] as jest.Mocked<PhaseBootService>;
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
  });

  it('bootStatus returns boot service payload', async () => {
    const payload = {
      phase: 'v6',
      boot: { edgeSwarmEnabled: true, completedPhases: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] },
      manifest: [],
    };
    mockBoot.getBootState.mockResolvedValue(payload as never);
    const r = res();
    await controller.bootStatus({} as Request, r);
    expect(mockBoot.getBootState).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('pdfSignoff records legal sign-off', async () => {
    mockBoot.recordPdfLegalSignoff.mockResolvedValue({
      signed: true,
      signedAt: '2026-06-24T00:00:00.000Z',
      signedByUserId: 'u1',
      trackerVersion: 'tracker',
      notes: '',
    });
    const r = res();
    await controller.pdfSignoff({
      ...authed('u1'),
      body: { trackerVersion: 'tracker', notes: 'ok' },
    } as Request, r);
    expect(mockBoot.recordPdfLegalSignoff).toHaveBeenCalledWith({
      actorUserId: 'u1',
      trackerVersion: 'tracker',
      notes: 'ok',
    });
  });

  it('getPdfSignoff returns status', async () => {
    mockBoot.getPdfLegalSignoff.mockResolvedValue({
      signed: true,
      signedAt: null,
      signedByUserId: null,
      trackerVersion: null,
      notes: '',
    });
    const r = res();
    await controller.getPdfSignoff({} as Request, r);
    expect(mockBoot.getPdfLegalSignoff).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
