import * as db from '../../database/connection';
import { RecommendationService } from '../../modules/recommendation/service/recommendation.service';

jest.mock('../../database/connection');

const mockAi = {
  isConfigured: jest.fn().mockReturnValue(false),
  fetchRecommendations: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => mockAi,
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('RecommendationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAi.isConfigured.mockReturnValue(false);
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('subscriptions')) return { rows: [{ count: '0' }], rowCount: 1 } as never;
      if (sql.includes('tasks')) return { rows: [{ count: '2' }], rowCount: 1 } as never;
      return { rows: [{ count: '0' }], rowCount: 1 } as never;
    });
  });

  it('returns baseline recommendations without AI', async () => {
    const service = new RecommendationService();
    const out = await service.getNextActions('u1');
    expect(out.recommendations.some((r) => r.includes('subscription'))).toBe(true);
    expect(mockAi.fetchRecommendations).not.toHaveBeenCalled();
  });

  it('merges AI recommendations when configured', async () => {
    mockAi.isConfigured.mockReturnValue(true);
    mockAi.fetchRecommendations.mockResolvedValue({ recommendations: ['Ship OmniTube weekly'] });
    const service = new RecommendationService();
    const out = await service.getNextActions('u1');
    expect(out.recommendations).toContain('Ship OmniTube weekly');
  });
});
