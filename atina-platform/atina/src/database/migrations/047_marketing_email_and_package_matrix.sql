BEGIN;

-- Dedupe LIVE adapter campaign rows by platform campaign id
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_campaigns_channel_external
  ON marketing_campaigns (channel_code, external_id)
  WHERE external_id IS NOT NULL AND external_id <> '';

-- Marketing email engagement events (Resend / provider webhooks)
CREATE TABLE IF NOT EXISTS marketing_email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(40) NOT NULL DEFAULT 'resend',
  provider_event_id VARCHAR(160),
  event_type VARCHAR(40) NOT NULL
    CHECK (event_type IN (
      'sent', 'delivered', 'opened', 'clicked', 'bounced',
      'complained', 'unsubscribed', 'delivery_delayed'
    )),
  email_hash VARCHAR(64),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  campaign_key VARCHAR(160),
  message_id VARCHAR(160),
  url TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_events_type_time
  ON marketing_email_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_email_events_contact
  ON marketing_email_events (contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_email_events_campaign
  ON marketing_email_events (campaign_key, occurred_at DESC);

-- Package × channel observed outcomes (materialized rows from attribution+payment)
CREATE TABLE IF NOT EXISTS marketing_package_channel_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_sku VARCHAR(120) NOT NULL,
  channel_code VARCHAR(40) NOT NULL REFERENCES marketing_channels(code),
  customers INT NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  spend_cents BIGINT NOT NULL DEFAULT 0,
  window_start DATE,
  window_end DATE,
  kind VARCHAR(20) NOT NULL DEFAULT 'ACTUAL'
    CHECK (kind IN ('ACTUAL', 'ESTIMATE')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (package_sku, channel_code, window_start, window_end)
);

COMMIT;
