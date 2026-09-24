CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status_updated
  ON stripe_webhook_events (status, updated_at DESC);
