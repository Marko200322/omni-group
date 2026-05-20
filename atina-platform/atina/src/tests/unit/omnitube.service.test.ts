import { OmniTubeService } from '../../modules/omnitube/service/omnitube.service';
import { NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var omnitubeRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
}));

jest.mock('../../modules/tasks/task-executors', () => ({
  executeOmnitubePipeline: jest.fn().mockResolvedValue({ source: 'test', mode: 'optimize' }),
}));

jest.mock('../../modules/omnitube/repository/omnitube.repository', () => {
  omnitubeRepo = {
    listByUser: jest.fn(),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn(),
    updateAfterRun: jest.fn(),
  };
  return {
    OmniTubeRepository: jest.fn().mockImplementation(() => omnitubeRepo),
  };
});

describe('OmniTubeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    omnitubeRepo.listByUser.mockResolvedValue({ rows: [{ id: 'a' }] });
    omnitubeRepo.create.mockResolvedValue({ rows: [{ id: 'new-row' }] });
    omnitubeRepo.getOwned.mockResolvedValue({ rows: [{ id: 'tube-1' }] });
    omnitubeRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    omnitubeRepo.updateAfterRun.mockResolvedValue({ rowCount: 1 });
  });

  it('list delegates to repository', async () => {
    const service = new OmniTubeService();
    const rows = await service.list('user-9');
    expect(rows).toEqual([{ id: 'a' }]);
    expect(omnitubeRepo.listByUser).toHaveBeenCalledWith('user-9');
  });

  it('create delegates to repository with config fields', async () => {
    const service = new OmniTubeService();
    const row = await service.create('user-9', {
      name: 'My Channel',
      platform: 'tiktok',
      budgetAllocated: 5000,
    });
    expect(row).toEqual({ id: 'new-row' });
    expect(omnitubeRepo.create).toHaveBeenCalledWith('user-9', 'My Channel', 5000, 'tiktok');
  });

  it('produces normalized run payload contract', async () => {
    const service = new OmniTubeService();
    await service.run('tube-1', 'u1', { mode: 'optimize' });

    const payload = omnitubeRepo.createRun.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.module).toBe('omnitube');
    expect(payload.mode).toBe('optimize');
    expect(payload.estimated_revenue).toBe(120);
    expect(payload.run_score).toBe(91);
    expect(payload.units_produced).toBe(5100);
    expect(payload.details).toMatchObject({ views_generated: 5100 });
    expect(omnitubeRepo.updateAfterRun).toHaveBeenCalledWith('tube-1', 120, 'optimize', 5100, 91);
  });

  it('throws NotFoundError when system does not exist for user', async () => {
    const service = new OmniTubeService();
    omnitubeRepo.getOwned.mockResolvedValue({ rows: [] });

    await expect(service.run('tube-1', 'u1', { mode: 'publish' })).rejects.toBeInstanceOf(NotFoundError);
    expect(omnitubeRepo.createRun).not.toHaveBeenCalled();
    expect(omnitubeRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it.each([
    ['idea', 30, 700, 68],
    ['production', 30, 700, 68],
    ['publish', 90, 3200, 84],
  ] as const)('run mode %s maps revenue, units, and score', async (mode, revenue, units, score) => {
    const service = new OmniTubeService();
    await service.run('tube-1', 'u1', { mode });

    const payload = omnitubeRepo.createRun.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.mode).toBe(mode);
    expect(payload.estimated_revenue).toBe(revenue);
    expect(payload.units_produced).toBe(units);
    expect(payload.run_score).toBe(score);
    expect(omnitubeRepo.updateAfterRun).toHaveBeenCalledWith('tube-1', revenue, mode, units, score);
  });
});
