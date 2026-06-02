export const ONBOARDING_FEED_EVENT_TYPES = new Set([
  'auth_register_bootstrap',
  'auth_first_login_bootstrap',
  'auth_register_bootstrap_failed',
  'auth_first_login_bootstrap_failed',
  'admin_onboarding_bootstrap_retry_all_strict_blocked',
  'admin_onboarding_bootstrap_retry',
  'admin_onboarding_bootstrap_retry_failed',
  'admin_onboarding_bootstrap_retry_all_user',
]);

export const UUID_PARAM_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const ONBOARDING_NAME_PREFIX_MAX = 200;
export const RETRY_ALL_IDEMPOTENCY_KEY_MAX = 200;

export type TemplateMetricRow = {
  template_key: string;
  total_runs: string;
  completed_runs: string;
  failed_runs: string;
  last_run_at: string | null;
};

export type TemplateExecutionMetric = {
  templateKey: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  lastRunAt: string | null;
  successRate: number;
};

export type TemplateExecutionAggregateInput = Pick<
  TemplateExecutionMetric,
  'templateKey' | 'totalRuns' | 'completedRuns' | 'failedRuns' | 'successRate'
>;

export type TrendDirection = 'worsening' | 'improving' | 'stable' | 'unknown';

export type AlertSeveritySummary = {
  highCount: number;
  mediumCount: number;
  lowCount: number;
};

export type WorkflowAlertTemplate = {
  templateKey: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  successRate: number;
  threshold: number;
  gapToThreshold: number;
  trendDirection: TrendDirection;
  severity: 'low' | 'medium' | 'high';
  alert: boolean;
};

export const MONITORING_CONTRACT_VERSION = '2026-04-ops-v1';

export const toAlertSeveritySummary = (
  alerts: Array<{ severity: 'low' | 'medium' | 'high' }>
): AlertSeveritySummary =>
  alerts.reduce(
    (acc, item) => {
      if (item.severity === 'high') acc.highCount += 1;
      else if (item.severity === 'medium') acc.mediumCount += 1;
      else acc.lowCount += 1;
      return acc;
    },
    { highCount: 0, mediumCount: 0, lowCount: 0 }
  );

export const toTemplateExecutionMetric = (row: TemplateMetricRow): TemplateExecutionMetric => {
  const totalRuns = parseInt(row.total_runs, 10);
  const completedRuns = parseInt(row.completed_runs, 10);
  const failedRuns = parseInt(row.failed_runs, 10);
  return {
    templateKey: row.template_key,
    totalRuns,
    completedRuns,
    failedRuns,
    lastRunAt: row.last_run_at,
    successRate: totalRuns > 0 ? Number(((completedRuns / totalRuns) * 100).toFixed(2)) : 0,
  };
};

export const summarizeTemplateExecutions = (templates: TemplateExecutionAggregateInput[]) => {
  const aggregate = templates.reduce(
    (acc, row) => {
      acc.totalRuns += row.totalRuns;
      acc.completedRuns += row.completedRuns;
      acc.failedRuns += row.failedRuns;
      return acc;
    },
    { totalRuns: 0, completedRuns: 0, failedRuns: 0 }
  );
  const successRate =
    aggregate.totalRuns > 0
      ? Number(((aggregate.completedRuns / aggregate.totalRuns) * 100).toFixed(2))
      : 0;
  return {
    totalTemplates: templates.length,
    ...aggregate,
    successRate,
  };
};

export const deriveSeverityFromGap = (gap: number): 'low' | 'medium' | 'high' => {
  if (gap >= 30) return 'high';
  if (gap >= 15) return 'medium';
  return 'low';
};

export const adjustSeverityByTrend = (
  severity: 'low' | 'medium' | 'high',
  trendDirection: TrendDirection
): 'low' | 'medium' | 'high' => {
  if (trendDirection === 'worsening') {
    if (severity === 'low') return 'medium';
    if (severity === 'medium') return 'high';
    return 'high';
  }
  if (trendDirection === 'improving') {
    if (severity === 'high') return 'medium';
    if (severity === 'medium') return 'low';
    return 'low';
  }
  return severity;
};

