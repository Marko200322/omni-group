import { LeadScoringService } from '../../modules/lead-scoring/service/lead-scoring.service';

// eslint-disable-next-line no-var
var leadScoringRepo: {
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

const mockAi = {
  isConfigured: jest.fn().mockReturnValue(true),
  fetchRecommendations: jest.fn().mockResolvedValue({ recommendations: ['hot', 'warm', 'nurture'] }),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => mockAi,
}));

jest.mock('../../modules/lead-scoring/repository/lead-scoring.repository', () => {
  leadScoringRepo = {
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    LeadScoringRepository: jest.fn().mockImplementation(() => leadScoringRepo),
  };
});

describe('LeadScoringService AI rank', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    leadScoringRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }] });
    leadScoringRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
  });

  it.each([
    [{ mode: 'refresh' as const, intensity: 0 }, 'D'],
    [{ mode: 'score' as const, intensity: 50 }, 'B'],
    [{ mode: 'rank' as const, intensity: 90 }, 'A'],
  ] as const)('assigns band %s without AI', async (runDto, band) => {
    mockAi.isConfigured.mockReturnValue(false);
    const service = new LeadScoringService();
    await service.run('sid', 'u1', runDto);
    const payload = leadScoringRepo.createRun.mock.calls.at(-1)![2] as { band: string };
    expect(payload.band).toBe(band);
  });

  it('boosts score and stores ai_recommendations on rank mode', async () => {
    mockAi.isConfigured.mockReturnValue(true);
    mockAi.fetchRecommendations.mockResolvedValue({ recommendations: ['hot', 'warm', 'nurture'] });
    const service = new LeadScoringService();
    await service.run('sid', 'u1', { mode: 'rank', intensity: 40 });
    const payload = leadScoringRepo.createRun.mock.calls[0][2] as {
      score: number;
      band: string;
      ai_recommendations: string[] | null;
    };
    expect(payload.ai_recommendations).toEqual(['hot', 'warm', 'nurture']);
    expect(payload.score).toBeGreaterThan(60);
    expect(['A', 'B']).toContain(payload.band);
  });
});
