import { TitanisService } from '../../modules/titanis/service/titanis.service';
import { NotFoundError } from '../../utils/errors';

jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false, fetchRecommendations: jest.fn() }),
  getCommsClient: () => ({ isConfigured: () => false, request: jest.fn() }),
}));

// eslint-disable-next-line no-var
var titanisRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
  auditWorkspaceCreated: jest.Mock;
  auditRunCompleted: jest.Mock;
};

jest.mock('../../modules/titanis/repository/titanis.repository', () => {
  titanisRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'l1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'created' }] }),
    getOwned: jest.fn(),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'runRow' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    auditWorkspaceCreated: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    auditRunCompleted: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
  return {
    TitanisRepository: jest.fn().mockImplementation(() => titanisRepo),
  };
});

describe('TitanisService', () => {
  let service: TitanisService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TitanisService();
  });

  it('list returns rows', async () => {
    const rows = await service.list('u1');
    expect(rows).toEqual([{ id: 'l1' }]);
    expect(titanisRepo.listByUser).toHaveBeenCalledWith('u1');
  });

  it('create forwards dto fields and writes audit', async () => {
    const row = await service.create('u1', {
      name: 'N',
      outreachChannel: 'email',
      budgetAllocated: 100,
    });
    expect(row.id).toBe('created');
    expect(titanisRepo.create).toHaveBeenCalledWith('u1', 'N', 100, 'email');
    expect(titanisRepo.auditWorkspaceCreated).toHaveBeenCalledWith('u1', 'created', { name: 'N' });
  });

  it('run throws when workspace not found', async () => {
    titanisRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(
      service.run('missing', 'u1', { mode: 'lead-hunt', targetCount: 10 })
    ).rejects.toThrow(NotFoundError);
  });

  it('run lead-hunt uses full targetCount and mixed channel default', async () => {
    titanisRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 's1', config: null }],
      rowCount: 1,
    });

    const row = await service.run('s1', 'u1', { mode: 'lead-hunt', targetCount: 40 });

    expect(row.id).toBe('runRow');
    expect(titanisRepo.createRun).toHaveBeenCalledWith(
      's1',
      'titanis_lead-hunt',
      expect.objectContaining({
        mode: 'lead-hunt',
        target_count: 40,
        leads_generated: 40,
        channel: 'mixed',
        state: { previous: 'ready', current: 'completed' },
      })
    );
    expect(titanisRepo.auditRunCompleted).toHaveBeenCalledWith('u1', 'runRow', {
      mode: 'lead-hunt',
      systemId: 's1',
    });
  });

  it('run follow-up scales targets and close mode revenue', async () => {
    titanisRepo.getOwned.mockResolvedValue({
      rows: [{ id: 's2', config: { outreach_channel: 'dm' } }],
      rowCount: 1,
    });

    await service.run('s2', 'u1', { mode: 'follow-up', targetCount: 20 });
    expect(titanisRepo.createRun.mock.calls[0][2].leads_generated).toBe(10);

    jest.clearAllMocks();
    titanisRepo.getOwned.mockResolvedValue({
      rows: [{ id: 's2', config: {} }],
      rowCount: 1,
    });
    titanisRepo.createRun.mockResolvedValue({ rows: [{ id: 'r2' }], rowCount: 1 });

    await service.run('s2', 'u1', { mode: 'close', targetCount: 100 });
    const payload = titanisRepo.createRun.mock.calls[0][2];
    expect(payload.leads_generated).toBe(50);
    expect(payload.conversions).toBe(9);
    expect(payload.estimated_revenue).toBe(1080);
    expect(payload.channel).toBe('mixed');
  });

  it('run throws when run row cannot be persisted', async () => {
    titanisRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 's1', config: { outreach_channel: 'email' } }],
      rowCount: 1,
    });
    titanisRepo.createRun.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(
      service.run('s1', 'u1', { mode: 'lead-hunt', targetCount: 10 })
    ).rejects.toMatchObject({ code: 'TITANIS_RUN_PERSIST_FAILED' });
    expect(titanisRepo.auditRunCompleted).not.toHaveBeenCalled();
  });

  it('run uses default channel when config.outreach_channel is not a string', async () => {
    titanisRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 's1', config: { outreach_channel: 99 } }],
      rowCount: 1,
    });
    await service.run('s1', 'u1', { mode: 'lead-hunt', targetCount: 5 });
    expect(titanisRepo.createRun.mock.calls[0][2].channel).toBe('mixed');
  });

  it('create skips audit when insert returns row without id', async () => {
    titanisRepo.create.mockResolvedValueOnce({ rows: [{ name: 'orphan' }], rowCount: 1 });
    const row = await service.create('u1', {
      name: 'Orphan',
      outreachChannel: 'mixed',
      budgetAllocated: 0,
    });
    expect(row).toEqual({ name: 'orphan' });
    expect(titanisRepo.auditWorkspaceCreated).not.toHaveBeenCalled();
  });
});
