import { randomBytes } from 'crypto';
import { config } from '../../../config';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import { AlertSystemRepository } from '../../alert-system/repository/alert-system.repository';
import { MONITORING_ENGINE_VERSION, type IncidentStatus } from '../lib/constants';
import { rankAttentionItems, type AttentionItem } from '../lib/attention';
import { buildDedupeKey, shouldSuppress } from '../lib/dedupe';
import { computeOverallState } from '../lib/health-score';
import { runAllProbes, type ProbeResult } from '../lib/probes';
import { redactSecrets } from '../lib/redact';
import { MonitoringRepository } from '../repository/monitoring.repository';

type Actor = { userId: string; role: string };

const OPEN_INCIDENT_STATUSES = new Set([
  'detected',
  'acknowledged',
  'investigating',
  'mitigating',
  'monitoring',
]);

function publicIncidentCode(): string {
  return `MON-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

function severityForProbe(status: ProbeResult['status']): 'info' | 'warning' | 'high' | 'critical' {
  if (status === 'critical') return 'critical';
  if (status === 'unavailable') return 'high';
  if (status === 'warning') return 'warning';
  return 'info';
}

export class MonitoringService {
  private readonly repo = new MonitoringRepository();
  private readonly alertsRepo = new AlertSystemRepository();

  async runProbes(correlationId?: string | null): Promise<ProbeResult[]> {
    let probes: ProbeResult[] = [];
    try {
      probes = await runAllProbes();
    } catch (err) {
      logger.warn('Monitoring probe suite threw; marking monitoring unavailable', {
        error: err instanceof Error ? err.message : String(err),
      });
      probes = [
        {
          code: 'monitoring',
          status: 'unavailable',
          latencyMs: null,
          message: err instanceof Error ? err.message : 'probe_suite_threw',
          evidence: {},
          isCritical: true,
        },
      ];
    }

    for (const p of probes) {
      try {
        await this.repo.insertHealthCheck({
          serviceCode: p.code,
          status: p.status,
          latencyMs: p.latencyMs,
          message: p.message,
          evidence: redactSecrets(p.evidence),
          correlationId: correlationId ?? null,
        });
      } catch (err) {
        logger.warn('Failed to persist monitoring health check', {
          service: p.code,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return probes;
  }

  async runEngine(actor: Actor, opts: { correlationId?: string } = {}) {
    const startedAt = new Date().toISOString();
    const probes = await this.runProbes(opts.correlationId);
    const overall = computeOverallState(
      probes.map((p) => ({
        code: p.code,
        status: p.status,
        message: p.message,
        isCritical: p.isCritical,
      }))
    );

    const attention = this.buildAttentionFromProbes(probes);
    const created: { anomalies: number; incidents: number; suppressed: number } = {
      anomalies: 0,
      incidents: 0,
      suppressed: 0,
    };

    for (const p of probes) {
      if (p.status === 'healthy' || p.status === 'unknown') continue;
      const title = `${p.code} ${p.status}`;
      const dedupeKey = buildDedupeKey(p.code, title);
      const severity = severityForProbe(p.status);

      try {
        const { rows: prior } = await this.repo.latestAnomalyByDedupe(dedupeKey);
        const lastAt = prior[0]?.created_at;
        if (shouldSuppress(lastAt, 300)) {
          created.suppressed += 1;
          continue;
        }

        let incidentId: string | null = null;
        if (p.status === 'critical' || (p.status === 'unavailable' && p.isCritical)) {
          const { rows: openRows } = await this.repo.findOpenIncidentByServiceTitle(p.code, title);
          if (openRows[0]) {
            incidentId = openRows[0].id;
          } else {
            const { rows: inserted } = await this.repo.insertIncident({
              publicCode: publicIncidentCode(),
              title,
              severity,
              affectedService: p.code,
              symptoms: p.message,
              evidence: [redactSecrets({ ...p.evidence, status: p.status })],
            });
            incidentId = inserted[0]?.id ?? null;
            if (incidentId) {
              created.incidents += 1;
              await this.repo.insertIncidentEvent({
                incidentId,
                eventType: 'detected',
                message: p.message,
                actorUserId: actor.userId,
                metadata: { source: 'engine_run' },
              });
            }
          }
        }

        await this.repo.insertAnomaly({
          metricKey: `health.${p.code}`,
          serviceCode: p.code,
          severity,
          detector: 'threshold',
          observedValue: p.status === 'critical' ? 3 : p.status === 'unavailable' ? 2 : 1,
          score: severity === 'critical' ? 8 : severity === 'high' ? 5 : 2,
          message: p.message,
          incidentId,
          dedupeKey,
        });
        created.anomalies += 1;
      } catch (err) {
        logger.warn('Monitoring anomaly/incident persist failed', {
          service: p.code,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    let runStatus: 'completed' | 'degraded' | 'failed' = 'completed';
    if (overall.state === 'MONITORING_DEGRADED' || overall.state === 'DEGRADED') {
      runStatus = 'degraded';
    }
    if (overall.state === 'CRITICAL') runStatus = 'degraded';

    const subsystemMap = Object.fromEntries(
      probes.map((p) => [
        p.code,
        {
          status: p.status,
          message: p.message,
          latencyMs: p.latencyMs,
          isCritical: p.isCritical,
        },
      ])
    );

    let engineRun = null;
    try {
      const { rows } = await this.repo.insertEngineRun({
        phase: 'probe',
        status: runStatus,
        overallState: overall.state,
        subsystemStatuses: subsystemMap,
        attention: attention.slice(0, 20),
        startedAt,
      });
      engineRun = rows[0] ?? null;
      await this.repo.appendAudit({
        action: 'engine.run',
        actorUserId: actor.userId,
        actorRole: actor.role,
        resourceType: 'engine_run',
        resourceId: engineRun?.id ?? null,
        metadata: { overallState: overall.state, created },
      });
    } catch (err) {
      logger.warn('Monitoring engine_run persist failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Fail-soft: pull Marketing anomalies into system_alerts (observability only).
    let marketingIngest = { kind: 'UNAVAILABLE' as string, imported: 0 };
    try {
      const { fetchMarketingAnomaliesForMonitoring } = await import(
        '../../marketing/lib/monitoring-bridge'
      );
      const mkt = await fetchMarketingAnomaliesForMonitoring();
      marketingIngest = { kind: mkt.kind, imported: 0 };
      for (const a of mkt.anomalies ?? []) {
        try {
          await this.alertsRepo.create(null, {
            title: `Marketing: ${a.code}`,
            message: a.message || a.code,
            severity: a.severity === 'critical' ? 'critical' : a.severity === 'high' ? 'high' : 'warning',
            category: 'marketing',
            sourceModule: 'marketing',
            metadata: { code: a.code, asOf: mkt.asOf },
          });
          marketingIngest.imported += 1;
        } catch {
          /* ignore duplicate/create failures */
        }
      }
    } catch (err) {
      logger.warn('Marketing→Monitoring bridge failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      engineVersion: MONITORING_ENGINE_VERSION,
      overall,
      probes: redactSecrets(probes),
      attention: attention.slice(0, 20),
      created,
      engineRun,
      healthyClaimAllowed: overall.healthyClaimAllowed,
      marketingIngest,
    };
  }

  async getOverview() {
    const [{ rows: services }, { rows: latest }, { rows: openCount }, { rows: lastRun }] =
      await Promise.all([
        this.repo.listServices().catch(() => ({ rows: [], rowCount: 0 })),
        this.repo.latestHealthByService().catch(() => ({ rows: [], rowCount: 0 })),
        this.repo.countOpenIncidents().catch(() => ({ rows: [{ count: '0' }], rowCount: 1 })),
        this.repo.latestEngineRun().catch(() => ({ rows: [], rowCount: 0 })),
      ]);

    const healthByCode = new Map(latest.map((h) => [h.service_code, h]));
    type ServiceCardSource = {
      code: string;
      name: string;
      layer: string;
      is_critical: boolean;
    };
    const serviceCards: ServiceCardSource[] =
      services.length > 0
        ? services.map((s) => ({
            code: s.code,
            name: s.name,
            layer: s.layer,
            is_critical: s.is_critical,
          }))
        : [{ code: 'monitoring', name: 'Monitoring Engine', layer: 'monitoring', is_critical: true }];

    const cards = serviceCards.map((s) => {
      const h = healthByCode.get(s.code);
      return {
        code: s.code,
        name: s.name,
        layer: s.layer,
        isCritical: Boolean(s.is_critical),
        status: (h?.status as ProbeResult['status']) ?? 'unknown',
        message: h?.message ?? 'no_recent_check',
        checkedAt: h?.checked_at ?? null,
        latencyMs: h?.latency_ms ?? null,
      };
    });

    const monitoringSelf = cards.find((c) => c.code === 'monitoring') ?? {
      code: 'monitoring',
      status: 'unavailable' as const,
      message: 'monitoring_self_missing',
      isCritical: true,
    };

    const overall = computeOverallState(
      cards.map((c) => ({
        code: c.code,
        status: c.status as ProbeResult['status'],
        message: c.message ?? undefined,
        isCritical: c.isCritical,
      }))
    );

    return {
      engineVersion: MONITORING_ENGINE_VERSION,
      enabled: config.monitoring?.enabled !== false,
      overall,
      monitoringSelf: {
        status: monitoringSelf.status,
        message: 'message' in monitoringSelf ? monitoringSelf.message : null,
      },
      openIncidents: Number(openCount[0]?.count ?? 0),
      subsystems: cards,
      lastEngineRun: lastRun[0] ?? null,
      healthyClaimAllowed: overall.healthyClaimAllowed,
    };
  }

  async getHealth() {
    const overview = await this.getOverview();
    return {
      engineVersion: MONITORING_ENGINE_VERSION,
      overall: overview.overall,
      monitoringSelf: overview.monitoringSelf,
      healthyClaimAllowed: overview.healthyClaimAllowed,
      subsystems: overview.subsystems.map((s) => ({
        code: s.code,
        status: s.status,
        message: s.message,
      })),
    };
  }

  async getServices() {
    const { rows } = await this.repo.listServices();
    const { rows: latest } = await this.repo.latestHealthByService().catch(() => ({
      rows: [] as Awaited<ReturnType<MonitoringRepository['latestHealthByService']>>['rows'],
    }));
    const healthByCode = new Map(latest.map((h) => [h.service_code, h]));
    return rows.map((s) => ({
      ...s,
      latestHealth: healthByCode.get(s.code) ?? null,
    }));
  }

  async getAlerts(limit = 50) {
    try {
      const { rows } = await this.alertsRepo.listOpenAdmin(Math.min(100, Math.max(1, limit)));
      return { source: 'system_alerts', alerts: redactSecrets(rows) };
    } catch (err) {
      logger.warn('Monitoring alerts bridge failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { source: 'system_alerts', alerts: [], error: 'unavailable' };
    }
  }

  async getIncidents(limit = 50, status?: string) {
    const { rows } = await this.repo.listIncidents({ limit, status });
    return redactSecrets(rows);
  }

  async getAttention(limit = 20) {
    const items = await this.collectAttentionItems();
    return rankAttentionItems(items).slice(0, limit);
  }

  async getAnomalies(limit = 50) {
    const { rows } = await this.repo.listAnomalies(limit);
    return redactSecrets(rows);
  }

  async getCosts() {
    try {
      const mod = await import('../../omi/omi-usage-admin');
      const dashboard = await mod.getOmiUsageDashboard();
      return {
        kind: 'ACTUAL' as const,
        source: 'omi_usage',
        storeReady: dashboard.storeReady,
        budget: dashboard.budget,
        requests: dashboard.requests,
        costByModel: dashboard.costByModel,
        note: 'actual_omi_usage_only',
      };
    } catch (err) {
      return {
        kind: 'ACTUAL' as const,
        source: 'omi_usage',
        storeReady: false,
        unavailable: true,
        message: err instanceof Error ? err.message : 'omi_usage_unavailable',
      };
    }
  }

  /**
   * Read-only snapshot for reinvestment consumers.
   * NEVER mutates balances / NEVER authorizes spend.
   */
  async getReinvestmentSignals() {
    const health = await this.getHealth();
    const costs = await this.getCosts();
    let revenueObserve: unknown = null;
    try {
      const observeMod = await import('../../reinvestment/lib/observe');
      if (typeof observeMod.observeRevenueAllocations === 'function') {
        revenueObserve = await observeMod.observeRevenueAllocations();
      }
    } catch {
      revenueObserve = { unavailable: true };
    }

    return {
      kind: 'READ_ONLY' as const,
      note: 'no_write_no_spend',
      health: {
        overall: health.overall,
        monitoringSelf: health.monitoringSelf,
        subsystems: health.subsystems,
      },
      costs,
      revenueObserve: redactSecrets(revenueObserve),
    };
  }

  async patchIncident(
    id: string,
    body: { status: IncidentStatus; resolution?: string; note?: string },
    actor: Actor
  ) {
    const { rows: existing } = await this.repo.getIncidentById(id);
    const incident = existing[0];
    if (!incident) throw new NotFoundError('Incident');

    this.assertStatusTransition(incident.status as IncidentStatus, body.status);

    const { rows } = await this.repo.updateIncidentStatus({
      id,
      status: body.status,
      resolution: body.resolution ?? null,
      acknowledgedAt: body.status === 'acknowledged' || body.status === 'investigating',
      resolvedAt: body.status === 'resolved',
      closedAt: body.status === 'closed',
    });
    const updated = rows[0];
    if (!updated) throw new NotFoundError('Incident');

    await this.repo.insertIncidentEvent({
      incidentId: id,
      eventType: `status.${body.status}`,
      message: body.note || `status → ${body.status}`,
      actorUserId: actor.userId,
      metadata: { from: incident.status, to: body.status },
    });

    await this.repo.appendAudit({
      action: 'incident.patch',
      actorUserId: actor.userId,
      actorRole: actor.role,
      resourceType: 'incident',
      resourceId: id,
      reason: body.note ?? null,
      metadata: { from: incident.status, to: body.status },
    });

    return updated;
  }

  private assertStatusTransition(from: IncidentStatus, to: IncidentStatus) {
    if (from === to) return;
    const allowed: Record<string, IncidentStatus[]> = {
      detected: ['acknowledged', 'investigating', 'resolved', 'closed'],
      acknowledged: ['investigating', 'mitigating', 'monitoring', 'resolved', 'closed'],
      investigating: ['mitigating', 'monitoring', 'acknowledged', 'resolved', 'closed'],
      mitigating: ['monitoring', 'resolved', 'investigating', 'closed'],
      monitoring: ['resolved', 'investigating', 'closed'],
      resolved: ['closed', 'monitoring'],
      closed: [],
    };
    const next = allowed[from] ?? [];
    if (!next.includes(to)) {
      throw new ValidationError(`Invalid incident transition ${from} → ${to}`, {
        from,
        to,
        allowed: next,
      });
    }
  }

  private buildAttentionFromProbes(probes: ProbeResult[]): AttentionItem[] {
    return probes
      .filter((p) => p.status !== 'healthy')
      .map((p) => ({
        id: `probe:${p.code}`,
        title: `${p.code}: ${p.message}`,
        severity: severityForProbe(p.status),
        businessImpact: p.isCritical ? 80 : 40,
        urgency:
          p.status === 'critical' ? 90 : p.status === 'unavailable' ? 70 : p.status === 'warning' ? 40 : 20,
        serviceCode: p.code,
        kind: 'health_probe',
      }));
  }

  private async collectAttentionItems(): Promise<AttentionItem[]> {
    const items: AttentionItem[] = [];

    try {
      const { rows: latest } = await this.repo.latestHealthByService();
      for (const h of latest) {
        if (h.status === 'healthy') continue;
        items.push({
          id: `health:${h.service_code}`,
          title: `${h.service_code}: ${h.message ?? h.status}`,
          severity: severityForProbe(h.status as ProbeResult['status']),
          businessImpact: 60,
          urgency: h.status === 'critical' ? 90 : 50,
          serviceCode: h.service_code,
          kind: 'health',
          detectedAt: h.checked_at,
        });
      }
    } catch {
      /* fail soft */
    }

    try {
      const { rows: incidents } = await this.repo.listIncidents({ limit: 50 });
      for (const i of incidents) {
        if (!OPEN_INCIDENT_STATUSES.has(i.status)) continue;
        items.push({
          id: `incident:${i.id}`,
          title: i.title,
          severity: (['info', 'warning', 'high', 'critical'].includes(i.severity)
            ? i.severity
            : 'warning') as AttentionItem['severity'],
          businessImpact: i.severity === 'critical' ? 95 : 70,
          urgency: i.status === 'detected' ? 85 : 60,
          serviceCode: i.affected_service ?? undefined,
          kind: 'incident',
          detectedAt: i.detected_at,
        });
      }
    } catch {
      /* fail soft */
    }

    return items;
  }
}
