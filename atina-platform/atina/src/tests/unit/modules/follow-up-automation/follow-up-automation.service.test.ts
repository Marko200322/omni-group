import { FollowUpAutomationService } from '../../../../modules/follow-up-automation/service/follow-up-automation.service';

const mockRepo = {
  listByUser: jest.fn(),
  create: jest.fn(),
  getOwned: jest.fn(),
  createRun: jest.fn(),
  updateAfterRun: jest.fn(),
};

jest.mock('../../../../modules/follow-up-automation/repository/follow-up-automation.repository', () => ({
  FollowUpAutomationRepository: jest.fn().mockImplementation(() => mockRepo),
}));

describe('FollowUpAutomationService', () => {
  let service: FollowUpAutomationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FollowUpAutomationService();
    mockRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sys-1' }] });
    mockRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    mockRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it.each([
    ['schedule', 30, 'follow-up-automation_schedule'],
    ['escalate', 30, 'follow-up-automation_escalate'],
    ['digest', 30, 'follow-up-automation_digest'],
  ] as const)('run uses mode %s in run_type', async (mode, intensity, expectedPrefix) => {
    await service.run('sys-1', 'u1', { mode, intensity, revenueEstimate: 50 });

    expect(mockRepo.createRun).toHaveBeenCalledWith(
      'sys-1',
      expectedPrefix,
      expect.objectContaining({
        mode,
        intensity,
        estimatedRevenue: 50,
      })
    );
  });

  it('run throws when workspace not found', async () => {
    mockRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    await expect(service.run('missing', 'u1', { mode: 'schedule', intensity: 10 })).rejects.toThrow(
      'Follow-up Automation workspace not found'
    );
  });

  it('list returns rows from repository', async () => {
    mockRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w2' }] });
    await expect(service.list('u1')).resolves.toEqual([{ id: 'w2' }]);
    expect(mockRepo.listByUser).toHaveBeenCalledWith('u1');
  });

  it('create delegates to repository', async () => {
    mockRepo.create.mockResolvedValue({ rows: [{ id: 'created' }] });
    const row = await service.create('u1', {
      name: 'Workspace',
      budgetAllocated: 50,
      followUpStrategy: 'light',
    });
    expect(row).toEqual({ id: 'created' });
    expect(mockRepo.create).toHaveBeenCalledWith('u1', 'Workspace', 50, 'light');
  });

  it('status returns parsed shape', async () => {
    const status = await service.status();
    expect(status.strategies).toEqual(['aggressive', 'balanced', 'light']);
    expect(status.pipelineCapacity.maxFollowUpsPerRun).toBe(400);
  });

  it('run uses default revenue when omitted', async () => {
    await service.run('sys-1', 'u1', { mode: 'schedule', intensity: 10 });
    expect(mockRepo.createRun).toHaveBeenCalledWith(
      'sys-1',
      'follow-up-automation_schedule',
      expect.objectContaining({ estimatedRevenue: 45 })
    );
  });
});