export const getTrendDirection = (
  currentSuccessRate: number | null,
  previousSuccessRate: number | null
): TrendDirection => {
  if (currentSuccessRate === null || previousSuccessRate === null) return 'unknown';
  const delta = Number((currentSuccessRate - previousSuccessRate).toFixed(2));
  if (delta >= 1) return 'improving';
  if (delta <= -1) return 'worsening';
  return 'stable';
};

export const isCriticalTemplateAlert = (item: {
  successRate: number;
  threshold: number;
  gapToThreshold: number;
}): boolean => item.successRate < 50 || (item.gapToThreshold >= 25 && item.threshold >= 80);

export const summarizeWorkflowAlertTotals = (alerts: WorkflowAlertTemplate[]) =>
  summarizeTemplateExecutions(
    alerts.map((item) => ({
      templateKey: item.templateKey,
      totalRuns: item.totalRuns,
      completedRuns: item.completedRuns,
      failedRuns: item.failedRuns,
      successRate: item.successRate,
    }))
  );

export const deriveAlertConsistency = (
  alerts: WorkflowAlertTemplate[],
  totalTemplatesEvaluated: number,
  hasCriticalAlerts: boolean
) => {
  const severityCounts = toAlertSeveritySummary(alerts);
  const totals = summarizeWorkflowAlertTotals(alerts);
  const templatesBySeverity = alerts.reduce(
    (acc, item) => {
      if (item.severity === 'high') acc.high += 1;
      else if (item.severity === 'medium') acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
  const alertRate =
    totalTemplatesEvaluated > 0
      ? Number(((alerts.length / totalTemplatesEvaluated) * 100).toFixed(2))
      : 0;
  const expectedCritical = alerts.some((item) =>
    isCriticalTemplateAlert({
      successRate: item.successRate,
      threshold: item.threshold,
      gapToThreshold: item.gapToThreshold,
    })
  );
  return {
    alertRate,
    severityCounts,
    totals,
    checks: {
      severityCountsMatchTemplates:
        severityCounts.highCount === templatesBySeverity.high &&
        severityCounts.mediumCount === templatesBySeverity.medium &&
        severityCounts.lowCount === templatesBySeverity.low,
      totalsMatchTemplates:
        totals.totalTemplates === alerts.length &&
        totals.totalRuns === alerts.reduce((sum, item) => sum + item.totalRuns, 0) &&
        totals.completedRuns === alerts.reduce((sum, item) => sum + item.completedRuns, 0) &&
        totals.failedRuns === alerts.reduce((sum, item) => sum + item.failedRuns, 0),
      alertRateMatchesCounts:
        alertRate ===
        (totalTemplatesEvaluated > 0
          ? Number(((alerts.length / totalTemplatesEvaluated) * 100).toFixed(2))
          : 0),
      criticalFlagMatchesTemplates: hasCriticalAlerts === expectedCritical,
    },
  };
};

export const summarizePhaseGating = (
  gating: Array<{ moduleSlug: string; requiredPhase: string; unlocked: boolean }>,
  phaseOrder: readonly string[]
) => {
  const perPhase = new Map<
    string,
    { phase: string; totalModules: number; unlockedModules: number; lockedModules: number }
  >(
    phaseOrder.map((phase) => [
      phase,
      { phase, totalModules: 0, unlockedModules: 0, lockedModules: 0 },
    ])
  );

  for (const item of gating) {
    const bucket = perPhase.get(item.requiredPhase) ?? {
      phase: item.requiredPhase,
      totalModules: 0,
      unlockedModules: 0,
      lockedModules: 0,
    };
    bucket.totalModules += 1;
    if (item.unlocked) bucket.unlockedModules += 1;
    else bucket.lockedModules += 1;
    perPhase.set(item.requiredPhase, bucket);
  }

  const byPhase = Array.from(perPhase.values());
  const unlockedModules = byPhase.reduce((sum, row) => sum + row.unlockedModules, 0);
  const lockedModules = byPhase.reduce((sum, row) => sum + row.lockedModules, 0);
  const totalModules = byPhase.reduce((sum, row) => sum + row.totalModules, 0);

  return {
    counts: {
      totalModules,
      unlockedModules,
      lockedModules,
    },
    totalModules,
    unlockedModules,
    lockedModules,
    byPhase,
  };
};
