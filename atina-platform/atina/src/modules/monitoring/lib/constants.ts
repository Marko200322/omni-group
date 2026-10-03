/** Omni Monitoring & Intelligence Engine — shared constants (observability only). */

export const MONITORING_ENGINE_VERSION = '1.0.0' as const;

export const SEVERITIES = ['info', 'warning', 'high', 'critical'] as const;
export type MonitoringSeverity = (typeof SEVERITIES)[number];

export const HEALTH_STATUSES = [
  'healthy',
  'warning',
  'critical',
  'unavailable',
  'unknown',
] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const OVERALL_STATES = [
  'OPERATIONAL',
  'OPERATIONAL_WITH_WARNING',
  'DEGRADED',
  'CRITICAL',
  'MONITORING_DEGRADED',
] as const;
export type OverallState = (typeof OVERALL_STATES)[number];

/** Seed service codes from migration 045_monitoring_engine.sql */
export const SUBSYSTEM_CODES = [
  'api',
  'database',
  'redis',
  'web',
  'payments',
  'email',
  'omi',
  'queues',
  'reinvestment',
  'monitoring',
] as const;
export type SubsystemCode = (typeof SUBSYSTEM_CODES)[number];

/** Alias used in health-score when referring to self-check. */
export const MONITORING_SELF_CODE = 'monitoring' as const;

export const INCIDENT_STATUSES = [
  'detected',
  'acknowledged',
  'investigating',
  'mitigating',
  'monitoring',
  'resolved',
  'closed',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const ANOMALY_DETECTORS = ['threshold', 'baseline', 'trend', 'correlation'] as const;
export type AnomalyDetector = (typeof ANOMALY_DETECTORS)[number];

export const DEFAULT_ALERT_COOLDOWN_SEC = 300;
