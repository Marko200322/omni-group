import { query } from '../../../database/connection';
import type { TemplateMetricRow } from '../admin.helpers';

export type OnboardingSummaryRow = {
  total: string;
  success: string;
  failed: string;
  blocked: string;
  created: string;
  updated: string;
  skipped: string;
  strict_blocked_admin: string;
  admin_retry: string;
  admin_retry_failed: string;
  admin_retry_all_user: string;
};

export class AdminRepository {
  fetchOverviewUsersCount() {
    return query<{ count: string; active: string }>(
      `SELECT COUNT(*) AS count,
              SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active
       FROM users`
    );
  }

  fetchOverviewSubscriptionsCount() {
    return query<{ count: string; active: string }>(
      `SELECT COUNT(*) AS count,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active
       FROM subscriptions`
    );
  }

  fetchOverviewPaymentsCount() {
    return query<{ count: string; total_revenue: string }>(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS total_revenue
       FROM payments WHERE status = 'completed'`
    );
  }

  fetchOverviewTasksCount() {
    return query<{ count: string; failed: string }>(
      `SELECT COUNT(*) AS count,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM tasks`
    );
  }

  fetchOverviewLogs24hCount() {
    return query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM logs WHERE created_at >= NOW() - INTERVAL '24 hours'`
    );
  }

  fetchOverviewWorkflowTemplates30d() {
    return query<TemplateMetricRow>(
      `SELECT
         COALESCE(t.payload->>'templateKey', 'manual') AS template_key,
         COUNT(*)::text AS total_runs,
         COUNT(*) FILTER (WHERE t.status = 'completed')::text AS completed_runs,
         COUNT(*) FILTER (WHERE t.status = 'failed')::text AS failed_runs
       FROM tasks t
       WHERE t.type = 'workflow_chain_execution'
         AND t.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY COALESCE(t.payload->>'templateKey', 'manual')
       ORDER BY COUNT(*) DESC, template_key ASC
       LIMIT 10`
    );
  }

  fetchOverviewWorkflowTrend7d() {
    return query<{
      run_date: string;
      total_runs: string;
      completed_runs: string;
      failed_runs: string;
    }>(
      `SELECT
         DATE(t.created_at)::text AS run_date,
         COUNT(*)::text AS total_runs,
         COUNT(*) FILTER (WHERE t.status = 'completed')::text AS completed_runs,
         COUNT(*) FILTER (WHERE t.status = 'failed')::text AS failed_runs
       FROM tasks t
       WHERE t.type = 'workflow_chain_execution'
         AND t.created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(t.created_at)
       ORDER BY DATE(t.created_at) ASC`
    );
  }

  fetchOverviewWorkflowTrendByKey7d() {
    return query<{
      template_key: string;
      run_date: string;
      total_runs: string;
      completed_runs: string;
      failed_runs: string;
    }>(
      `SELECT
         COALESCE(t.payload->>'templateKey', 'manual') AS template_key,
         DATE(t.created_at)::text AS run_date,
         COUNT(*)::text AS total_runs,
         COUNT(*) FILTER (WHERE t.status = 'completed')::text AS completed_runs,
         COUNT(*) FILTER (WHERE t.status = 'failed')::text AS failed_runs
       FROM tasks t
       WHERE t.type = 'workflow_chain_execution'
         AND t.created_at >= NOW() - INTERVAL '7 days'
       GROUP BY COALESCE(t.payload->>'templateKey', 'manual'), DATE(t.created_at)
       ORDER BY template_key ASC, DATE(t.created_at) ASC`
    );
  }

  fetchOverviewForgeBudgetBurn() {
    return query<{ total_budget_allocated: string; total_spent: string }>(
      `SELECT
         COALESCE(SUM(es.budget_allocated), 0)::text AS total_budget_allocated,
         COALESCE(SUM((er.output_payload->>'forge_cost_rsd')::numeric), 0)::text AS total_spent
       FROM ecosystem_systems es
       LEFT JOIN ecosystem_runs er
         ON er.ecosystem_system_id = es.id
         AND er.run_type LIKE 'forge_%'
         AND er.status = 'completed'
       WHERE es.system_slug = 'forge'`
    );
  }

