import { TitanixService } from '../../../../modules/titanix/service/titanix.service';
import * as queue from '../../../../queue/queue';

// eslint-disable-next-line no-var
var titanixRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  insertTask: jest.Mock;
  insertRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/titanix/repository/titanix.repository', () => {
  titanixRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn(),
    getOwned: jest.fn(),
    insertTask: jest.fn(),
    insertRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    TitanixRepository: jest.fn().mockImplementation(() => titanixRepo),
  };
});

jest.mock('../../../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
}));

const mockAddJob = queue.addJob as jest.MockedFunction<typeof queue.addJob>;

describe('TitanixService extra branches', () => {
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

  it('run uses generic failure message when thrown value is not an Error', async () => {
    titanixRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    mockAddJob.mockRejectedValueOnce('circuit open');

    await expect(service.run('s1', 'u1', { pipeline: 'ops', jobs: 1 })).rejects.toBe('circuit open');
    expect(titanixRepo.insertRun).toHaveBeenCalledWith(
      's1',
      'titanix_ops',
      expect.objectContaining({
        failed_reason: 'Unknown titanix queue error',
      }),
      'failed'
    );
  });

  it('run floors fractional jobs count', async () => {
    titanixRepo.getOwned.mockResolvedValueOnce({ rows: [{ id: 's1' }], rowCount: 1 });
    await service.run('s1', 'u1', { pipeline: 'ops', jobs: 2.9 });
    expect(titanixRepo.insertTask).toHaveBeenCalledTimes(2);
    expect(mockAddJob).toHaveBeenCalledTimes(2);
  });
});
