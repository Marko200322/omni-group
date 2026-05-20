import { OmniGameService } from '../../modules/omnigame/service/omnigame.service';
import { NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var omnigameRepo: {
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
  executeOmnigameValidate: jest.fn().mockResolvedValue({
    validation_score: 84,
    steam_trends_scraped: false,
    build_ready: false,
  }),
}));

jest.mock('../../modules/omnigame/repository/omnigame.repository', () => {
  omnigameRepo = {
    listByUser: jest.fn(),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn(),
    updateAfterRun: jest.fn(),
  };
  return {
    OmniGameRepository: jest.fn().mockImplementation(() => omnigameRepo),
  };
});

describe('OmniGameService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    omnigameRepo.listByUser.mockResolvedValue({ rows: [{ id: 'g' }] });
    omnigameRepo.create.mockResolvedValue({ rows: [{ id: 'created' }] });
    omnigameRepo.getOwned.mockResolvedValue({ rows: [{ id: 'game-1' }] });
    omnigameRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    omnigameRepo.updateAfterRun.mockResolvedValue({ rowCount: 1 });
  });

  it('list delegates to repository', async () => {
    const service = new OmniGameService();
    const rows = await service.list('u99');
    expect(rows).toEqual([{ id: 'g' }]);
    expect(omnigameRepo.listByUser).toHaveBeenCalledWith('u99');
  });

  it('create delegates to repository', async () => {
    const service = new OmniGameService();
    const row = await service.create('u99', {
      name: 'RPG',
      genre: 'rpg',
      budgetAllocated: 100,
    });
    expect(row).toEqual({ id: 'created' });
    expect(omnigameRepo.create).toHaveBeenCalledWith('u99', 'RPG', 100, 'rpg');
  });

  it('produces normalized run payload contract', async () => {
    const service = new OmniGameService();
    await service.run('game-1', 'u1', { mode: 'validate' });

    const payload = omnigameRepo.createRun.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.module).toBe('omnigame');
    expect(payload.mode).toBe('validate');
    expect(payload.estimated_revenue).toBe(110);
    expect(payload.run_score).toBe(84);
    expect(payload.units_produced).toBe(1);
    expect(payload.details).toMatchObject({ validation_score: 84 });
    expect(omnigameRepo.updateAfterRun).toHaveBeenCalledWith('game-1', 110, 'validate', 1, 84);
  });

  it('throws NotFoundError when system does not exist for user', async () => {
    const service = new OmniGameService();
    omnigameRepo.getOwned.mockResolvedValue({ rows: [] });

    await expect(service.run('game-1', 'u1', { mode: 'prototype' })).rejects.toBeInstanceOf(NotFoundError);
    expect(omnigameRepo.createRun).not.toHaveBeenCalled();
    expect(omnigameRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it('publish mode uses higher revenue and unit count', async () => {
    const service = new OmniGameService();
    await service.run('game-1', 'u1', { mode: 'publish' });

    const payload = omnigameRepo.createRun.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.estimated_revenue).toBe(480);
    expect(payload.units_produced).toBe(9);
    expect(omnigameRepo.updateAfterRun).toHaveBeenCalledWith('game-1', 480, 'publish', 9, 55);
  });

  it.each([
    ['trend-scan', 70, 1, 55],
    ['prototype', 70, 3, 62],
  ] as const)('run mode %s maps revenue, units, and score', async (mode, revenue, units, score) => {
    const service = new OmniGameService();
    await service.run('game-1', 'u1', { mode });

    const payload = omnigameRepo.createRun.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.mode).toBe(mode);
    expect(payload.estimated_revenue).toBe(revenue);
    expect(payload.units_produced).toBe(units);
    expect(payload.run_score).toBe(score);
    expect(omnigameRepo.updateAfterRun).toHaveBeenCalledWith('game-1', revenue, mode, units, score);
  });
});
