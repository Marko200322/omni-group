BEGIN;

-- Reinvestment Engine (internal admin financial decision system)
-- Does NOT move real bank money unless a verified BankAccountProvider is configured.
-- Default operating mode: dry_run = true, autonomy_level = 0 (analyze only).

CREATE TABLE IF NOT EXISTS reinvestment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(40) NOT NULL UNIQUE
    CHECK (code IN ('revenue', 'system', 'marketing', 'profit_reserve')),
  name VARCHAR(120) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reinvestment_account_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES reinvestment_accounts(id) ON DELETE CASCADE,
  available_cents BIGINT NOT NULL DEFAULT 0,
  pending_cents BIGINT NOT NULL DEFAULT 0,
  committed_cents BIGINT NOT NULL DEFAULT 0,
  restricted_cents BIGINT NOT NULL DEFAULT 0,
  reserve_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(40) NOT NULL DEFAULT 'ledger'
    CHECK (source IN ('ledger', 'manual', 'bank_sync', 'derived')),
  UNIQUE (account_id, currency)
);

CREATE TABLE IF NOT EXISTS reinvestment_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  kill_switch BOOLEAN NOT NULL DEFAULT FALSE,
  autonomy_level SMALLINT NOT NULL DEFAULT 0
    CHECK (autonomy_level BETWEEN 0 AND 5),
  operating_mode VARCHAR(40) NOT NULL DEFAULT 'normal'
    CHECK (operating_mode IN ('growth', 'normal', 'conservation', 'capital_preservation', 'emergency')),
  -- Allocation / floors (basis points where noted; absolute cents for limits)
  min_reserve_cents BIGINT NOT NULL DEFAULT 0,
  target_reserve_cents BIGINT NOT NULL DEFAULT 0,
  tax_reserve_bps INT NOT NULL DEFAULT 0,
  system_allocation_bps INT NOT NULL DEFAULT 0,
  marketing_allocation_bps INT NOT NULL DEFAULT 0,
  profit_allocation_bps INT NOT NULL DEFAULT 0,
  emergency_allocation_bps INT NOT NULL DEFAULT 0,
  max_autonomous_spend_cents BIGINT NOT NULL DEFAULT 0,
  max_single_tx_cents BIGINT NOT NULL DEFAULT 50000,
  max_daily_spend_cents BIGINT NOT NULL DEFAULT 100000,
  max_weekly_spend_cents BIGINT NOT NULL DEFAULT 250000,
  max_monthly_spend_cents BIGINT NOT NULL DEFAULT 500000,
  max_project_budget_cents BIGINT NOT NULL DEFAULT 2500000,
  approval_threshold_cents BIGINT NOT NULL DEFAULT 50000,
  mandatory_approval_cents BIGINT NOT NULL DEFAULT 2500000,
  cooldown_seconds INT NOT NULL DEFAULT 0,
  min_runway_months NUMERIC(6, 2) NOT NULL DEFAULT 3,
  allow_marketing_reallocation BOOLEAN NOT NULL DEFAULT FALSE,
  scoring_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  policy_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reinvestment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  source_account_id UUID NOT NULL REFERENCES reinvestment_accounts(id),
  destination_account_id UUID NOT NULL REFERENCES reinvestment_accounts(id),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  purpose VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'proposed'
    CHECK (status IN (
      'proposed', 'simulated', 'pending_approval', 'approved', 'executing',
      'settled', 'failed', 'cancelled', 'blocked'
    )),
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  policy_decision VARCHAR(40),
  risk_level VARCHAR(40),
  investment_id UUID,
  opportunity_id UUID,
  provider VARCHAR(40) NOT NULL DEFAULT 'mock',
  provider_ref VARCHAR(120),
  fx_rate NUMERIC(18, 8),
  fx_provider VARCHAR(60),
  fx_rate_at TIMESTAMPTZ,
  explanation TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reinvestment_tx_status_created
  ON reinvestment_transactions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reinvestment_tx_created
  ON reinvestment_transactions (created_at DESC);

