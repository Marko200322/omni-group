BEGIN;

CREATE TABLE IF NOT EXISTS autonomy_budget_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  initial_budget_usd DECIMAL(12, 4) NOT NULL,
  balance_usd DECIMAL(12, 4) NOT NULL,
  total_spent_usd DECIMAL(12, 4) NOT NULL DEFAULT 0,
  total_revenue_usd DECIMAL(12, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autonomy_budget_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('seed', 'spend', 'revenue', 'adjust')),
  category VARCHAR(60) NOT NULL,
  amount_usd DECIMAL(12, 4) NOT NULL,
  balance_after_usd DECIMAL(12, 4) NOT NULL,
  vertical_slug VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomy_budget_ledger_created ON autonomy_budget_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomy_budget_ledger_type ON autonomy_budget_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_autonomy_budget_ledger_vertical ON autonomy_budget_ledger(vertical_slug);

INSERT INTO schema_migrations (version) VALUES ('016_autonomy_budget')
ON CONFLICT DO NOTHING;

COMMIT;
