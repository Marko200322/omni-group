import { fetchMonitoringSignalsForReinvestment } from '../../modules/monitoring/lib/reinvestment-bridge';

describe('monitoring → reinvestment bridge', () => {
  it('returns UNAVAILABLE fail-soft when MonitoringService throws', async () => {
    jest.resetModules();
    jest.doMock('../../modules/monitoring/service/monitoring.service', () => ({
      MonitoringService: jest.fn().mockImplementation(() => ({
        getOverview: jest.fn().mockRejectedValue(new Error('db_down')),
        getCosts: jest.fn().mockRejectedValue(new Error('db_down')),
      })),
    }));

    const { fetchMonitoringSignalsForReinvestment: fetch } = await import(
      '../../modules/monitoring/lib/reinvestment-bridge'
    );
    const signal = await fetch();
    expect(signal.kind).toBe('UNAVAILABLE');
    expect(signal.monitoringOverallState).toBe('MONITORING_DEGRADED');
    expect(signal.notes).toEqual(expect.arrayContaining(['monitoring_unavailable']));
    expect(signal.notes.some((n) => n.includes('db_down'))).toBe(true);
  });

  it('maps overview overall.state into ACTUAL operational signal', async () => {
    jest.resetModules();
    jest.doMock('../../modules/monitoring/service/monitoring.service', () => ({
      MonitoringService: jest.fn().mockImplementation(() => ({
        getOverview: jest.fn().mockResolvedValue({
          overall: { state: 'OPERATIONAL', healthyClaimAllowed: true, reasons: [] },
          openIncidents: 0,
          subsystems: [
            { code: 'monitoring', status: 'healthy', message: 'ok' },
            { code: 'api', status: 'healthy', message: 'ok' },
          ],
        }),
        getCosts: jest.fn().mockResolvedValue({
          budget: { dailySpentUsd: 1.25 },
        }),
      })),
    }));

    const { fetchMonitoringSignalsForReinvestment: fetch } = await import(
      '../../modules/monitoring/lib/reinvestment-bridge'
    );
    const signal = await fetch();
    expect(signal.kind).toBe('ACTUAL');
    expect(signal.monitoringOverallState).toBe('OPERATIONAL');
    expect(signal.subsystemStatuses.monitoring?.status).toBe('healthy');
    expect(signal.costs?.omiEstimatedUsd).toBe(1.25);
    expect(signal.costs?.costKind).toBe('ACTUAL');
    expect(signal.notes).toEqual(expect.arrayContaining(['read_only', 'no_spend_authority']));
  });

  it('exports fetch helper', () => {
    expect(typeof fetchMonitoringSignalsForReinvestment).toBe('function');
  });
});
