import * as db from '../../database/connection';
import { runDominusSwarmBatch } from '../../modules/dominus-swarm/dominus-swarm.runner';

jest.mock('../../database/connection');
jest.mock('../../modules/phase-launch/middleware/phase-activation.middleware', () => ({
  getCurrentPhase: jest.fn().mockResolvedValue('v2'),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const { getCurrentPhase } = jest.requireMock(
  '../../modules/phase-launch/middleware/phase-activation.middleware'
) as { getCurrentPhase: jest.Mock };

describe('dominus-swarm.runner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentPhase.mockResolvedValue('v2');
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

  it('uses default profile count and zone when omitted', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ node_name: 'n1', zone: 'default', capacity_score: 50 }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ avg_util: '40', node_count: '1' }], rowCount: 1 } as never);

    const result = await runDominusSwarmBatch({});

    expect(result.profileCount).toBe(100);
    expect(result.status).toBe('planned');
  });

  it('at v6 allows up to 125k profiles in edge mode', async () => {
    getCurrentPhase.mockResolvedValue('v6');
    let nodeIdx = 0;
    mockQuery.mockImplementation(async (sql: string) => {
      if (/INSERT INTO system_nodes/i.test(sql)) {
        nodeIdx += 1;
        return {
          rows: [{ node_name: `n${nodeIdx}`, zone: 'eu', capacity_score: 50 }],
          rowCount: 1,
        } as never;
      }
      if (/avg_util/i.test(sql)) {
        return { rows: [{ avg_util: '40', node_count: '1' }], rowCount: 1 } as never;
      }
      return { rows: [], rowCount: 0 } as never;
    });

    const result = await runDominusSwarmBatch({ profileCount: 200_000, zone: 'eu' });

    expect(result.edgeMode).toBe(true);
    expect(result.profileCount).toBe(125_000);
    expect(result.status).toBe('edge_planned');
  });
});
