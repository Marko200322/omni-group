import { PhaseLaunchService } from '../../modules/phase-launch/service/phase-launch.service';

// eslint-disable-next-line no-var
var phaseRepo: {
  ensureFlag: jest.Mock;
  getFlag: jest.Mock;
  setFlag: jest.Mock;
  insertPhaseLaunchAudit: jest.Mock;
};

jest.mock('../../modules/phase-launch/repository/phase-launch.repository', () => {
  phaseRepo = {
    ensureFlag: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    getFlag: jest.fn(),
    setFlag: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    insertPhaseLaunchAudit: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    PhaseLaunchRepository: jest.fn().mockImplementation(() => phaseRepo),
  };
});
jest.mock('../../modules/phase-launch/middleware/phase-activation.middleware', () => ({
  getPhaseOrder: jest.fn(() => ({ v1: 1, v2: 2 })),
  getModulePhaseGatingStatus: jest.fn(() => ({ 'workflow-chain': true })),
  resetPhaseActivationCache: jest.fn(),
}));

describe('PhaseLaunchService', () => {
  let service: PhaseLaunchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PhaseLaunchService();
  });

  it('getCurrentPhase returns defaults when config is empty', async () => {
    phaseRepo.getFlag.mockResolvedValueOnce({
      rows: [{ config: {} }],
      rowCount: 1,
    });

    const result = await service.getCurrentPhase();

    expect(phaseRepo.ensureFlag).toHaveBeenCalled();
    expect(result).toEqual({ currentPhase: 'v1', notes: '', updatedAt: null });
  });

  it('setCurrentPhase clears phase activation cache', async () => {
    const { resetPhaseActivationCache } = jest.requireMock(
      '../../modules/phase-launch/middleware/phase-activation.middleware'
    ) as { resetPhaseActivationCache: jest.Mock };
    phaseRepo.getFlag.mockResolvedValueOnce({
      rows: [{ config: { current_phase: 'v2', notes: '', updated_at: null } }],
      rowCount: 1,
    });

    await service.setCurrentPhase({ phase: 'v3', notes: 'go' });

    expect(resetPhaseActivationCache).toHaveBeenCalled();
  });

  it('writes normalized phase update audit payload fields', async () => {
    phaseRepo.getFlag
      .mockResolvedValueOnce({
        rows: [{ config: { current_phase: 'v1', notes: 'before-note', updated_at: '2026-01-01T00:00:00.000Z' } }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ config: { current_phase: 'v2', notes: 'after-note', updated_at: '2026-01-02T00:00:00.000Z' } }],
        rowCount: 1,
      });

    await service.setCurrentPhaseWithAudit('admin-1', { phase: 'v2', notes: 'after-note' });

    expect(phaseRepo.insertPhaseLaunchAudit).toHaveBeenCalled();
    const auditArgs = phaseRepo.insertPhaseLaunchAudit.mock.calls[0] as [string, string];
    const payload = JSON.parse(auditArgs[1] ?? '{}') as Record<string, unknown>;

    expect(payload).toEqual(
      expect.objectContaining({
        fromPhase: 'v1',
        toPhase: 'v2',
        notes: 'after-note',
      })
    );
    expect(payload).not.toHaveProperty('previousPhase');
    expect(payload).not.toHaveProperty('currentPhase');
    expect(typeof payload.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(String(payload.timestamp)))).toBe(false);
  });
});
