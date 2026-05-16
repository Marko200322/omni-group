import { ApexPredatorService } from '../../../../modules/apex-predator/service/apex-predator.service';
import { NotFoundError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var apexPredatorRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
  listRiskGrid: jest.Mock;
};

jest.mock('../../../../modules/apex-predator/repository/apex-predator.repository', () => {
  apexPredatorRepo = {
    listByUser: jest.fn(),
    create: jest.fn(),
    getOwned: jest.fn().mockResolvedValue({
      rows: [{ id: 'sid', budget_allocated: 120000, efficiency_score: 40, config: { risk_profile: 'medium' } }],
      rowCount: 1,
    }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
    listRiskGrid: jest.fn().mockResolvedValue({ rows: [] }),
  };
  return {
    ApexPredatorRepository: jest.fn().mockImplementation(() => apexPredatorRepo),
  };
});

describe('ApexPredatorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apexPredatorRepo.listByUser.mockResolvedValue({ rows: [{ id: 'p1' }] });
    apexPredatorRepo.create.mockResolvedValue({ rows: [{ id: 'new-p' }] });
    apexPredatorRepo.getOwned.mockResolvedValue({
      rows: [{ id: 'sid', budget_allocated: 120000, efficiency_score: 40, config: { risk_profile: 'medium' } }],
      rowCount: 1,
    });
    apexPredatorRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    apexPredatorRepo.listRiskGrid.mockResolvedValue({ rows: [{ id: 'rg1' }] });
  });

  it('computes deterministic domain transition output with normalized fields', async () => {
    const service = new ApexPredatorService();
    await service.run('sid', 'u1', { mode: 'upsell', intensity: 40 });

    const runPayload = apexPredatorRepo.createRun.mock.calls[0][2];
    expect(runPayload).toEqual(
      expect.objectContaining({
        mode: 'upsell',
        intensity: 40,
        previousDomainState: 'prospecting',
        nextDomainState: 'monetizing',
        estimatedRevenue: expect.any(Number),
        conversionRate: expect.any(Number),
        retentionRate: expect.any(Number),
        estimated_revenue: expect.any(Number),
        conversion_rate: expect.any(Number),
      })
    );
    expect(runPayload.estimatedRevenue).toBe(runPayload.estimated_revenue);
    expect(runPayload.conversionRate).toBe(runPayload.conversion_rate);
    expect(apexPredatorRepo.updateAfterRun).toHaveBeenCalledWith(
      'sid',
      runPayload.estimatedRevenue,
      runPayload.efficiencyDelta,
      'upsell',
      runPayload.conversionRate,
      'monetizing'
    );
  });

  it('returns not found when profile is absent', async () => {
    const service = new ApexPredatorService();
    apexPredatorRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(service.run('missing', 'u1', { mode: 'outreach', intensity: 20 })).rejects.toBeInstanceOf(NotFoundError);
    expect(apexPredatorRepo.createRun).not.toHaveBeenCalled();
    expect(apexPredatorRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it('list and create delegate to repository', async () => {
    const service = new ApexPredatorService();
    expect(await service.list('u2')).toEqual([{ id: 'p1' }]);
    expect(apexPredatorRepo.listByUser).toHaveBeenCalledWith('u2');

    const created = await service.create('u2', {
      name: 'AC',
      budgetAllocated: 0,
      riskProfile: 'high',
    });
    expect(created).toEqual({ id: 'new-p' });
    expect(apexPredatorRepo.create).toHaveBeenCalledWith('u2', 'AC', 0, 'high');
  });

  it('riskGrid delegates to listRiskGrid', async () => {
    const service = new ApexPredatorService();
    const rows = await service.riskGrid();
    expect(rows).toEqual([{ id: 'rg1' }]);
    expect(apexPredatorRepo.listRiskGrid).toHaveBeenCalled();
  });

  it('uses metrics.domain_state when present over config', async () => {
    const service = new ApexPredatorService();
    apexPredatorRepo.getOwned.mockResolvedValueOnce({
      rows: [
        {
          id: 'sid',
          budget_allocated: 0,
          efficiency_score: 0,
          config: { risk_profile: 'low', domain_state: 'prospecting' },
          metrics: { domain_state: 'monetizing' },
        },
      ],
      rowCount: 1,
    });
    await service.run('sid', 'u1', { mode: 'retention', intensity: 50 });

    const runPayload = apexPredatorRepo.createRun.mock.calls[0][2] as { previousDomainState: string; nextDomainState: string };
    expect(runPayload.previousDomainState).toBe('monetizing');
    expect(runPayload.nextDomainState).toBe('stabilizing');
  });

  it('scales estimated revenue with high risk profile', async () => {
    apexPredatorRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'sid-h', budget_allocated: 0, efficiency_score: 0, config: { risk_profile: 'high' } }],
      rowCount: 1,
    });
    await new ApexPredatorService().run('sid-h', 'u1', { mode: 'outreach', intensity: 50 });
    const highRev = (apexPredatorRepo.createRun.mock.calls[0][2] as { estimatedRevenue: number }).estimatedRevenue;

    apexPredatorRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'sid-l', budget_allocated: 0, efficiency_score: 0, config: { risk_profile: 'low' } }],
      rowCount: 1,
    });
    await new ApexPredatorService().run('sid-l', 'u1', { mode: 'outreach', intensity: 50 });
    const lowRev = (apexPredatorRepo.createRun.mock.calls[1][2] as { estimatedRevenue: number }).estimatedRevenue;

    expect(highRev).toBeGreaterThan(lowRev);
  });

  it('derives alertCount from risk profile and run mode (risk-shield lowers baseline)', async () => {
    const svc = new ApexPredatorService();

    apexPredatorRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'a1', budget_allocated: 0, efficiency_score: 0, config: { risk_profile: 'high' } }],
      rowCount: 1,
    });
    await svc.run('a1', 'u1', { mode: 'outreach', intensity: 40 });
    const highOutreach = apexPredatorRepo.createRun.mock.calls[0][2] as { alertCount: number };

    apexPredatorRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'a2', budget_allocated: 0, efficiency_score: 0, config: { risk_profile: 'high' } }],
      rowCount: 1,
    });
    await svc.run('a2', 'u1', { mode: 'risk-shield', intensity: 40 });
    const highShield = apexPredatorRepo.createRun.mock.calls[1][2] as { alertCount: number };

    apexPredatorRepo.getOwned.mockResolvedValueOnce({
      rows: [{ id: 'a3', budget_allocated: 0, efficiency_score: 0, config: { risk_profile: 'low' } }],
      rowCount: 1,
    });
    await svc.run('a3', 'u1', { mode: 'risk-shield', intensity: 40 });
    const lowShield = apexPredatorRepo.createRun.mock.calls[2][2] as { alertCount: number };

    expect(highOutreach.alertCount).toBe(3);
    expect(highShield.alertCount).toBe(1);
    expect(lowShield.alertCount).toBe(0);
  });
});
