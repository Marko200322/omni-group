import * as db from '../../database/connection';
import { executeTaskByType } from '../../modules/tasks/execute-task-by-type';

jest.mock('../../database/connection');
jest.mock('../../modules/phase-launch/middleware/phase-activation.middleware', () => ({
  getCurrentPhase: jest.fn().mockResolvedValue('v2'),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const { getCurrentPhase } = jest.requireMock(
  '../../modules/phase-launch/middleware/phase-activation.middleware'
) as { getCurrentPhase: jest.Mock };

describe('executeTaskByType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentPhase.mockResolvedValue('v2');
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

  it('crm_pipeline acknowledges bootstrap stage tasks', async () => {
    const result = (await executeTaskByType('crm_pipeline', {
      stage: 'prospect',
      verticalSlug: 'marketing',
      automated: true,
    })) as { executed: boolean; stage: string; verticalSlug: string };

    expect(result.executed).toBe(true);
    expect(result.stage).toBe('prospect');
    expect(result.verticalSlug).toBe('marketing');
  });

  it('unknown type returns generic executed payload', async () => {
    const result = (await executeTaskByType('custom_unknown', {})) as { executed: boolean; type: string };
    expect(result.executed).toBe(true);
    expect(result.type).toBe('custom_unknown');
  });
});
