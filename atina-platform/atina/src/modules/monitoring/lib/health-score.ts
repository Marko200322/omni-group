import {
  MONITORING_SELF_CODE,
  type HealthStatus,
  type OverallState,
} from './constants';

export type SubsystemStatusInput = {
  code: string;
  status: HealthStatus;
  message?: string;
  isCritical?: boolean;
};

export type OverallStateResult = {
  state: OverallState;
  reasons: string[];
  healthyClaimAllowed: boolean;
};

/**
 * Compute roll-up platform state from subsystem probe statuses.
 * Every outcome must be explainable via reasons[].
 * If monitoring_self (`monitoring`) is unavailable → NEVER claim Everything healthy.
 */
export function computeOverallState(
  subsystemStatuses: SubsystemStatusInput[]
): OverallStateResult {
  const reasons: string[] = [];
  const byCode = new Map(subsystemStatuses.map((s) => [s.code, s]));
  const monitoringSelf = byCode.get(MONITORING_SELF_CODE);

  if (!monitoringSelf || monitoringSelf.status === 'unavailable' || monitoringSelf.status === 'unknown') {
    reasons.push(
      monitoringSelf
        ? `monitoring_self_${monitoringSelf.status}`
        : 'monitoring_self_missing'
    );
    reasons.push('cannot_claim_everything_healthy');
    return {
      state: 'MONITORING_DEGRADED',
      reasons,
      healthyClaimAllowed: false,
    };
  }

  if (monitoringSelf.status === 'critical') {
    reasons.push('monitoring_self_critical');
    reasons.push('cannot_claim_everything_healthy');
    return {
      state: 'MONITORING_DEGRADED',
      reasons,
      healthyClaimAllowed: false,
    };
  }

  const criticals = subsystemStatuses.filter((s) => s.status === 'critical');
  const warnings = subsystemStatuses.filter((s) => s.status === 'warning');
  const unavailables = subsystemStatuses.filter(
    (s) => s.status === 'unavailable' || s.status === 'unknown'
  );

  for (const c of criticals) {
    reasons.push(`subsystem_critical:${c.code}${c.message ? `:${c.message}` : ''}`);
  }
  for (const u of unavailables) {
    reasons.push(`subsystem_unavailable:${u.code}${u.message ? `:${u.message}` : ''}`);
  }
  for (const w of warnings) {
    reasons.push(`subsystem_warning:${w.code}${w.message ? `:${w.message}` : ''}`);
  }

  if (monitoringSelf.status === 'warning') {
    reasons.push('monitoring_self_warning');
  }

  const criticalCritical = criticals.some((s) => s.isCritical !== false && s.code !== MONITORING_SELF_CODE);
  const anyCritical = criticals.length > 0;
  const anyUnavailableCritical = unavailables.some((s) => s.isCritical);

  if (anyCritical && criticalCritical) {
    if (reasons.length === 0) reasons.push('critical_subsystem_failure');
    return { state: 'CRITICAL', reasons, healthyClaimAllowed: false };
  }

  if (anyCritical || anyUnavailableCritical) {
    if (reasons.length === 0) reasons.push('degraded_or_critical_probe');
    return { state: 'DEGRADED', reasons, healthyClaimAllowed: false };
  }

  if (unavailables.length > 0) {
    if (reasons.length === 0) reasons.push('one_or_more_subsystems_unavailable');
    return { state: 'DEGRADED', reasons, healthyClaimAllowed: false };
  }

  if (warnings.length > 0 || monitoringSelf.status === 'warning') {
    if (reasons.length === 0) reasons.push('warnings_present');
    return { state: 'OPERATIONAL_WITH_WARNING', reasons, healthyClaimAllowed: false };
  }

  reasons.push('all_probed_subsystems_healthy');
  return { state: 'OPERATIONAL', reasons, healthyClaimAllowed: true };
}
