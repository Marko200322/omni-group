import { TitanixService } from '../../modules/titanix/service/titanix.service';
import { NotFoundError } from '../../utils/errors';
import * as queue from '../../queue/queue';

// eslint-disable-next-line no-var
var titanixRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  insertTask: jest.Mock;
  insertRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/titanix/repository/titanix.repository', () => {
  titanixRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'l1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'created' }] }),
    getOwned: jest.fn(),
    insertTask: jest.fn(),
    insertRun: jest.fn().mockResolvedValue({ rows: [{ id: 'runRow' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    TitanixRepository: jest.fn().mockImplementation(() => titanixRepo),
  };
});

jest.mock('../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
}));

const mockAddJob = queue.addJob as jest.MockedFunction<typeof queue.addJob>;

describe('TitanixService', () => {
  let service: TitanixService;
  let taskSeq: number;

  beforeEach(() => {
    jest.clearAllMocks();
    taskSeq = 0;
    titanixRepo.insertTask.mockImplementation(() => {
      taskSeq += 1;
      return Promise.resolve({ rows: [{ id: `t${taskSeq}` }], rowCount: 1 });
    });
    service = new TitanixService();
  });

  it('list returns rows', async () => {
    const rows = await service.list('u1');
    expect(rows).toEqual([{ id: 'l1' }]);
    expect(titanixRepo.listByUser).toHaveBeenCalledWith('u1');
  });

  it('create forwards dto fields', async () => {
    const row = await service.create('u1', {
      name: 'Wrk',
      budgetAllocated: 100,
      executionProfile: 'aggressive',
    });
    expect(row.id).toBe('created');
    expect(titanixRepo.create).toHaveBeenCalledWith('u1', 'Wrk', 100, 'aggressive');
  });

  it('run throws when workspace not found', async () => {
    titanixRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(service.run('x', 'u1', { pipeline: 'ops', jobs: 1 })).rejects.toThrow(NotFoundError);
  });

  it.each([
    ['campaign', 2, 56],
    ['content', 2, 34],
    ['ops', 2, 24],
  ] as const)('run pipeline %s revenue', async (pipeline, jobs, revenue) => {
    titanixRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    const row = await service.run('s1', 'u1', { pipeline, jobs });
    expect(row.id).toBe('runRow');
    expect(titanixRepo.insertTask).toHaveBeenCalledTimes(jobs);
    expect(mockAddJob).toHaveBeenCalledTimes(jobs);
    expect(titanixRepo.insertRun).toHaveBeenCalledWith(
      's1',
      `titanix_${pipeline}`,
      expect.objectContaining({
        jobs_queued: jobs,
        projected_revenue: revenue,
      })
    );
    expect(titanixRepo.updateAfterRun).toHaveBeenCalledWith('s1', revenue, jobs, pipeline);
  });

  it('run throws when task insert misses id', async () => {
    titanixRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    titanixRepo.insertTask.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });

    await expect(service.run('s1', 'u1', { pipeline: 'ops', jobs: 1 })).rejects.toMatchObject({
      code: 'TITANIX_TASK_CREATE_FAILED',
    });
    expect(titanixRepo.insertRun).toHaveBeenCalledWith(
      's1',
      'titanix_ops',
      expect.objectContaining({
        state: { previous: 'queuing', current: 'failed' },
      }),
      'failed'
    );
    expect(titanixRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it('run records failed state when queue addJob fails', async () => {
    titanixRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    mockAddJob.mockRejectedValueOnce(new Error('queue down'));

    await expect(service.run('s1', 'u1', { pipeline: 'campaign', jobs: 2 })).rejects.toThrow('queue down');
    expect(titanixRepo.insertRun).toHaveBeenCalledWith(
      's1',
      'titanix_campaign',
      expect.objectContaining({
        jobs_requested: 2,
        jobs_queued: 1,
        failed_reason: 'queue down',
      }),
      'failed'
    );
    expect(titanixRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it('run throws when success-path insertRun returns no row', async () => {
    titanixRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    titanixRepo.insertRun.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(service.run('s1', 'u1', { pipeline: 'ops', jobs: 1 })).rejects.toMatchObject({
      code: 'TITANIX_RUN_PERSIST_FAILED',
      message: 'Failed to persist titanix run',
    });
    expect(titanixRepo.updateAfterRun).not.toHaveBeenCalled();
  });
});
