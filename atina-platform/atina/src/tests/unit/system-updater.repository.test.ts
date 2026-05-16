import { SystemUpdaterRepository } from '../../modules/system-updater/repository/system-updater.repository';
import * as db from '../../database/connection';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('SystemUpdaterRepository', () => {
  let repo: SystemUpdaterRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    repo = new SystemUpdaterRepository();
  });

  it('queue inserts requested_by, target_version, and notes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'j1' }], rowCount: 1 } as never);
    await repo.queue('user-1', '2.1.0', 'rollout window');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO updater_jobs'),
      ['user-1', '2.1.0', 'rollout window']
    );
  });

  it('queue passes null notes when empty string', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'j2' }], rowCount: 1 } as never);
    await repo.queue('user-2', '2.2.0', '');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO updater_jobs'), [
      'user-2',
      '2.2.0',
      null,
    ]);
  });

  it('list runs joined select ordered by created_at', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a' }], rowCount: 1 } as never);
    const result = await repo.list();
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/FROM updater_jobs uj/);
    expect(sql).toMatch(/ORDER BY uj\.created_at DESC/);
    expect(result.rows).toEqual([{ id: 'a' }]);
  });

  it('finish updates status and result_json', async () => {
    const resultPayload = { steps: 2, ok: true };
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'job-x', status: 'completed' }], rowCount: 1 } as never);
    await repo.finish('job-x', 'completed', resultPayload);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE updater_jobs'),
      ['job-x', 'completed', JSON.stringify(resultPayload)]
    );
  });
});
