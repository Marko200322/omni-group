import * as db from '../../database/connection';
import { PhaseBootService } from '../../modules/phase-launch/service/phase-boot.service';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('PhaseBootService', () => {
  let service: PhaseBootService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PhaseBootService();
    delete process.env.DEPLOY_BOOT_SKIP_PDF_SIGNOFF;
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('runBootSequence v1 does not require PDF sign-off', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [{ config: { current_phase: 'v1', pdfLegalSignoff: { signed: false } } }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const boot = await service.runBootSequence('v1');
    expect(boot.completedPhases).toEqual(['v1']);
    expect(boot.edgeSwarmEnabled).toBe(false);
    expect(boot.k8sVisionEnabled).toBe(false);
  });

  it('runBootSequence v6 fails without PDF legal sign-off', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [{ config: { pdfLegalSignoff: { signed: false } } }],
        rowCount: 1,
      } as never);

    await expect(service.runBootSequence('v6')).rejects.toThrow(/PDF legal sign-off/);
  });

  it('runBootSequence v6 enables edge swarm when sign-off exists', async () => {
    const signedConfig = {
      rows: [{
        config: {
          pdfLegalSignoff: {
            signed: true,
            signedAt: '2026-06-24T00:00:00.000Z',
            trackerVersion: 'FAZA-6-PDF-ALIGNMENT-TRACKER.md',
          },
        },
      }],
      rowCount: 1,
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce(signedConfig as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const boot = await service.runBootSequence('v6');
    expect(boot.edgeSwarmEnabled).toBe(true);
    expect(boot.edgeSwarmMaxProfiles).toBe(125_000);
    expect(boot.k8sVisionEnabled).toBe(true);
    expect(boot.completedPhases).toContain('v6');
  });

  it('getBootState returns manifest and boot flags', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [{
          config: {
            current_phase: 'v5',
            boot: {
              completedPhases: ['v1', 'v2', 'v3', 'v4', 'v5'],
              edgeSwarmEnabled: false,
              edgeSwarmMaxProfiles: 10_000,
              k8sVisionEnabled: true,
              lastBootAt: '2026-06-24T00:00:00.000Z',
            },
          },
        }],
        rowCount: 1,
      } as never);

    const state = await service.getBootState();
    expect(state.phase).toBe('v5');
    expect(state.boot.k8sVisionEnabled).toBe(true);
    expect(state.manifest).toHaveLength(6);
  });

  it('recordPdfLegalSignoff persists signed payload', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const signoff = await service.recordPdfLegalSignoff({
      actorUserId: 'admin-1',
      trackerVersion: 'FAZA-6-PDF-ALIGNMENT-TRACKER.md',
      notes: 'ok',
    });

    expect(signoff.signed).toBe(true);
    expect(signoff.trackerVersion).toContain('FAZA-6');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('runBootSequence v6 allowed when DEPLOY_BOOT_SKIP_PDF_SIGNOFF=1', async () => {
    process.env.DEPLOY_BOOT_SKIP_PDF_SIGNOFF = '1';
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const boot = await service.runBootSequence('v6');
    expect(boot.edgeSwarmEnabled).toBe(true);
  });
});