  fetchOverviewForgeTopProvider() {
    return query<{ provider: string | null; runs: string }>(
      `SELECT
         NULLIF(TRIM(er.output_payload->>'provider'), '') AS provider,
         COUNT(*)::text AS runs
       FROM ecosystem_runs er
       INNER JOIN ecosystem_systems es ON es.id = er.ecosystem_system_id
       WHERE es.system_slug = 'forge'
         AND er.run_type LIKE 'forge_%'
         AND er.status = 'completed'
         AND er.created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY NULLIF(TRIM(er.output_payload->>'provider'), '')
       ORDER BY COUNT(*) DESC, provider ASC NULLS LAST
       LIMIT 1`
    );
  }

  fetchOverviewForgeRuns24h() {
    return query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM ecosystem_runs er
       INNER JOIN ecosystem_systems es ON es.id = er.ecosystem_system_id
       WHERE es.system_slug = 'forge'
         AND er.run_type LIKE 'forge_%'
         AND er.status = 'completed'
         AND er.created_at >= NOW() - INTERVAL '24 hours'`
    );
  }

  fetchOverviewStats() {
    return Promise.all([
      this.fetchOverviewUsersCount(),
      this.fetchOverviewSubscriptionsCount(),
      this.fetchOverviewPaymentsCount(),
      this.fetchOverviewTasksCount(),
      this.fetchOverviewLogs24hCount(),
      this.fetchOverviewWorkflowTemplates30d(),
      this.fetchOverviewWorkflowTrend7d(),
      this.fetchOverviewWorkflowTrendByKey7d(),
      this.fetchOverviewForgeBudgetBurn(),
      this.fetchOverviewForgeTopProvider(),
      this.fetchOverviewForgeRuns24h(),
    ]);
  }

  countUsers(where: string, values: unknown[]) {
    return query<{ count: string }>(`SELECT COUNT(*) FROM users u ${where}`, values);
  }

  listUsers(where: string, values: unknown[], limit: number, offset: number, limitIdx: number) {
    return query(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.is_email_verified,
              u.last_login_at, u.created_at, p.name AS plan_name, p.slug AS plan_slug
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       ${where}
       ORDER BY u.created_at DESC LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      [...values, limit, offset]
    );
  }

  updateUser(fieldsSql: string, values: unknown[]) {
    return query(
      `UPDATE users SET ${fieldsSql}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, email, name, role, is_active`,
      values
    );
  }

  getPlanIdBySlug(slug: string) {
    return query<{ id: string; slug: string }>(
      `SELECT id, slug FROM plans WHERE slug = $1 AND is_active = true LIMIT 1`,
      [slug]
    );
  }

  countPayments(where: string, values: unknown[]) {
    return query<{ count: string }>(`SELECT COUNT(*) FROM payments p ${where}`, values);
  }

  listPayments(where: string, values: unknown[], limit: number, offset: number, limitIdx: number) {
    return query(
      `SELECT p.*, u.email, u.name AS user_name
       FROM payments p
       JOIN users u ON p.user_id = u.id
       ${where}
       ORDER BY p.created_at DESC LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      [...values, limit, offset]
    );
  }

  listModules() {
    return query('SELECT * FROM modules ORDER BY is_core DESC, name');
  }

  updateModule(fieldsSql: string, values: unknown[]) {
    return query(
      `UPDATE modules SET ${fieldsSql}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
  }

  countPhaseGatingTimeline() {
    return query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_events WHERE event_type = 'phase_launch_updated'`
    );
  }

  listPhaseGatingTimeline(limit: number, offset: number) {
    return query(
      `SELECT ae.id, ae.actor_user_id, ae.payload, ae.created_at,
              u.email AS actor_email, u.name AS actor_name
       FROM audit_events ae
       LEFT JOIN users u ON u.id = ae.actor_user_id
       WHERE ae.event_type = 'phase_launch_updated'
       ORDER BY ae.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  }

  fetchWorkflowTemplateExecutionStats(
    daysNum: number,
    templateFilterSql: string,
    baseParams: unknown[]
  ) {
    return query<TemplateMetricRow>(
      `SELECT
         COALESCE(t.payload->>'templateKey', 'manual') AS template_key,
         COUNT(*)::text AS total_runs,
         COUNT(*) FILTER (WHERE t.status = 'completed')::text AS completed_runs,
         COUNT(*) FILTER (WHERE t.status = 'failed')::text AS failed_runs,
         MAX(t.created_at)::text AS last_run_at
       FROM tasks t
       WHERE t.type = 'workflow_chain_execution'
         AND t.created_at >= NOW() - ($1::text || ' days')::interval
         ${templateFilterSql}
       GROUP BY COALESCE(t.payload->>'templateKey', 'manual')
       ORDER BY COUNT(*) DESC, template_key ASC`,
      baseParams
    );
  }

  fetchWorkflowTemplateExecutionTrend(
    daysNum: number,
    templateFilterSql: string,
    baseParams: unknown[]
  ) {
    return query<{
      template_key: string;
      period_bucket: string;
      total_runs: string;
      completed_runs: string;
    }>(
      `SELECT
         COALESCE(t.payload->>'templateKey', 'manual') AS template_key,
         CASE
           WHEN t.created_at >= NOW() - ($1::text || ' days')::interval THEN 'current'
           ELSE 'previous'
         END AS period_bucket,
         COUNT(*)::text AS total_runs,
         COUNT(*) FILTER (WHERE t.status = 'completed')::text AS completed_runs
       FROM tasks t
       WHERE t.type = 'workflow_chain_execution'
         AND t.created_at >= NOW() - ($1::text || ' days')::interval * 2
         ${templateFilterSql}
       GROUP BY COALESCE(t.payload->>'templateKey', 'manual'), period_bucket`,
      baseParams
    );
  }

  countLogs(where: string, values: unknown[]) {
    return query<{ count: string }>(`SELECT COUNT(*) FROM logs ${where}`, values);
  }

  listLogs(where: string, values: unknown[], limit: number, offset: number, limitIdx: number) {
    return query(
      `SELECT * FROM logs ${where}
       ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      [...values, limit, offset]
    );
  }

  insertLog(userId: string, level: string, category: string, message: string, contextJson: string) {
    return query(
      `INSERT INTO logs (user_id, level, category, message, context)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, level, category, message, contextJson]
    );
  }

  listPlans() {
    return query('SELECT * FROM plans ORDER BY sort_order');
  }

  updatePlan(fieldsSql: string, values: unknown[]) {
    return query(
      `UPDATE plans SET ${fieldsSql}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
  }

  pingDatabase() {
    return query('SELECT 1');
  }

  fetchOnboardingGlobalSummary() {
    const onboardingEventTypesAll = `(
      'auth_register_bootstrap','auth_first_login_bootstrap',
      'auth_register_bootstrap_failed','auth_first_login_bootstrap_failed',
      'admin_onboarding_bootstrap_retry_all_strict_blocked',
      'admin_onboarding_bootstrap_retry','admin_onboarding_bootstrap_retry_failed',
      'admin_onboarding_bootstrap_retry_all_user'
    )`;
    return query<OnboardingSummaryRow>(
      `SELECT
         COUNT(*) FILTER (
           WHERE event_type IN ${onboardingEventTypesAll}
         ) AS total,
         COUNT(*) FILTER (
           WHERE event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
         ) AS success,
         COUNT(*) FILTER (
           WHERE event_type IN ('auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')
         ) AS failed,
         COALESCE(SUM(CASE
           WHEN event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
           THEN COALESCE((payload->'totals'->>'blocked')::int, 0)
           ELSE 0 END), 0) AS blocked,
         COALESCE(SUM(CASE
           WHEN event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
           THEN COALESCE((payload->'totals'->>'created')::int, 0)
           ELSE 0 END), 0) AS created,
         COALESCE(SUM(CASE
           WHEN event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
           THEN COALESCE((payload->'totals'->>'updated')::int, 0)
           ELSE 0 END), 0) AS updated,
         COALESCE(SUM(CASE
           WHEN event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
           THEN COALESCE((payload->'totals'->>'skipped')::int, 0)
           ELSE 0 END), 0) AS skipped,
         COUNT(*) FILTER (
           WHERE event_type = 'admin_onboarding_bootstrap_retry_all_strict_blocked'
         ) AS strict_blocked_admin,
         COUNT(*) FILTER (
           WHERE event_type = 'admin_onboarding_bootstrap_retry'
         ) AS admin_retry,
         COUNT(*) FILTER (
           WHERE event_type = 'admin_onboarding_bootstrap_retry_failed'
         ) AS admin_retry_failed,
         COUNT(*) FILTER (
           WHERE event_type = 'admin_onboarding_bootstrap_retry_all_user'
         ) AS admin_retry_all_user
       FROM audit_events`
    );
  }

  fetchOnboardingFilteredSummary(filteredSummarySql: string, filterParams: unknown[]) {
    return query<OnboardingSummaryRow>(filteredSummarySql, filterParams);
  }

  countOnboardingFeed(feedTypeWhere: string, feedFilterClause: string, filterParams: unknown[]) {
    return query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM audit_events ae
       ${feedTypeWhere}
       ${feedFilterClause}`,
      filterParams
    );
  }

  listOnboardingFeed(
    feedTypeWhere: string,
    feedFilterClause: string,
    sortSql: string,
    filterParams: unknown[],
    limit: number,
    offset: number,
    limitParam: number,
    offsetParam: number
  ) {
    return query(
      `SELECT ae.id, ae.actor_user_id, ae.event_type, ae.payload, ae.created_at,
              ae.entity_type, ae.entity_id, ae.severity,
              u.email, u.name,
              tu.email AS target_email, tu.name AS target_name
       FROM audit_events ae
       LEFT JOIN users u ON u.id = ae.actor_user_id
       LEFT JOIN users tu ON ae.entity_type = 'user' AND tu.id::text = ae.entity_id
       ${feedTypeWhere}
       ${feedFilterClause}
       ORDER BY ae.created_at ${sortSql}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterParams, limit, offset]
    );
  }

  fetchUserById(userId: string) {
    return query<{ id: string; email: string; name: string; role: string; created_at: Date }>(
      `SELECT id, email, name, role, created_at FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
  }

  fetchUserBasicById(userId: string) {
    return query<{ id: string; email: string; name: string }>(
      `SELECT id, email, name FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
  }

  fetchOnboardingUserSummary(userTimeClause: string, eventParams: unknown[]) {
    return query<{
      total: string;
      success: string;
      failed: string;
      blocked: string;
      created: string;
      updated: string;
      skipped: string;
    }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (
           WHERE event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
         ) AS success,
         COUNT(*) FILTER (
           WHERE event_type IN ('auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')
         ) AS failed,
         COALESCE(SUM(CASE
           WHEN event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
           THEN COALESCE((payload->'totals'->>'blocked')::int, 0)
           ELSE 0 END), 0) AS blocked,
         COALESCE(SUM(CASE
           WHEN event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
           THEN COALESCE((payload->'totals'->>'created')::int, 0)
           ELSE 0 END), 0) AS created,
         COALESCE(SUM(CASE
           WHEN event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
           THEN COALESCE((payload->'totals'->>'updated')::int, 0)
           ELSE 0 END), 0) AS updated,
         COALESCE(SUM(CASE
           WHEN event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
           THEN COALESCE((payload->'totals'->>'skipped')::int, 0)
           ELSE 0 END), 0) AS skipped
       FROM audit_events
       WHERE actor_user_id = $1
         AND event_type IN
           ('auth_register_bootstrap','auth_first_login_bootstrap','auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')
         ${userTimeClause}`,
      eventParams
    );
  }

  countOnboardingUserEvents(userTimeClause: string, eventParams: unknown[]) {
    return query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM audit_events
       WHERE actor_user_id = $1
         AND event_type IN
           ('auth_register_bootstrap','auth_first_login_bootstrap','auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')
         ${userTimeClause}`,
      eventParams
    );
  }

  listOnboardingUserEvents(
    userTimeClause: string,
    sortSql: string,
    eventParams: unknown[],
    limit: number,
    offset: number,
    listLimitParam: number,
    listOffsetParam: number
  ) {
    return query(
      `SELECT id, actor_user_id, event_type, payload, created_at
       FROM audit_events
       WHERE actor_user_id = $1
         AND event_type IN
           ('auth_register_bootstrap','auth_first_login_bootstrap','auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')
         ${userTimeClause}
       ORDER BY created_at ${sortSql}
       LIMIT $${listLimitParam} OFFSET $${listOffsetParam}`,
      [...eventParams, limit, offset]
    );
  }

  countOnboardingAdminActions(userTimeClause: string, eventParams: unknown[]) {
    return query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM audit_events
       WHERE entity_type = 'user'
         AND entity_id = $1
         AND event_type IN ('admin_onboarding_bootstrap_retry','admin_onboarding_bootstrap_retry_failed','admin_onboarding_bootstrap_retry_all_user')
         ${userTimeClause}`,
      eventParams
    );
  }

  listOnboardingAdminActions(
    adminTimeClauseAe: string,
    sortSql: string,
    eventParams: unknown[],
    limit: number,
    offset: number,
    adminListLimitParam: number,
    adminListOffsetParam: number
  ) {
    return query(
      `SELECT ae.id, ae.actor_user_id, ae.event_type, ae.payload, ae.severity, ae.created_at,
              u.email AS admin_email, u.name AS admin_name
       FROM audit_events ae
       LEFT JOIN users u ON u.id = ae.actor_user_id
       WHERE ae.entity_type = 'user'
         AND ae.entity_id = $1
         AND ae.event_type IN
           ('admin_onboarding_bootstrap_retry','admin_onboarding_bootstrap_retry_failed','admin_onboarding_bootstrap_retry_all_user')
         ${adminTimeClauseAe}
       ORDER BY ae.created_at ${sortSql}
       LIMIT $${adminListLimitParam} OFFSET $${adminListOffsetParam}`,
      [...eventParams, limit, offset]
    );
  }

  fetchOnboardingAdminActionsSummary(userTimeClause: string, eventParams: unknown[]) {
    return query<{
      retry: string;
      retry_failed: string;
      retry_all_user: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'admin_onboarding_bootstrap_retry') AS retry,
         COUNT(*) FILTER (WHERE event_type = 'admin_onboarding_bootstrap_retry_failed') AS retry_failed,
         COUNT(*) FILTER (WHERE event_type = 'admin_onboarding_bootstrap_retry_all_user') AS retry_all_user
       FROM audit_events
       WHERE entity_type = 'user'
         AND entity_id = $1
         AND event_type IN
           ('admin_onboarding_bootstrap_retry','admin_onboarding_bootstrap_retry_failed','admin_onboarding_bootstrap_retry_all_user')
         ${userTimeClause}`,
      eventParams
    );
  }

  insertAuditEvent(
    actorUserId: string,
    eventType: string,
    entityType: string,
    entityId: string,
    severity: string,
    payloadJson: string
  ) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorUserId, eventType, entityType, entityId, severity, payloadJson]
    );
  }

  findRetryAllByIdempotencyKey(actorUserId: string, idempotencyKey: string) {
    return query<{ id: string; payload: Record<string, unknown>; created_at: Date }>(
      `SELECT id, payload, created_at
       FROM audit_events
       WHERE actor_user_id = $1
         AND event_type = 'admin_onboarding_bootstrap_retry_all'
         AND payload->>'idempotencyKey' = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [actorUserId, idempotencyKey]
    );
  }

  fetchRetryAllCandidates(statusClause: string, orderBy: string, limit: number, minPriorityScore: number) {
    return query<{
      actor_user_id: string;
      event_id: string;
      created_at: Date;
      event_type: string;
      priority_score: number;
    }>(
      `SELECT ae.actor_user_id
            , ae.id AS event_id
            , ae.created_at
            , ae.event_type
            , CASE
                WHEN ae.event_type IN ('auth_register_bootstrap_failed','auth_first_login_bootstrap_failed') THEN 3
                WHEN ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
                     AND COALESCE((ae.payload->'totals'->>'blocked')::int, 0) > 0 THEN 2
                ELSE 1
              END AS priority_score
       FROM audit_events ae
       WHERE ae.actor_user_id IS NOT NULL
         AND ${statusClause}
         AND (
           CASE
             WHEN ae.event_type IN ('auth_register_bootstrap_failed','auth_first_login_bootstrap_failed') THEN 3
             WHEN ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
                  AND COALESCE((ae.payload->'totals'->>'blocked')::int, 0) > 0 THEN 2
             ELSE 1
           END
         ) >= $2
       ORDER BY priority_score DESC, ae.created_at ${orderBy}
       LIMIT $1`,
      [limit, minPriorityScore]
    );
  }

  fetchLastOnboardingRetryAt(targetUserId: string) {
    return query<{ last_retry_at: Date | null }>(
      `SELECT MAX(created_at) AS last_retry_at
       FROM audit_events
       WHERE entity_id = $1
         AND event_type IN ('admin_onboarding_bootstrap_retry', 'admin_onboarding_bootstrap_retry_all_user')`,
      [targetUserId]
    );
  }
}
