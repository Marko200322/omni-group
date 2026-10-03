/**
 * Read-only bridge: Monitoring → Reinvestment.
 * Monitoring NEVER authorizes spend; only supplies validated operational signals.
 */

export type ReinvestmentOperationalSignal = {
  kind: 'ACTUAL' | 'UNAVAILABLE';
  asOf: string;
  monitoringOverallState: string;
  subsystemStatuses: Record<string, { status: string; reason?: string }>;
  costs?: {
    omiEstimatedUsd?: number;
    costKind: 'ACTUAL' | 'ESTIMATE' | 'UNAVAILABLE';
  };
  openIncidents?: number;
  notes: string[];
};

export type MonitoringToReinvestmentBridge = {
  getOperationalSignals(): Promise<ReinvestmentOperationalSignal>;
};

/** Fail-soft fetch of monitoring overview for reinvestment status enrichment. */
export async function fetchMonitoringSignalsForReinvestment(): Promise<ReinvestmentOperationalSignal> {
  const asOf = new Date().toISOString();
  try {
    const { MonitoringService } = await import('../service/monitoring.service');
    const svc = new MonitoringService();
    const [overview, costs] = await Promise.all([svc.getOverview(), svc.getCosts()]);

    const subsystems: Record<string, { status: string; reason?: string }> = {};
    for (const s of overview.subsystems ?? []) {
      subsystems[s.code] = { status: String(s.status ?? 'unknown'), reason: s.message ?? undefined };
    }

    const overallState =
      typeof overview.overall === 'object' && overview.overall && 'state' in overview.overall
        ? String(overview.overall.state)
        : String(overview.overall ?? 'UNKNOWN');

    const omiUsd = Number(costs?.budget?.dailySpentUsd);
    return {
      kind: 'ACTUAL',
      asOf,
      monitoringOverallState: overallState,
      subsystemStatuses: subsystems,
      costs: {
        omiEstimatedUsd: Number.isFinite(omiUsd) ? omiUsd : undefined,
        costKind: Number.isFinite(omiUsd) ? 'ACTUAL' : 'UNAVAILABLE',
      },
      openIncidents: Number(overview.openIncidents ?? 0) || 0,
      notes: ['read_only', 'no_spend_authority'],
    };
  } catch (err) {
    return {
      kind: 'UNAVAILABLE',
      asOf,
      monitoringOverallState: 'MONITORING_DEGRADED',
      subsystemStatuses: {},
      costs: { costKind: 'UNAVAILABLE' },
      notes: [
        'monitoring_unavailable',
        err instanceof Error ? err.message.slice(0, 120) : 'unknown_error',
      ],
    };
  }
}
