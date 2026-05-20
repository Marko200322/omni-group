import { OmniTubeService } from '../../modules/omnitube/service/omnitube.service';

// eslint-disable-next-line no-var
var omnitubeRepo: {
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'job' }),
}));

jest.mock('../../modules/tasks/task-executors', () => ({
  executeOmnitubePipeline: jest.fn().mockResolvedValue({ source: 'atina_node' }),
}));

const mockAi = {
  isConfigured: jest.fn().mockReturnValue(true),
  fetchRecommendations: jest.fn().mockResolvedValue({ recommendations: ['Intro', 'CTA'] }),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => mockAi,
}));

jest.mock('../../modules/omnitube/repository/omnitube.repository', () => {
  omnitubeRepo = {
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'ch1', name: 'Channel' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    OmniTubeRepository: jest.fn().mockImplementation(() => omnitubeRepo),
  };
});

describe('OmniTubeService AI script', () => {
  it('stores script_from_ai on production mode', async () => {
    const service = new OmniTubeService();
    await service.run('ch1', 'u1', { mode: 'production' });
    const output = omnitubeRepo.createRun.mock.calls[0][2] as {
      details: { script_from_ai: string[] | null };
    };
    expect(output.details.script_from_ai).toEqual(['Intro', 'CTA']);
  });
});
