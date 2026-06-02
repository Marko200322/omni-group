import * as db from '../../database/connection';
import { executeTaskByType } from '../../modules/tasks/execute-task-by-type';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('executeTaskByType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('dominus_swarm_batch delegates to swarm runner', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ node_name: 'n1', zone: 'eu', capacity_score: 50 }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ avg_util: '40', node_count: '1' }], rowCount: 1 } as never);

    const result = (await executeTaskByType('dominus_swarm_batch', {
      profileCount: 500,
      zone: 'eu',
    })) as { status: string; profileCount: number };

    expect(result.status).toBe('planned');
    expect(result.profileCount).toBe(500);
  });

  it('unknown type returns generic executed payload', async () => {
    const result = (await executeTaskByType('custom_unknown', {})) as { executed: boolean; type: string };
    expect(result.executed).toBe(true);
    expect(result.type).toBe('custom_unknown');
  });
});
