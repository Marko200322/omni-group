import { PhaseLaunchService } from '../../modules/phase-launch/service/phase-launch.service';
import * as db from '../../database/connection';

// eslint-disable-next-line no-var
var phaseRepo: {
  ensureFlag: jest.Mock;
  getFlag: jest.Mock;
  setFlag: jest.Mock;
};

jest.mock('../../modules/phase-launch/repository/phase-launch.repository', () => {
  phaseRepo = {
    ensureFlag: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    getFlag: jest.fn(),
    setFlag: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    PhaseLaunchRepository: jest.fn().mockImplementation(() => phaseRepo),
  };
});

jest.mock('../../database/connection');
jest.mock('../../modules/phase-launch/middleware/phase-activation.middleware', () => ({
  getPhaseOrder: jest.fn(() => ({ v1: 1, v2: 2 })),
  getModulePhaseGatingStatus: jest.fn(() => ({ 'workflow-chain': true })),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('PhaseLaunchService', () => {
  let service: PhaseLaunchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PhaseLaunchService();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
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

    const insertCall = mockQuery.mock.calls.find((c) => (c[0] as string).includes("'phase_launch_updated'"));
    expect(insertCall).toBeDefined();

    const payload = JSON.parse((((insertCall?.[1] as unknown[]) ?? [])[1] as string) ?? '{}') as Record<string, unknown>;

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
