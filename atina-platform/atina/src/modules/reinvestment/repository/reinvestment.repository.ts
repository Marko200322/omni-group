import { query } from '../../../database/connection';

export type ReinvestmentAccountRow = {
  id: string;
  code: string;
  name: string;
  currency: string;
  description: string | null;
  is_active: boolean;
};

export type ReinvestmentBalanceRow = {
  id: string;
  account_id: string;
  account_code: string;
  available_cents: string;
  pending_cents: string;
  committed_cents: string;
  restricted_cents: string;
  reserve_cents: string;
  currency: string;
  as_of: string;
  source: string;
};

export type ReinvestmentPolicyRow = {
  id: string;
  version: number;
  is_active: boolean;
  dry_run: boolean;
  kill_switch: boolean;
  autonomy_level: number;
  operating_mode: string;
  min_reserve_cents: string;
  target_reserve_cents: string;
  tax_reserve_bps: number;
  system_allocation_bps: number;
  marketing_allocation_bps: number;
  profit_allocation_bps: number;
  emergency_allocation_bps: number;
  max_autonomous_spend_cents: string;
  max_single_tx_cents: string;
  max_daily_spend_cents: string;
  max_weekly_spend_cents: string;
  max_monthly_spend_cents: string;
  max_project_budget_cents: string;
  approval_threshold_cents: string;
  mandatory_approval_cents: string;
  cooldown_seconds: number;
  min_runway_months: string;
  allow_marketing_reallocation: boolean;
  scoring_version: string;
  policy_version: string;
  engine_version: string;
  config: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReinvestmentTransactionRow = {
  id: string;
  idempotency_key: string;
  source_account_id: string;
  destination_account_id: string;
  amount_cents: string;
  currency: string;
  purpose: string;
  status: string;
  dry_run: boolean;
  policy_decision: string | null;
  risk_level: string | null;
  investment_id: string | null;
  opportunity_id: string | null;
  provider: string;
  provider_ref: string | null;
  explanation: string | null;
  metadata: unknown;
  created_by: string | null;
  approved_by: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

export class ReinvestmentRepository {
  listAccounts() {
    return query<ReinvestmentAccountRow>(
      `SELECT id, code, name, currency, description, is_active
       FROM reinvestment_accounts
       WHERE is_active = TRUE
       ORDER BY code ASC`
    );
  }

  getAccountByCode(code: string) {
    return query<ReinvestmentAccountRow>(
      `SELECT id, code, name, currency, description, is_active
       FROM reinvestment_accounts
       WHERE code = $1
       LIMIT 1`,
      [code]
    );
  }

  listBalances() {
    return query<ReinvestmentBalanceRow>(
      `SELECT b.id, b.account_id, a.code AS account_code,
              b.available_cents::text, b.pending_cents::text, b.committed_cents::text,
              b.restricted_cents::text, b.reserve_cents::text,
              b.currency, b.as_of::text, b.source
       FROM reinvestment_account_balances b
       JOIN reinvestment_accounts a ON a.id = b.account_id
       ORDER BY a.code ASC`
    );
  }

  upsertDerivedBalance(accountId: string, availableCents: number, currency = 'EUR') {
    return query(
      `INSERT INTO reinvestment_account_balances
         (account_id, available_cents, pending_cents, committed_cents, restricted_cents,
          reserve_cents, currency, as_of, source)
       VALUES ($1, $2, 0, 0, 0, 0, $3, NOW(), 'derived')
       ON CONFLICT (account_id, currency) DO UPDATE SET
         available_cents = EXCLUDED.available_cents,
         as_of = NOW(),
         source = 'derived'
       RETURNING id`,
      [accountId, availableCents, currency]
    );
  }

  getActivePolicy() {
    return query<ReinvestmentPolicyRow>(
      `SELECT id, version, is_active, dry_run, kill_switch, autonomy_level, operating_mode,
              min_reserve_cents::text, target_reserve_cents::text, tax_reserve_bps,
              system_allocation_bps, marketing_allocation_bps, profit_allocation_bps,
              emergency_allocation_bps, max_autonomous_spend_cents::text,
              max_single_tx_cents::text, max_daily_spend_cents::text,
              max_weekly_spend_cents::text, max_monthly_spend_cents::text,
              max_project_budget_cents::text, approval_threshold_cents::text,
              mandatory_approval_cents::text, cooldown_seconds, min_runway_months::text,
              allow_marketing_reallocation, scoring_version, policy_version, engine_version,
              config, created_by, created_at::text, updated_at::text
       FROM reinvestment_policies
       WHERE is_active = TRUE
       ORDER BY version DESC, created_at DESC
       LIMIT 1`
    );
  }

  listPolicies(limit = 20) {
    return query<ReinvestmentPolicyRow>(
      `SELECT id, version, is_active, dry_run, kill_switch, autonomy_level, operating_mode,
              min_reserve_cents::text, target_reserve_cents::text, tax_reserve_bps,
              system_allocation_bps, marketing_allocation_bps, profit_allocation_bps,
              emergency_allocation_bps, max_autonomous_spend_cents::text,
              max_single_tx_cents::text, max_daily_spend_cents::text,
              max_weekly_spend_cents::text, max_monthly_spend_cents::text,
              max_project_budget_cents::text, approval_threshold_cents::text,
              mandatory_approval_cents::text, cooldown_seconds, min_runway_months::text,
              allow_marketing_reallocation, scoring_version, policy_version, engine_version,
              config, created_by, created_at::text, updated_at::text
       FROM reinvestment_policies
       ORDER BY is_active DESC, version DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  updateActivePolicy(
    id: string,
    patch: {
      dryRun?: boolean;
      killSwitch?: boolean;
      autonomyLevel?: number;
      operatingMode?: string;
      maxSingleTxCents?: number;
      maxDailySpendCents?: number;
      maxWeeklySpendCents?: number;
      maxMonthlySpendCents?: number;
      approvalThresholdCents?: number;
      mandatoryApprovalCents?: number;
      minReserveCents?: number;
      targetReserveCents?: number;
      minRunwayMonths?: number;
      allowMarketingReallocation?: boolean;
    }
  ) {
    return query<ReinvestmentPolicyRow>(
      `UPDATE reinvestment_policies SET
         dry_run = COALESCE($2, dry_run),
         kill_switch = COALESCE($3, kill_switch),
         autonomy_level = COALESCE($4, autonomy_level),
         operating_mode = COALESCE($5, operating_mode),
         max_single_tx_cents = COALESCE($6, max_single_tx_cents),
         max_daily_spend_cents = COALESCE($7, max_daily_spend_cents),
         max_weekly_spend_cents = COALESCE($8, max_weekly_spend_cents),
         max_monthly_spend_cents = COALESCE($9, max_monthly_spend_cents),
         approval_threshold_cents = COALESCE($10, approval_threshold_cents),
         mandatory_approval_cents = COALESCE($11, mandatory_approval_cents),
         min_reserve_cents = COALESCE($12, min_reserve_cents),
         target_reserve_cents = COALESCE($13, target_reserve_cents),
         min_runway_months = COALESCE($14, min_runway_months),
         allow_marketing_reallocation = COALESCE($15, allow_marketing_reallocation),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, version, is_active, dry_run, kill_switch, autonomy_level, operating_mode,
                 min_reserve_cents::text, target_reserve_cents::text, tax_reserve_bps,
                 system_allocation_bps, marketing_allocation_bps, profit_allocation_bps,
                 emergency_allocation_bps, max_autonomous_spend_cents::text,
                 max_single_tx_cents::text, max_daily_spend_cents::text,
                 max_weekly_spend_cents::text, max_monthly_spend_cents::text,
                 max_project_budget_cents::text, approval_threshold_cents::text,
                 mandatory_approval_cents::text, cooldown_seconds, min_runway_months::text,
                 allow_marketing_reallocation, scoring_version, policy_version, engine_version,
                 config, created_by, created_at::text, updated_at::text`,
      [
        id,
        patch.dryRun ?? null,
        patch.killSwitch ?? null,
        patch.autonomyLevel ?? null,
        patch.operatingMode ?? null,
        patch.maxSingleTxCents ?? null,
        patch.maxDailySpendCents ?? null,
        patch.maxWeeklySpendCents ?? null,
        patch.maxMonthlySpendCents ?? null,
        patch.approvalThresholdCents ?? null,
        patch.mandatoryApprovalCents ?? null,
        patch.minReserveCents ?? null,
        patch.targetReserveCents ?? null,
        patch.minRunwayMonths ?? null,
        patch.allowMarketingReallocation ?? null,
      ]
    );
  }

  getTransactionByIdempotencyKey(key: string) {
    return query<ReinvestmentTransactionRow>(
      `SELECT id, idempotency_key, source_account_id, destination_account_id,
              amount_cents::text, currency, purpose, status, dry_run, policy_decision,
              risk_level, investment_id, opportunity_id, provider, provider_ref,
              explanation, metadata, created_by, approved_by, executed_at::text,
              created_at::text, updated_at::text
       FROM reinvestment_transactions
       WHERE idempotency_key = $1
       LIMIT 1`,
      [key]
    );
  }

  /**
   * Idempotent insert — on conflict return existing row (no update).
   */
  insertTransactionIdempotent(input: {
    idempotencyKey: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amountCents: number;
    currency: string;
    purpose: string;
    status: string;
    dryRun: boolean;
    policyDecision: string | null;
    riskLevel: string | null;
    investmentId?: string | null;
    opportunityId?: string | null;
    provider: string;
    providerRef?: string | null;
    explanation?: string | null;
    metadata?: Record<string, unknown>;
    createdBy?: string | null;
  }) {
    return query<ReinvestmentTransactionRow & { inserted: boolean }>(
      `WITH ins AS (
         INSERT INTO reinvestment_transactions
           (idempotency_key, source_account_id, destination_account_id, amount_cents, currency,
            purpose, status, dry_run, policy_decision, risk_level, investment_id, opportunity_id,
            provider, provider_ref, explanation, metadata, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17)
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING id, idempotency_key, source_account_id, destination_account_id,
                   amount_cents::text, currency, purpose, status, dry_run, policy_decision,
                   risk_level, investment_id, opportunity_id, provider, provider_ref,
                   explanation, metadata, created_by, approved_by, executed_at::text,
                   created_at::text, updated_at::text, TRUE AS inserted
       )
       SELECT * FROM ins
       UNION ALL
       SELECT id, idempotency_key, source_account_id, destination_account_id,
              amount_cents::text, currency, purpose, status, dry_run, policy_decision,
              risk_level, investment_id, opportunity_id, provider, provider_ref,
              explanation, metadata, created_by, approved_by, executed_at::text,
              created_at::text, updated_at::text, FALSE AS inserted
       FROM reinvestment_transactions
       WHERE idempotency_key = $1
         AND NOT EXISTS (SELECT 1 FROM ins)
       LIMIT 1`,
      [
        input.idempotencyKey,
        input.sourceAccountId,
        input.destinationAccountId,
        input.amountCents,
        input.currency,
        input.purpose,
        input.status,
        input.dryRun,
        input.policyDecision,
        input.riskLevel,
        input.investmentId ?? null,
        input.opportunityId ?? null,
        input.provider,
        input.providerRef ?? null,
        input.explanation ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.createdBy ?? null,
      ]
    );
  }

  listTransactions(limit = 50, status?: string) {
    if (status) {
      return query<ReinvestmentTransactionRow>(
        `SELECT id, idempotency_key, source_account_id, destination_account_id,
                amount_cents::text, currency, purpose, status, dry_run, policy_decision,
                risk_level, investment_id, opportunity_id, provider, provider_ref,
                explanation, metadata, created_by, approved_by, executed_at::text,
                created_at::text, updated_at::text
         FROM reinvestment_transactions
         WHERE status = $2
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit, status]
      );
    }
    return query<ReinvestmentTransactionRow>(
      `SELECT id, idempotency_key, source_account_id, destination_account_id,
              amount_cents::text, currency, purpose, status, dry_run, policy_decision,
              risk_level, investment_id, opportunity_id, provider, provider_ref,
              explanation, metadata, created_by, approved_by, executed_at::text,
              created_at::text, updated_at::text
       FROM reinvestment_transactions
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  updateTransactionStatus(
    id: string,
    status: string,
    extras?: { approvedBy?: string | null; providerRef?: string | null; executedAt?: boolean }
  ) {
    return query<ReinvestmentTransactionRow>(
      `UPDATE reinvestment_transactions SET
         status = $2,
         approved_by = COALESCE($3, approved_by),
         provider_ref = COALESCE($4, provider_ref),
         executed_at = CASE WHEN $5 THEN NOW() ELSE executed_at END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, idempotency_key, source_account_id, destination_account_id,
                 amount_cents::text, currency, purpose, status, dry_run, policy_decision,
                 risk_level, investment_id, opportunity_id, provider, provider_ref,
                 explanation, metadata, created_by, approved_by, executed_at::text,
                 created_at::text, updated_at::text`,
      [
        id,
        status,
        extras?.approvedBy ?? null,
        extras?.providerRef ?? null,
        extras?.executedAt === true,
      ]
    );
  }

  listOpportunities(limit = 50, status?: string) {
    if (status) {
      return query(
        `SELECT * FROM reinvestment_opportunities WHERE status = $2
         ORDER BY priority_score DESC, updated_at DESC LIMIT $1`,
        [limit, status]
      );
    }
    return query(
      `SELECT * FROM reinvestment_opportunities
       ORDER BY priority_score DESC, updated_at DESC LIMIT $1`,
      [limit]
    );
  }

  getOpportunityById(id: string) {
    return query(`SELECT * FROM reinvestment_opportunities WHERE id = $1 LIMIT 1`, [id]);
  }

  upsertOpportunityFromSignal(input: {
    slug: string;
    title: string;
    kind: string;
    demandScore: number;
    priorityScore: number;
    explanation: string;
    sourceRefs: unknown;
    estimatedDevCostCents?: number;
    estimatedMonthlyCostCents?: number;
    estimatedMonthlyRevenueCents?: number;
  }) {
    return query(
      `INSERT INTO reinvestment_opportunities
         (slug, title, kind, status, demand_score, priority_score, explanation, source_refs,
          estimated_dev_cost_cents, estimated_monthly_cost_cents, estimated_monthly_revenue_cents)
       VALUES ($1,$2,$3,'proposed',$4,$5,$6,$7::jsonb,$8,$9,$10)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         demand_score = EXCLUDED.demand_score,
         priority_score = EXCLUDED.priority_score,
         explanation = EXCLUDED.explanation,
         source_refs = EXCLUDED.source_refs,
         estimated_dev_cost_cents = EXCLUDED.estimated_dev_cost_cents,
         estimated_monthly_cost_cents = EXCLUDED.estimated_monthly_cost_cents,
         estimated_monthly_revenue_cents = EXCLUDED.estimated_monthly_revenue_cents,
         updated_at = NOW()
       RETURNING *`,
      [
        input.slug,
        input.title,
        input.kind,
        input.demandScore,
        input.priorityScore,
        input.explanation,
        JSON.stringify(input.sourceRefs ?? []),
        input.estimatedDevCostCents ?? 0,
        input.estimatedMonthlyCostCents ?? 0,
        input.estimatedMonthlyRevenueCents ?? 0,
      ]
    );
  }

  listInvestments(limit = 50) {
    return query(
      `SELECT * FROM reinvestment_investments ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }

  listBudgets(limit = 50) {
    return query(
      `SELECT * FROM reinvestment_budgets ORDER BY period_start DESC LIMIT $1`,
      [limit]
    );
  }

  listForecasts(limit = 50) {
    return query(
      `SELECT * FROM reinvestment_forecasts ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }

  insertForecast(input: {
    subjectType: string;
    subjectId?: string | null;
    kind?: string;
    scenario?: string;
    horizonMonths?: number;
    metrics: Record<string, unknown>;
    confidence?: number;
    engineVersion: string;
  }) {
    return query(
      `INSERT INTO reinvestment_forecasts
         (subject_type, subject_id, kind, scenario, horizon_months, metrics, confidence, engine_version)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
       RETURNING *`,
      [
        input.subjectType,
        input.subjectId ?? null,
        input.kind ?? 'scenario',
        input.scenario ?? 'base',
        input.horizonMonths ?? 12,
        JSON.stringify(input.metrics),
        input.confidence ?? 50,
        input.engineVersion,
      ]
    );
  }

  listApprovals(limit = 50, status?: string) {
    if (status) {
      return query(
        `SELECT * FROM reinvestment_approvals WHERE status = $2
         ORDER BY created_at DESC LIMIT $1`,
        [limit, status]
      );
    }
    return query(
      `SELECT * FROM reinvestment_approvals ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }

  getApprovalById(id: string) {
    return query(`SELECT * FROM reinvestment_approvals WHERE id = $1 LIMIT 1`, [id]);
  }

  insertApproval(input: {
    subjectType: string;
    subjectId: string;
    requestedAmountCents?: number | null;
    currency?: string;
    recommendation?: string | null;
    reason?: string;
    payload?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO reinvestment_approvals
         (subject_type, subject_id, status, requested_amount_cents, currency,
          recommendation, reason, payload)
       VALUES ($1,$2,'pending',$3,$4,$5,$6,$7::jsonb)
       RETURNING *`,
      [
        input.subjectType,
        input.subjectId,
        input.requestedAmountCents ?? null,
        input.currency ?? 'EUR',
        input.recommendation ?? null,
        input.reason ?? '',
        JSON.stringify(input.payload ?? {}),
      ]
    );
  }

  decideApproval(
    id: string,
    status: string,
    decidedBy: string,
    decisionNote?: string | null
  ) {
    return query(
      `UPDATE reinvestment_approvals SET
         status = $2,
         decided_by = $3,
         decision_note = $4,
         decided_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, status, decidedBy, decisionNote ?? null]
    );
  }

  listAuditLogs(limit = 100) {
    return query(
      `SELECT * FROM reinvestment_audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }

  /** INSERT-only audit append. */
  appendAudit(input: {
    action: string;
    actorUserId?: string | null;
    actorRole?: string | null;
    subjectType?: string | null;
    subjectId?: string | null;
    amountCents?: number | null;
    currency?: string | null;
    accountCode?: string | null;
    decision?: string | null;
    reason?: string | null;
    policyVersion?: string | null;
    engineVersion?: string | null;
    scoringVersion?: string | null;
    modelVersion?: string | null;
    inputRefs?: Record<string, unknown>;
    providerResponse?: unknown;
    error?: string | null;
    rollbackStatus?: string | null;
  }) {
    return query(
      `INSERT INTO reinvestment_audit_logs
         (action, actor_user_id, actor_role, subject_type, subject_id, amount_cents, currency,
          account_code, decision, reason, policy_version, engine_version, scoring_version,
          model_version, input_refs, provider_response, error, rollback_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18)
       RETURNING id, created_at`,
      [
        input.action,
        input.actorUserId ?? null,
        input.actorRole ?? null,
        input.subjectType ?? null,
        input.subjectId ?? null,
        input.amountCents ?? null,
        input.currency ?? null,
        input.accountCode ?? null,
        input.decision ?? null,
        input.reason ?? null,
        input.policyVersion ?? null,
        input.engineVersion ?? null,
        input.scoringVersion ?? null,
        input.modelVersion ?? null,
        JSON.stringify(input.inputRefs ?? {}),
        input.providerResponse != null ? JSON.stringify(input.providerResponse) : null,
        input.error ?? null,
        input.rollbackStatus ?? null,
      ]
    );
  }

  listAlerts(limit = 50) {
    return query(
      `SELECT * FROM reinvestment_alerts
       ORDER BY acknowledged ASC, created_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  insertAlert(input: {
    code: string;
    severity: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO reinvestment_alerts (code, severity, title, message, metadata)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       RETURNING *`,
      [
        input.code,
        input.severity,
        input.title,
        input.message,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
  }

  listDemandSignals(limit = 100) {
    return query(
      `SELECT * FROM reinvestment_demand_signals
       ORDER BY count_30d DESC, last_seen_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  insertEngineRun(input: {
    phase: string;
    status: string;
    dryRun: boolean;
    engineVersion: string;
    policyVersion?: string | null;
    scoringVersion?: string | null;
    inputRefs?: Record<string, unknown>;
    outputSummary?: Record<string, unknown>;
    error?: string | null;
  }) {
    const finished =
      input.status === 'completed' || input.status === 'failed' || input.status === 'blocked';
    return query(
      `INSERT INTO reinvestment_engine_runs
         (phase, status, dry_run, engine_version, policy_version, scoring_version,
          input_refs, output_summary, error, finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,
               CASE WHEN $10::boolean THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        input.phase,
        input.status,
        input.dryRun,
        input.engineVersion,
        input.policyVersion ?? null,
        input.scoringVersion ?? null,
        JSON.stringify(input.inputRefs ?? {}),
        JSON.stringify(input.outputSummary ?? {}),
        input.error ?? null,
        finished,
      ]
    );
  }

  /** Recent monthly allocation aggregates for runway estimation. */
  getRecentMonthlyAllocationTotals(months = 3) {
    return query<{
      month: string;
      gross: string;
      system_reinvest: string;
      owner_net: string;
      payment_count: string;
    }>(
      `SELECT to_char(date_trunc('month', applied_at), 'YYYY-MM') AS month,
              COALESCE(SUM(gross_eur), 0)::text AS gross,
              COALESCE(SUM(system_reinvest_eur), 0)::text AS system_reinvest,
              COALESCE(SUM(owner_net_eur), 0)::text AS owner_net,
              COUNT(*)::text AS payment_count
       FROM revenue_allocations
       WHERE applied_at >= (date_trunc('month', NOW()) - ($1::text || ' months')::interval)
       GROUP BY 1
       ORDER BY 1 DESC`,
      [String(months)]
    );
  }
}
