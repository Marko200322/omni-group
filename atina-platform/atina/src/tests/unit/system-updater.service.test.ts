import { SystemUpdaterService } from '../../modules/system-updater/service/system-updater.service';
import { NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var systemUpdaterRepo: {
  queue: jest.Mock;
  list: jest.Mock;
  finish: jest.Mock;
};

jest.mock('../../modules/system-updater/repository/system-updater.repository', () => {
  systemUpdaterRepo = {
    queue: jest.fn(),
    list: jest.fn(),
    finish: jest.fn(),
  };
  return {
    SystemUpdaterRepository: jest.fn().mockImplementation(() => systemUpdaterRepo),
  };
});

describe('SystemUpdaterService', () => {
  let service: SystemUpdaterService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SystemUpdaterService();
  });

  it('queue returns the first inserted row', async () => {
    const row = { id: 'job-1', status: 'queued' };
    systemUpdaterRepo.queue.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    await expect(service.queue('user-1', '2.0.0', 'rollout')).resolves.toBe(row);
    expect(systemUpdaterRepo.queue).toHaveBeenCalledWith('user-1', '2.0.0', 'rollout');
  });

  it('list returns all rows from the repository', async () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    systemUpdaterRepo.list.mockResolvedValueOnce({ rows, rowCount: 2 });

    await expect(service.list()).resolves.toEqual(rows);
  });

  it('finish throws NotFoundError when no row is updated', async () => {
    systemUpdaterRepo.finish.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(service.finish('missing', 'done', { ok: true })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('finish returns the updated row', async () => {
    const row = { id: 'job-1', status: 'done' };
    systemUpdaterRepo.finish.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    await expect(service.finish('job-1', 'done', { log: 'ok' })).resolves.toBe(row);
    expect(systemUpdaterRepo.finish).toHaveBeenCalledWith('job-1', 'done', { log: 'ok' });
  });
});
