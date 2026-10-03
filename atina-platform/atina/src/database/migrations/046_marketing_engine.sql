BEGIN;

-- Omni Marketing Intelligence & Lead Engine (observer/optimizer only — no spend authority)

CREATE TABLE IF NOT EXISTS marketing_channels (
  code VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  channel_type VARCHAR(40) NOT NULL DEFAULT 'paid'
    CHECK (channel_type IN ('paid', 'owned', 'earned', 'outbound', 'organic')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_budget_cents BIGINT NOT NULL DEFAULT 0,
  daily_budget_cents BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO marketing_channels (code, name, channel_type) VALUES
  ('google_ads', 'Google Ads', 'paid'),
  ('meta_ads', 'Meta Ads', 'paid'),
  ('linkedin', 'LinkedIn', 'paid'),
  ('email', 'Email Marketing', 'owned'),
  ('seo', 'Organic Search / SEO', 'organic'),
  ('outbound', 'Direct Outbound', 'outbound'),
  ('referral', 'Referral / Partner', 'earned'),
  ('organic_direct', 'Direct / Organic traffic', 'organic')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_code VARCHAR(40) NOT NULL REFERENCES marketing_channels(code),
  name VARCHAR(240) NOT NULL,
  external_id VARCHAR(160),
  status VARCHAR(40) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  package_sku VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_channel
  ON marketing_campaigns (channel_code, status);

CREATE TABLE IF NOT EXISTS marketing_spend_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_code VARCHAR(40) NOT NULL REFERENCES marketing_channels(code),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR(40) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'csv', 'google', 'meta', 'linkedin', 'estimate')),
  kind VARCHAR(20) NOT NULL DEFAULT 'ACTUAL'
    CHECK (kind IN ('ACTUAL', 'ESTIMATE')),
  impressions INT,
  clicks INT,
  platform_conversions INT,
  idempotency_key VARCHAR(160) NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_spend_channel_date
  ON marketing_spend_entries (channel_code, spent_on DESC);

CREATE TABLE IF NOT EXISTS marketing_touchpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_key VARCHAR(120),
  session_key VARCHAR(120),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  utm_source VARCHAR(160),
  utm_medium VARCHAR(160),
  utm_campaign VARCHAR(160),
  utm_content VARCHAR(160),
  utm_term VARCHAR(160),
  landing_page TEXT,
  referrer TEXT,
  event_type VARCHAR(80) NOT NULL DEFAULT 'page_view',
  channel_code VARCHAR(40) REFERENCES marketing_channels(code),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attribution JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_touchpoints_contact
  ON marketing_touchpoints (contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_touchpoints_session
  ON marketing_touchpoints (session_key, occurred_at DESC);

CREATE TABLE IF NOT EXISTS marketing_attributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  payment_id UUID,
  model VARCHAR(40) NOT NULL
    CHECK (model IN ('first_touch', 'last_touch', 'linear', 'position', 'time_decay', 'weighted')),
  channel_code VARCHAR(40) REFERENCES marketing_channels(code),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  confidence VARCHAR(20) NOT NULL DEFAULT 'uncertain'
    CHECK (confidence IN ('high', 'medium', 'low', 'uncertain')),
  weight NUMERIC(10, 6) NOT NULL DEFAULT 1,
  labeled_uncertain BOOLEAN NOT NULL DEFAULT FALSE,
  evidence JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  autonomy_level INT NOT NULL DEFAULT 1 CHECK (autonomy_level BETWEEN 0 AND 5),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_budget_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES marketing_budgets(id) ON DELETE CASCADE,
  bucket VARCHAR(20) NOT NULL CHECK (bucket IN ('CORE', 'TEST', 'RESERVE')),
  channel_code VARCHAR(40) REFERENCES marketing_channels(code),
  amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hypothesis TEXT NOT NULL,
  channel_code VARCHAR(40) REFERENCES marketing_channels(code),
  status VARCHAR(40) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'completed', 'aborted')),
  budget_cents BIGINT NOT NULL DEFAULT 0,
  kpi VARCHAR(80),
  min_sample INT NOT NULL DEFAULT 30,
  success_criteria TEXT,
  failure_criteria TEXT,
  result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recommendation TEXT NOT NULL,
  reason TEXT NOT NULL,
  confidence VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),
  expected_impact TEXT,
  risk VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (risk IN ('low', 'medium', 'high')),
  required_budget_cents BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'accepted', 'rejected', 'expired')),
  supporting_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(240) NOT NULL,
  recommendation_id UUID REFERENCES marketing_recommendations(id) ON DELETE SET NULL,
  validation_status VARCHAR(40) NOT NULL DEFAULT 'draft'
    CHECK (validation_status IN ('draft', 'validated', 'forecast', 'submitted', 'rejected')),
  forecast JSONB NOT NULL DEFAULT '{}',
  reinvestment_ready BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  message TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(40) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acked', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_alerts_status
  ON marketing_alerts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS marketing_sync_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adapter VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'success', 'failed', 'unavailable')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  error TEXT,
  stats JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS marketing_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(80) NOT NULL,
  actor_user_id UUID,
  decision VARCHAR(40),
  reason TEXT,
  input_refs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: register marketing as monitored subsystem when monitoring exists
INSERT INTO monitoring_services (code, name, layer, is_critical, check_interval_sec)
SELECT 'marketing', 'Marketing Intelligence Engine', 'business', FALSE, 300
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'monitoring_services'
)
ON CONFLICT (code) DO NOTHING;

COMMIT;
