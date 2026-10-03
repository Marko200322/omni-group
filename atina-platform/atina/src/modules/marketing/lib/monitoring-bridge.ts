/**
 * Read-only bridge: Marketing anomalies → Monitoring.
 */

export type MarketingMonitoringSignal = {
  kind: 'ACTUAL' | 'UNAVAILABLE';
  asOf: string;
  openAlerts: number;
  overallHealth: string;
  anomalies: Array<{ code: string; severity: string; message: string }>;
  notes: string[];
};

export async function fetchMarketingAnomaliesForMonitoring(): Promise<MarketingMonitoringSignal> {
  const asOf = new Date().toISOString();
  try {
    const { MarketingService } = await import('../service/marketing.service');
    const svc = new MarketingService();
    const [health, alerts] = await Promise.all([svc.getHealth(), svc.getAlerts(20)]);
    return {
      kind: 'ACTUAL',
      asOf,
      openAlerts: Array.isArray(alerts) ? alerts.filter((a: { status?: string }) => a.status === 'open').length : 0,
      overallHealth: health.overall ?? 'unavailable',
      anomalies: (Array.isArray(alerts) ? alerts : [])
        .filter((a: { status?: string }) => a.status === 'open')
        .slice(0, 10)
        .map((a: { code?: string; severity?: string; message?: string }) => ({
          code: a.code ?? 'marketing_alert',
          severity: a.severity ?? 'warning',
          message: a.message ?? '',
        })),
      notes: ['read_only', 'observability_only'],
    };
  } catch (err) {
    return {
      kind: 'UNAVAILABLE',
      asOf,
      openAlerts: 0,
      overallHealth: 'unavailable',
      anomalies: [],
      notes: [
        'marketing_unavailable',
        err instanceof Error ? err.message.slice(0, 120) : 'unknown_error',
      ],
    };
  }
}
