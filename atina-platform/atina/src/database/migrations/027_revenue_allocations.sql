BEGIN;

CREATE TABLE IF NOT EXISTS revenue_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_type VARCHAR(40) NOT NULL DEFAULT 'deliverable',
  deliverable_id VARCHAR(80),
  plan_slug VARCHAR(80),
  payment_provider VARCHAR(20) NOT NULL DEFAULT 'manual',
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  gross_eur NUMERIC(12, 2) NOT NULL,
  payment_fee_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_reserve_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  resource_reserve_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  system_reinvest_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  owner_net_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  lines JSONB NOT NULL DEFAULT '[]',
  quote_snapshot JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_allocations_user_applied
  ON revenue_allocations (user_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_allocations_owner_net
  ON revenue_allocations (applied_at DESC);

COMMIT;
