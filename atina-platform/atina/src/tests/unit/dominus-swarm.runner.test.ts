import * as db from '../../database/connection';
import { runDominusSwarmBatch } from '../../modules/dominus-swarm/dominus-swarm.runner';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('dominus-swarm.runner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('returns planned status with scaling evaluation', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ node_name: 'n1', zone: 'eu', capacity_score: 50 }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ avg_util: '40', node_count: '1' }], rowCount: 1 } as never);

    const result = await runDominusSwarmBatch({ profileCount: 1000, zone: 'eu' });

    expect(result.status).toBe('planned');
    expect(result.profileCount).toBe(1000);
    expect((result.scaling as { action: string }).action).toBeDefined();
  });
});
