import { NotFoundError } from '../../utils/errors';
import { RunSistemNaplateDto } from '../../modules/sistem-naplate/dto/sistem-naplate.dto';
import { SistemNaplateService } from '../../modules/sistem-naplate/service/sistem-naplate.service';

// eslint-disable-next-line no-var
var sistemNaplateRepoMocks: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/sistem-naplate/repository/sistem-naplate.repository', () => {
  sistemNaplateRepoMocks = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'owned' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    SistemNaplateRepository: jest.fn().mockImplementation(() => sistemNaplateRepoMocks),
  };
});

describe('SistemNaplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sistemNaplateRepoMocks.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    sistemNaplateRepoMocks.create.mockResolvedValue({ rows: [{ id: 'new' }] });
    sistemNaplateRepoMocks.getOwned.mockResolvedValue({ rows: [{ id: 'owned' }] });
    sistemNaplateRepoMocks.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    sistemNaplateRepoMocks.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('list returns rows from repository', async () => {
    const svc = new SistemNaplateService();
    const rows = await svc.list('u1');
    expect(rows).toEqual([{ id: 'w1' }]);
    expect(sistemNaplateRepoMocks.listByUser).toHaveBeenCalledWith('u1');
  });

  it('create returns first row', async () => {
    const svc = new SistemNaplateService();
    const row = await svc.create('u1', {
      name: 'Test',
      budgetAllocated: 0,
      billingCadence: 'weekly',
    });
    expect(row).toEqual({ id: 'new' });
    expect(sistemNaplateRepoMocks.create).toHaveBeenCalledWith('u1', 'Test', 0, 'weekly');
  });

  it('create throws when insert returns no row', async () => {
    sistemNaplateRepoMocks.create.mockResolvedValueOnce({ rows: [] });
    const svc = new SistemNaplateService();
    await expect(
      svc.create('u1', { name: 'Test', budgetAllocated: 0, billingCadence: 'daily' })
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'SISTEM_NAPLATE_CREATE_FAILED',
    });
  });

  it('run throws NotFoundError when workspace missing', async () => {
    sistemNaplateRepoMocks.getOwned.mockResolvedValueOnce({ rows: [] });
    const svc = new SistemNaplateService();
    await expect(
      svc.run('missing', 'u1', { mode: 'reconcile', batchSize: 10 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('run maps workflow mode billing-cycle to reconcile (N3-E2)', async () => {
    const svc = new SistemNaplateService();
    const dto = RunSistemNaplateDto.parse({ mode: 'billing-cycle', batchSize: 20 });
    await svc.run('owned', 'u1', dto);
    expect(sistemNaplateRepoMocks.createRun).toHaveBeenCalledWith('owned', 'sistem_naplate_reconcile', {
      mode: 'reconcile',
      batch_size: 20,
      records_processed: 20,
      estimated_revenue: 60,
    });
  });

  it('run maps workflow mode settlement-cycle to settlement (alias)', async () => {
    const svc = new SistemNaplateService();
    const dto = RunSistemNaplateDto.parse({ mode: 'settlement-cycle', batchSize: 8 });
    await svc.run('owned', 'u1', dto);
    const processed = Math.ceil(8 * 0.75);
    expect(sistemNaplateRepoMocks.createRun).toHaveBeenCalledWith('owned', 'sistem_naplate_settlement', {
      mode: 'settlement',
      batch_size: 8,
      records_processed: processed,
      estimated_revenue: processed * 9,
    });
    expect(sistemNaplateRepoMocks.updateAfterRun).toHaveBeenCalledWith('owned', 'settlement', 8, processed, processed * 9);
  });

  it('run reconcile branch uses batchSize as processed and revenue * 3', async () => {
    const svc = new SistemNaplateService();
    await svc.run('owned', 'u1', { mode: 'reconcile', batchSize: 20 });
    expect(sistemNaplateRepoMocks.createRun).toHaveBeenCalledWith('owned', 'sistem_naplate_reconcile', {
      mode: 'reconcile',
      batch_size: 20,
      records_processed: 20,
      estimated_revenue: 60,
    });
    expect(sistemNaplateRepoMocks.updateAfterRun).toHaveBeenCalledWith('owned', 'reconcile', 20, 20, 60);
  });

  it('run invoice branch scales processed and revenue * 5', async () => {
    const svc = new SistemNaplateService();
    await svc.run('owned', 'u1', { mode: 'invoice', batchSize: 10 });
    const processed = Math.ceil(10 * 0.9);
    expect(sistemNaplateRepoMocks.createRun).toHaveBeenCalledWith('owned', 'sistem_naplate_invoice', {
      mode: 'invoice',
      batch_size: 10,
      records_processed: processed,
      estimated_revenue: processed * 5,
    });
  });

  it('run settlement branch scales processed and revenue * 9', async () => {
    const svc = new SistemNaplateService();
    await svc.run('owned', 'u1', { mode: 'settlement', batchSize: 8 });
    const processed = Math.ceil(8 * 0.75);
    expect(sistemNaplateRepoMocks.createRun).toHaveBeenCalledWith('owned', 'sistem_naplate_settlement', {
      mode: 'settlement',
      batch_size: 8,
      records_processed: processed,
      estimated_revenue: processed * 9,
    });
  });

  it('run throws when createRun returns no row', async () => {
    sistemNaplateRepoMocks.createRun.mockResolvedValueOnce({ rows: [] });
    const svc = new SistemNaplateService();
    await expect(
      svc.run('owned', 'u1', { mode: 'reconcile', batchSize: 5 })
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'SISTEM_NAPLATE_RUN_PERSIST_FAILED',
    });
    expect(sistemNaplateRepoMocks.updateAfterRun).not.toHaveBeenCalled();
  });
});
