import { NotFoundError } from '../../utils/errors';
import { TitanScoreService } from '../../modules/titan-score/service/titan-score.service';

// eslint-disable-next-line no-var
var titanScoreRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/titan-score/repository/titan-score.repository', () => {
  titanScoreRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    TitanScoreRepository: jest.fn().mockImplementation(() => titanScoreRepo),
  };
});

describe('TitanScoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    titanScoreRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    titanScoreRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
  });

  it('run throws when workspace not found', async () => {
    titanScoreRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    const service = new TitanScoreService();
    await expect(
      service.run('x', 'u1', { mode: 'snapshot', payload: {} })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('run snapshot passes deterministic output to createRun', async () => {
    const service = new TitanScoreService();
    await service.run('sid', 'u1', { mode: 'snapshot', payload: { k: 1 } });
    expect(titanScoreRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'titan-score_snapshot',
      expect.objectContaining({
        mode: 'snapshot',
        weightProfile: 'balanced',
        primaryScore: expect.any(Number),
        score: expect.any(Number),
      })
    );
    const payload = titanScoreRepo.createRun.mock.calls[0][2] as { score: number; primaryScore: number };
    expect(payload.score).toBeGreaterThanOrEqual(0);
    expect(payload.score).toBeLessThanOrEqual(100);
    expect(payload.primaryScore).toBe(payload.score);
  });

  it('run trend uses mean as primaryScore', async () => {
    const service = new TitanScoreService();
    await service.run('sid', 'u1', {
      mode: 'trend',
      points: [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ],
    });
    const out = titanScoreRepo.createRun.mock.calls[0][2] as { primaryScore: number; summary: { mean: number } };
    expect(out.primaryScore).toBe(out.summary.mean);
  });

  it('run snapshot uses workspace weight profile in seeds and output', async () => {
    const service = new TitanScoreService();
    titanScoreRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'sid', config: { weight_profile: 'balanced' } }],
    });
    await service.run('sid', 'u1', { mode: 'snapshot', payload: { k: 1 } });
    const balanced = (titanScoreRepo.createRun.mock.calls[0][2] as { score: number }).score;

    titanScoreRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'sid', config: { weight_profile: 'ops' } }],
    });
    await service.run('sid', 'u1', { mode: 'snapshot', payload: { k: 1 } });
    const ops = (titanScoreRepo.createRun.mock.calls[1][2] as { score: number }).score;

    expect(ops).not.toBe(balanced);
    const out = titanScoreRepo.createRun.mock.calls[1][2] as { weightProfile: string };
    expect(out.weightProfile).toBe('ops');
  });

  it('run snapshot treats invalid weight_profile as balanced', async () => {
    const service = new TitanScoreService();
    titanScoreRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'sid', config: { weight_profile: 'unknown' } }],
    });
    await service.run('sid', 'u1', { mode: 'snapshot', payload: { k: 1 } });
    const out = titanScoreRepo.createRun.mock.calls[0][2] as { weightProfile: string };
    expect(out.weightProfile).toBe('balanced');
  });

  it('run compare sets winner', async () => {
    const service = new TitanScoreService();
    await service.run('sid', 'u1', {
      mode: 'compare',
      left: { x: 1 },
      right: { y: 2 },
    });
    const out = titanScoreRepo.createRun.mock.calls[0][2] as {
      winner: string;
      left: { score: number };
      right: { score: number };
    };
    expect(['left', 'right', 'tie']).toContain(out.winner);
    expect(out.left.score).toBeGreaterThanOrEqual(0);
    expect(out.right.score).toBeGreaterThanOrEqual(0);
  });

  it('status returns validated shape', async () => {
    const service = new TitanScoreService();
    const s = await service.status();
    expect(s.modes).toEqual(['snapshot', 'trend', 'compare']);
    expect(s.scoreRange).toEqual({ min: 0, max: 100 });
  });
});
