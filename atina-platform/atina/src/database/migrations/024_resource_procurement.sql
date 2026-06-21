BEGIN;

CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_procurement_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'paid_pending_confirm', 'fulfilled', 'cancelled')),
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_reference VARCHAR(64) NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS resource_provider_wallets (
  provider_id VARCHAR(40) PRIMARY KEY,
  balance_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  low_threshold_eur NUMERIC(12, 2) NOT NULL DEFAULT 5,
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_orders_user_status
  ON resource_procurement_orders (user_id, status, created_at DESC);

INSERT INTO platform_settings (key, value)
VALUES ('resource_procurement', '{"autoProcurementEnabled":false}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO resource_provider_wallets (provider_id, balance_eur, low_threshold_eur)
VALUES
  ('openrouter', 0, 8),
  ('elevenlabs', 0, 5),
  ('heygen', 0, 15),
  ('d-id', 0, 10),
  ('cartesia', 0, 5),
  ('comms', 0, 5),
  ('scraper', 0, 5)
ON CONFLICT (provider_id) DO NOTHING;

COMMIT;
