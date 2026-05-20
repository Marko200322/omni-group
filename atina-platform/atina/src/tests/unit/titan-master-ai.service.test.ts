import { TitanMasterService } from '../../modules/titan-master/service/titan-master.service';

// eslint-disable-next-line no-var
var titanMasterRepo: {
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

const mockAi = {
  isConfigured: jest.fn().mockReturnValue(true),
  fetchRecommendations: jest.fn().mockResolvedValue({
    recommendations: ['Focus Titanis', 'Enable outreach'],
  }),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => mockAi,
}));

jest.mock('../../modules/titan-master/repository/titan-master.repository', () => {
  titanMasterRepo = {
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 's1' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    TitanMasterRepository: jest.fn().mockImplementation(() => titanMasterRepo),
  };
});

describe('TitanMasterService AI enrichment', () => {
  it('merges AI recommendations into run output', async () => {
    const service = new TitanMasterService();
    await service.run('s1', 'u1', { mode: 'optimize', input: { k: 1 } });
    const output = titanMasterRepo.createRun.mock.calls[0][3] as {
      recommendation: string;
      projected_gain: number;
      audit: { ai_enriched: boolean };
    };
    expect(output.recommendation).toContain('Focus Titanis');
    expect(output.projected_gain).toBeGreaterThan(150);
    expect(output.audit.ai_enriched).toBe(true);
  });
});