CREATE TABLE IF NOT EXISTS reinvestment_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(60) NOT NULL UNIQUE,
  label VARCHAR(160) NOT NULL,
  account_code VARCHAR(40) NOT NULL
    CHECK (account_code IN ('revenue', 'system', 'marketing', 'profit_reserve')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  allocated_cents BIGINT NOT NULL DEFAULT 0,
  spent_cents BIGINT NOT NULL DEFAULT 0,
  committed_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reinvestment_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(240) NOT NULL,
  kind VARCHAR(60) NOT NULL
    CHECK (kind IN (
      'new_package', 'package_improvement', 'automation', 'infrastructure',
      'security', 'ai', 'marketing_tooling', 'research', 'other'
    )),
  status VARCHAR(40) NOT NULL DEFAULT 'idea'
    CHECK (status IN (
      'idea', 'proposed', 'approved', 'development', 'testing',
      'staging', 'active', 'optimization', 'deprecated', 'archived'
    )),
  demand_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  revenue_potential_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  margin_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  strategic_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  automation_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  urgency_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  complexity_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  risk_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  confidence_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  priority_score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  estimated_dev_cost_cents BIGINT NOT NULL DEFAULT 0,
  estimated_monthly_cost_cents BIGINT NOT NULL DEFAULT 0,
  estimated_monthly_revenue_cents BIGINT NOT NULL DEFAULT 0,
  expected_payback_months NUMERIC(8, 2),
  explanation TEXT NOT NULL DEFAULT '',
  source_refs JSONB NOT NULL DEFAULT '[]',
  package_slug VARCHAR(120),
  scoring_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reinvestment_opp_priority
  ON reinvestment_opportunities (priority_score DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS reinvestment_investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES reinvestment_opportunities(id) ON DELETE SET NULL,
  title VARCHAR(240) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'proposed'
    CHECK (status IN (
      'proposed', 'approved', 'active', 'paused', 'completed', 'failed', 'cancelled'
    )),
  budget_cents BIGINT NOT NULL DEFAULT 0,
  spent_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  forecast JSONB NOT NULL DEFAULT '{}',
  actual JSONB NOT NULL DEFAULT '{}',
  scenarios JSONB NOT NULL DEFAULT '{}',
  lessons JSONB NOT NULL DEFAULT '[]',
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  policy_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  scoring_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  model_version VARCHAR(40),
  explanation TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reinvestment_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type VARCHAR(40) NOT NULL
    CHECK (subject_type IN ('transaction', 'investment', 'opportunity', 'policy')),
  subject_id UUID NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'modified', 'cancelled')),
  requested_amount_cents BIGINT,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  recommendation VARCHAR(40),
  reason TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reinvestment_approvals_pending
  ON reinvestment_approvals (status, created_at DESC);

CREATE TABLE IF NOT EXISTS reinvestment_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type VARCHAR(40) NOT NULL,
  subject_id UUID,
  kind VARCHAR(40) NOT NULL DEFAULT 'estimate'
    CHECK (kind IN ('estimate', 'forecast', 'scenario', 'actual')),
  scenario VARCHAR(40) NOT NULL DEFAULT 'base'
    CHECK (scenario IN ('conservative', 'base', 'upside', 'actual')),
  horizon_months INT NOT NULL DEFAULT 12,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  metrics JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC(6, 2) NOT NULL DEFAULT 50,
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reinvestment_engine_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('started', 'completed', 'failed', 'blocked')),
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  engine_version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  policy_version VARCHAR(40),
  scoring_version VARCHAR(40),
  model_version VARCHAR(40),
  input_refs JSONB NOT NULL DEFAULT '{}',
  output_summary JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reinvestment_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(80) NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(40),
  subject_type VARCHAR(60),
  subject_id UUID,
  amount_cents BIGINT,
  currency VARCHAR(8),
  account_code VARCHAR(40),
  decision VARCHAR(40),
  reason TEXT,
  policy_version VARCHAR(40),
  engine_version VARCHAR(40),
  scoring_version VARCHAR(40),
  model_version VARCHAR(40),
  input_refs JSONB NOT NULL DEFAULT '{}',
  provider_response JSONB,
  error TEXT,
  rollback_status VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only intent: revoke UPDATE/DELETE from app role if present (best-effort).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user) THEN
    EXECUTE format('REVOKE UPDATE, DELETE ON reinvestment_audit_logs FROM %I', current_user);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal on managed hosts where REVOKE is not permitted.
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_reinvestment_audit_created
  ON reinvestment_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS reinvestment_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warn', 'critical')),
  title VARCHAR(240) NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reinvestment_demand_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_key VARCHAR(160) NOT NULL,
  normalized_code VARCHAR(120) NOT NULL,
  label VARCHAR(240) NOT NULL,
  count_30d INT NOT NULL DEFAULT 0,
  count_90d INT NOT NULL DEFAULT 0,
  source VARCHAR(40) NOT NULL DEFAULT 'omi'
    CHECK (source IN ('omi', 'catalog', 'support', 'orders', 'manual')),
  sample_phrases JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (signal_key, source)
);

INSERT INTO reinvestment_accounts (code, name, description) VALUES
  ('revenue', 'Revenue Account', 'Primary inflow fund for Omni gross/net revenue tracking'),
  ('system', 'System Account', 'Controlled reinvestment fund for Omni development and ops'),
  ('marketing', 'Marketing Account', 'Isolated marketing fund — no autonomous diversion to System'),
  ('profit_reserve', 'Profit / Reserve Account', 'Protected capital with reserve floor')
ON CONFLICT (code) DO NOTHING;

INSERT INTO reinvestment_account_balances (account_id, currency, source)
SELECT a.id, 'EUR', 'ledger'
FROM reinvestment_accounts a
ON CONFLICT (account_id, currency) DO NOTHING;

INSERT INTO reinvestment_policies (
  version, is_active, dry_run, kill_switch, autonomy_level, operating_mode,
  min_reserve_cents, target_reserve_cents, tax_reserve_bps,
  system_allocation_bps, marketing_allocation_bps, profit_allocation_bps,
  max_single_tx_cents, max_daily_spend_cents, max_weekly_spend_cents,
  max_monthly_spend_cents, max_project_budget_cents,
  approval_threshold_cents, mandatory_approval_cents, min_runway_months
) VALUES (
  1, TRUE, TRUE, FALSE, 0, 'normal',
  0, 0, 0,
  0, 0, 0,
  50000, 100000, 250000,
  500000, 2500000,
  50000, 2500000, 3
);

COMMIT;
