import { TitanisService } from '../../../../modules/titanis/service/titanis.service';

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

jest.mock('../../../../modules/titanis/repository/titanis.repository', () => {
  titanisRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    auditWorkspaceCreated: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    auditRunCompleted: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
  return {
    TitanisRepository: jest.fn().mockImplementation(() => titanisRepo),
  };
});

describe('TitanisService extra branches', () => {
  let service: TitanisService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TitanisService();
    titanisRepo.createRun.mockResolvedValue({ rows: [{ id: 'run1' }], rowCount: 1 });
  });

  it('run floors fractional targetCount', async () => {
    titanisRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 's1', config: { outreach_channel: 'email' } }],
      rowCount: 1,
    });
    await service.run('s1', 'u1', { mode: 'lead-hunt', targetCount: 9.9 });
    expect(titanisRepo.createRun.mock.calls[0][2].target_count).toBe(9);
    expect(titanisRepo.createRun.mock.calls[0][2].leads_generated).toBe(9);
  });

  it('run follow-up uses non-close conversion rate and revenue multiplier', async () => {
    titanisRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 's1', config: { outreach_channel: 'mixed' } } as Record<string, unknown>],
      rowCount: 1,
    });
    await service.run('s1', 'u1', { mode: 'follow-up', targetCount: 3 });
    const payload = titanisRepo.createRun.mock.calls[0][2];
    expect(payload.leads_generated).toBe(2);
    expect(payload.conversions).toBe(1);
    expect(payload.estimated_revenue).toBe(55);
    expect(payload.channel).toBe('mixed');
  });
});
