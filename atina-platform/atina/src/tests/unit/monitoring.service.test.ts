import { MonitoringService } from '../../modules/monitoring/service/monitoring.service';

// eslint-disable-next-line no-var
var repo: Record<string, jest.Mock>;
// eslint-disable-next-line no-var
var runAllProbesMock: jest.Mock;

jest.mock('../../modules/monitoring/repository/monitoring.repository', () => {
  repo = {
    listServices: jest.fn(),
    insertHealthCheck: jest.fn(),
    latestHealthByService: jest.fn(),
    listIncidents: jest.fn(),
    countOpenIncidents: jest.fn(),
    getIncidentById: jest.fn(),
    findOpenIncidentByServiceTitle: jest.fn(),
    insertIncident: jest.fn(),
    insertIncidentEvent: jest.fn(),
    updateIncidentStatus: jest.fn(),
    listAnomalies: jest.fn(),
    latestAnomalyByDedupe: jest.fn(),
    insertAnomaly: jest.fn(),
    insertEngineRun: jest.fn(),
    latestEngineRun: jest.fn(),
    appendAudit: jest.fn(),
  };
  return {
    MonitoringRepository: jest.fn().mockImplementation(() => repo),
  };
});

jest.mock('../../modules/alert-system/repository/alert-system.repository', () => ({
  AlertSystemRepository: jest.fn().mockImplementation(() => ({
    listOpenAdmin: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  })),
}));

jest.mock('../../modules/monitoring/lib/probes', () => {
  runAllProbesMock = jest.fn();
  return {
    runAllProbes: (...args: unknown[]) => runAllProbesMock(...args),
  };
});

jest.mock('../../config', () => ({
  config: {
    monitoring: { enabled: true },
    reinvestment: { enabled: true },
    stripe: { secretKey: 'sk_test_x', publishableKey: 'pk_test_x', webhookSecret: 'whsec_x' },
    smtp: { enabled: true, host: 'smtp.test', user: 'u', password: 'p' },
    resend: { apiKey: '' },
    app: { env: 'test', webUrl: 'http://localhost:3010' },
  },
}));

describe('MonitoringService', () => {
  let service: MonitoringService;
  const actor = { userId: 'admin-1', role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MonitoringService();

    runAllProbesMock.mockResolvedValue([
      {
        code: 'api',
        status: 'healthy',
        latencyMs: 1,
        message: 'process_serving',
        evidence: {},
        isCritical: true,
      },
      {
        code: 'database',
        status: 'critical',
        latencyMs: 5,
        message: 'postgres_ping_failed',
        evidence: { ok: false },
        isCritical: true,
      },
      {
        code: 'monitoring',
        status: 'healthy',
        latencyMs: 1,
        message: 'monitoring_engine_self_ok',
        evidence: {},
        isCritical: true,
      },
    ]);

    repo.insertHealthCheck.mockResolvedValue({ rows: [{ id: 'h1' }], rowCount: 1 });
    repo.latestAnomalyByDedupe.mockResolvedValue({ rows: [], rowCount: 0 });
    repo.findOpenIncidentByServiceTitle.mockResolvedValue({ rows: [], rowCount: 0 });
    repo.insertIncident.mockResolvedValue({
      rows: [{ id: 'inc-1', public_code: 'MON-1', title: 'database critical' }],
      rowCount: 1,
    });
    repo.insertIncidentEvent.mockResolvedValue({ rows: [{ id: 'ev1' }], rowCount: 1 });
    repo.insertAnomaly.mockResolvedValue({ rows: [{ id: 'an1' }], rowCount: 1 });
    repo.insertEngineRun.mockResolvedValue({
      rows: [
        {
          id: 'run-1',
          phase: 'probe',
          status: 'degraded',
          overall_state: 'CRITICAL',
          engine_version: '1.0.0',
        },
      ],
      rowCount: 1,
    });
    repo.appendAudit.mockResolvedValue({ rows: [{ id: 'aud1' }], rowCount: 1 });
    repo.listServices.mockResolvedValue({
      rows: [
        { code: 'api', name: 'API', layer: 'api', is_critical: true },
        { code: 'database', name: 'DB', layer: 'database', is_critical: true },
        { code: 'monitoring', name: 'Monitoring', layer: 'monitoring', is_critical: true },
      ],
      rowCount: 3,
    });
    repo.latestHealthByService.mockResolvedValue({ rows: [], rowCount: 0 });
    repo.countOpenIncidents.mockResolvedValue({ rows: [{ count: '1' }], rowCount: 1 });
    repo.latestEngineRun.mockResolvedValue({ rows: [], rowCount: 0 });
    repo.listIncidents.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('runEngine persists health checks, anomalies/incidents, and engine_run', async () => {
    const result = await service.runEngine(actor, { correlationId: 'corr-1' });

    expect(runAllProbesMock).toHaveBeenCalled();
    expect(repo.insertHealthCheck).toHaveBeenCalledTimes(3);
    expect(repo.insertHealthCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceCode: 'database',
        status: 'critical',
        correlationId: 'corr-1',
      })
    );
    expect(repo.insertIncident).toHaveBeenCalled();
    expect(repo.insertAnomaly).toHaveBeenCalled();
    expect(repo.insertEngineRun).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'probe',
        overallState: 'CRITICAL',
      })
    );
    expect(repo.appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'engine.run', actorUserId: 'admin-1' })
    );
    expect(result.engineRun?.id).toBe('run-1');
    expect(result.created.incidents).toBeGreaterThanOrEqual(1);
    expect(result.created.anomalies).toBeGreaterThanOrEqual(1);
    expect(result.healthyClaimAllowed).toBe(false);
  });

  it('suppresses duplicate anomalies within cooldown', async () => {
    repo.latestAnomalyByDedupe.mockResolvedValue({
      rows: [{ id: 'an-old', created_at: new Date().toISOString(), dedupe_key: 'mon:x' }],
      rowCount: 1,
    });

    const result = await service.runEngine(actor);
    expect(result.created.suppressed).toBeGreaterThanOrEqual(1);
    expect(repo.insertAnomaly).not.toHaveBeenCalled();
    expect(repo.insertEngineRun).toHaveBeenCalled();
  });

  it('getOverview never claims healthy when monitoring_self unknown', async () => {
    repo.latestHealthByService.mockResolvedValue({
      rows: [
        {
          service_code: 'api',
          status: 'healthy',
          message: 'ok',
          checked_at: '2026-09-30',
          latency_ms: 1,
        },
      ],
      rowCount: 1,
    });

    const overview = await service.getOverview();
    expect(overview.overall.state).toBe('MONITORING_DEGRADED');
    expect(overview.healthyClaimAllowed).toBe(false);
  });
});
