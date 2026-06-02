import { CraftorService } from '../../modules/craftor/service/craftor.service';

// eslint-disable-next-line no-var
var craftorRepo: {
  getOwned: jest.Mock;
  insertRun: jest.Mock;
  updateAfterRun: jest.Mock;
  auditRunCompleted: jest.Mock;
};

const mockAi = {
  isConfigured: jest.fn().mockReturnValue(true),
  fetchRecommendations: jest.fn().mockResolvedValue({ recommendations: ['Line A', 'Line B'] }),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => mockAi,
  getScraperClient: () => ({ isConfigured: () => false, scrape: jest.fn() }),
  getStorageClient: () => ({ isConfigured: () => false, uploadArtifact: jest.fn() }),
}));

jest.mock('../../modules/craftor/repository/craftor.repository', () => {
  craftorRepo = {
    getOwned: jest.fn().mockResolvedValue({
      rows: [
        {
          id: 'cid',
          metrics: {
            leads_collected: 12,
            proposals_sent: 4,
            jobs_scored: 6,
            niche: 'developer',
            platforms: ['upwork'],
          },
        },
      ],
    }),
    insertRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
    auditRunCompleted: jest.fn().mockResolvedValue(undefined),
  };
  return {
    CraftorRepository: jest.fn().mockImplementation(() => craftorRepo),
  };
});

describe('CraftorService AI proposal/humanization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAi.isConfigured.mockReturnValue(true);
    mockAi.fetchRecommendations.mockResolvedValue({ recommendations: ['Line A', 'Line B'] });
    craftorRepo.getOwned.mockResolvedValue({
      rows: [
        {
          id: 'cid',
          metrics: {
            leads_collected: 12,
            proposals_sent: 4,
            jobs_scored: 6,
            niche: 'developer',
            platforms: ['upwork'],
          },
        },
      ],
    });
    craftorRepo.insertRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
  });

  it('attaches ai_proposal_lines on proposal mode', async () => {
    const service = new CraftorService();
    await service.run('cid', 'u1', { mode: 'proposal', input: { brief: 'SaaS' } });
    const output = craftorRepo.insertRun.mock.calls.at(-1)![3] as {
      result: { ai_proposal_lines: string[] | null; humanization_note: string | null };
    };
    expect(output.result.ai_proposal_lines).toEqual(['Line A', 'Line B']);
    expect(output.result.humanization_note).toBeNull();
  });

  it('sets conversion_probability on job-scoring mode', async () => {
    const service = new CraftorService();
    await service.run('cid', 'u1', { mode: 'job-scoring', input: {} });
    const output = craftorRepo.insertRun.mock.calls.at(-1)![3] as {
      result: { conversion_probability?: number; job_score?: number };
    };
    expect(output.result.conversion_probability).toBe(0.82);
    expect(output.result.job_score).toBe(0.82);
  });

  it('sets humanization_note on humanization mode', async () => {
    const service = new CraftorService();
    await service.run('cid', 'u1', { mode: 'humanization', input: {} });
    const output = craftorRepo.insertRun.mock.calls.at(-1)![3] as {
      result: { humanization_note: string | null };
    };
    expect(output.result.humanization_note).toContain('humanization');
  });
});
