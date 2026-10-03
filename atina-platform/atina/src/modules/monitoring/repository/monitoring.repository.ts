import { query } from '../../../database/connection';
import { MONITORING_ENGINE_VERSION } from '../lib/constants';

export type MonitoringServiceRow = {
  id: string;
  code: string;
  name: string;
  layer: string;
  is_critical: boolean;
  check_interval_sec: number;
  is_active: boolean;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

export type MonitoringHealthCheckRow = {
  id: string;
  service_code: string;
  status: string;
  checked_at: string;
  latency_ms: number | null;
  message: string | null;
  evidence: unknown;
  engine_version: string;
  correlation_id: string | null;
};

export type MonitoringIncidentRow = {
  id: string;
  public_code: string;
  title: string;
  severity: string;
  status: string;
  affected_service: string | null;
  affected_functionality: string | null;
  symptoms: string | null;
  probable_cause: string | null;
  cause_confidence: string | null;
  evidence: unknown;
  related_alert_ids: unknown;
  assigned_user_id: string | null;
  resolution: string | null;
  post_incident_notes: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  engine_version: string;
  created_at: string;
  updated_at: string;
};

export type MonitoringAnomalyRow = {
  id: string;
  metric_key: string;
  service_code: string | null;
  severity: string;
  detector: string;
  observed_value: string | null;
  baseline_value: string | null;
  score: string | null;
  message: string;
  incident_id: string | null;
  dedupe_key: string | null;
  created_at: string;
};

export type MonitoringEngineRunRow = {
  id: string;
  phase: string;
  status: string;
  engine_version: string;
  overall_state: string | null;
  subsystem_statuses: unknown;
  attention: unknown;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export class MonitoringRepository {
  listServices() {
    return query<MonitoringServiceRow>(
      `SELECT id, code, name, layer, is_critical, check_interval_sec, is_active,
              metadata, created_at::text, updated_at::text
       FROM monitoring_services
       WHERE is_active = TRUE
       ORDER BY layer ASC, code ASC`
    );
  }

  insertHealthCheck(input: {
    serviceCode: string;
    status: string;
    latencyMs: number | null;
    message: string | null;
    evidence: Record<string, unknown>;
    correlationId?: string | null;
  }) {
    return query<MonitoringHealthCheckRow>(
      `INSERT INTO monitoring_health_checks
         (service_code, status, latency_ms, message, evidence, engine_version, correlation_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, service_code, status, checked_at::text, latency_ms, message,
                 evidence, engine_version, correlation_id`,
      [
        input.serviceCode,
        input.status,
        input.latencyMs,
        input.message,
        JSON.stringify(input.evidence ?? {}),
        MONITORING_ENGINE_VERSION,
        input.correlationId ?? null,
      ]
    );
  }

  latestHealthByService() {
    return query<MonitoringHealthCheckRow>(
      `SELECT DISTINCT ON (service_code)
         id, service_code, status, checked_at::text, latency_ms, message,
         evidence, engine_version, correlation_id
       FROM monitoring_health_checks
       ORDER BY service_code, checked_at DESC`
    );
  }

  listIncidents(opts: { limit: number; status?: string }) {
    if (opts.status) {
      return query<MonitoringIncidentRow>(
        `SELECT id, public_code, title, severity, status, affected_service,
                affected_functionality, symptoms, probable_cause, cause_confidence,
                evidence, related_alert_ids, assigned_user_id, resolution,
                post_incident_notes, detected_at::text, acknowledged_at::text,
                resolved_at::text, closed_at::text, engine_version,
                created_at::text, updated_at::text
         FROM monitoring_incidents
         WHERE status = $1
         ORDER BY detected_at DESC
         LIMIT $2`,
        [opts.status, opts.limit]
      );
    }
    return query<MonitoringIncidentRow>(
      `SELECT id, public_code, title, severity, status, affected_service,
              affected_functionality, symptoms, probable_cause, cause_confidence,
              evidence, related_alert_ids, assigned_user_id, resolution,
              post_incident_notes, detected_at::text, acknowledged_at::text,
              resolved_at::text, closed_at::text, engine_version,
              created_at::text, updated_at::text
       FROM monitoring_incidents
       ORDER BY detected_at DESC
       LIMIT $1`,
      [opts.limit]
    );
  }

  countOpenIncidents() {
    return query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM monitoring_incidents
       WHERE status NOT IN ('resolved', 'closed')`
    );
  }

  getIncidentById(id: string) {
    return query<MonitoringIncidentRow>(
      `SELECT id, public_code, title, severity, status, affected_service,
              affected_functionality, symptoms, probable_cause, cause_confidence,
              evidence, related_alert_ids, assigned_user_id, resolution,
              post_incident_notes, detected_at::text, acknowledged_at::text,
              resolved_at::text, closed_at::text, engine_version,
              created_at::text, updated_at::text
       FROM monitoring_incidents
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
  }

  findOpenIncidentByServiceTitle(serviceCode: string, title: string) {
    return query<MonitoringIncidentRow>(
      `SELECT id, public_code, title, severity, status, affected_service,
              affected_functionality, symptoms, probable_cause, cause_confidence,
              evidence, related_alert_ids, assigned_user_id, resolution,
              post_incident_notes, detected_at::text, acknowledged_at::text,
              resolved_at::text, closed_at::text, engine_version,
              created_at::text, updated_at::text
       FROM monitoring_incidents
       WHERE affected_service = $1
         AND title = $2
         AND status NOT IN ('resolved', 'closed')
       ORDER BY detected_at DESC
       LIMIT 1`,
      [serviceCode, title]
    );
  }

  insertIncident(input: {
    publicCode: string;
    title: string;
    severity: string;
    affectedService: string | null;
    symptoms: string | null;
    evidence: unknown[];
  }) {
    return query<MonitoringIncidentRow>(
      `INSERT INTO monitoring_incidents
         (public_code, title, severity, status, affected_service, symptoms, evidence, engine_version)
       VALUES ($1, $2, $3, 'detected', $4, $5, $6::jsonb, $7)
       RETURNING id, public_code, title, severity, status, affected_service,
                 affected_functionality, symptoms, probable_cause, cause_confidence,
                 evidence, related_alert_ids, assigned_user_id, resolution,
                 post_incident_notes, detected_at::text, acknowledged_at::text,
                 resolved_at::text, closed_at::text, engine_version,
                 created_at::text, updated_at::text`,
      [
        input.publicCode,
        input.title,
        input.severity,
        input.affectedService,
        input.symptoms,
        JSON.stringify(input.evidence ?? []),
        MONITORING_ENGINE_VERSION,
      ]
    );
  }

  insertIncidentEvent(input: {
    incidentId: string;
    eventType: string;
    message: string;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO monitoring_incident_events
         (incident_id, event_type, message, actor_user_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id`,
      [
        input.incidentId,
        input.eventType,
        input.message,
        input.actorUserId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
  }

  updateIncidentStatus(input: {
    id: string;
    status: string;
    resolution?: string | null;
    acknowledgedAt?: boolean;
    resolvedAt?: boolean;
    closedAt?: boolean;
  }) {
    return query<MonitoringIncidentRow>(
      `UPDATE monitoring_incidents SET
         status = $2,
         resolution = COALESCE($3, resolution),
         acknowledged_at = CASE WHEN $4 THEN COALESCE(acknowledged_at, NOW()) ELSE acknowledged_at END,
         resolved_at = CASE WHEN $5 THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END,
         closed_at = CASE WHEN $6 THEN COALESCE(closed_at, NOW()) ELSE closed_at END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, public_code, title, severity, status, affected_service,
                 affected_functionality, symptoms, probable_cause, cause_confidence,
                 evidence, related_alert_ids, assigned_user_id, resolution,
                 post_incident_notes, detected_at::text, acknowledged_at::text,
                 resolved_at::text, closed_at::text, engine_version,
                 created_at::text, updated_at::text`,
      [
        input.id,
        input.status,
        input.resolution ?? null,
        input.acknowledgedAt === true,
        input.resolvedAt === true,
        input.closedAt === true,
      ]
    );
  }

  listAnomalies(limit: number) {
    return query<MonitoringAnomalyRow>(
      `SELECT id, metric_key, service_code, severity, detector,
              observed_value::text, baseline_value::text, score::text,
              message, incident_id, dedupe_key, created_at::text
       FROM monitoring_anomaly_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  latestAnomalyByDedupe(dedupeKey: string) {
    return query<MonitoringAnomalyRow>(
      `SELECT id, metric_key, service_code, severity, detector,
              observed_value::text, baseline_value::text, score::text,
              message, incident_id, dedupe_key, created_at::text
       FROM monitoring_anomaly_events
       WHERE dedupe_key = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [dedupeKey]
    );
  }

  insertAnomaly(input: {
    metricKey: string;
    serviceCode: string | null;
    severity: string;
    detector: string;
    observedValue?: number | null;
    baselineValue?: number | null;
    score?: number | null;
    message: string;
    incidentId?: string | null;
    dedupeKey?: string | null;
  }) {
    return query<MonitoringAnomalyRow>(
      `INSERT INTO monitoring_anomaly_events
         (metric_key, service_code, severity, detector, observed_value,
          baseline_value, score, message, incident_id, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, metric_key, service_code, severity, detector,
                 observed_value::text, baseline_value::text, score::text,
                 message, incident_id, dedupe_key, created_at::text`,
      [
        input.metricKey,
        input.serviceCode,
        input.severity,
        input.detector,
        input.observedValue ?? null,
        input.baselineValue ?? null,
        input.score ?? null,
        input.message,
        input.incidentId ?? null,
        input.dedupeKey ?? null,
      ]
    );
  }

  insertEngineRun(input: {
    phase: string;
    status: string;
    overallState: string | null;
    subsystemStatuses: Record<string, unknown>;
    attention: unknown[];
    error?: string | null;
    startedAt?: string;
  }) {
    return query<MonitoringEngineRunRow>(
      `INSERT INTO monitoring_engine_runs
         (phase, status, engine_version, overall_state, subsystem_statuses, attention, error, started_at, finished_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, COALESCE($8::timestamptz, NOW()), NOW())
       RETURNING id, phase, status, engine_version, overall_state, subsystem_statuses,
                 attention, error, started_at::text, finished_at::text`,
      [
        input.phase,
        input.status,
        MONITORING_ENGINE_VERSION,
        input.overallState,
        JSON.stringify(input.subsystemStatuses ?? {}),
        JSON.stringify(input.attention ?? []),
        input.error ?? null,
        input.startedAt ?? null,
      ]
    );
  }

  latestEngineRun() {
    return query<MonitoringEngineRunRow>(
      `SELECT id, phase, status, engine_version, overall_state, subsystem_statuses,
              attention, error, started_at::text, finished_at::text
       FROM monitoring_engine_runs
       ORDER BY started_at DESC
       LIMIT 1`
    );
  }

  appendAudit(input: {
    action: string;
    actorUserId?: string | null;
    actorRole?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO monitoring_audit_logs
         (action, actor_user_id, actor_role, resource_type, resource_id, reason, metadata, engine_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING id`,
      [
        input.action,
        input.actorUserId ?? null,
        input.actorRole ?? null,
        input.resourceType ?? null,
        input.resourceId ?? null,
        input.reason ?? null,
        JSON.stringify(input.metadata ?? {}),
        MONITORING_ENGINE_VERSION,
      ]
    );
  }
}
