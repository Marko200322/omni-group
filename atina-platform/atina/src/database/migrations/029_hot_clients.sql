-- Hot clients: companies intercepted via job postings (high-intent hunt targets)

CREATE TABLE IF NOT EXISTS hot_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crm_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  outbound_message_id UUID,
  platform_slug VARCHAR(80) NOT NULL,
  platform_name VARCHAR(160),
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  region VARCHAR(8) NOT NULL DEFAULT 'GLOBAL',
  company_name VARCHAR(200),
  role_title VARCHAR(200),
  city VARCHAR(120),
  job_url TEXT,
  job_posting_excerpt TEXT,
  salary_gross_monthly_eur INTEGER,
  atina_monthly_eur INTEGER,
  heat_score INTEGER NOT NULL DEFAULT 50 CHECK (heat_score >= 0 AND heat_score <= 100),
  heat_band VARCHAR(20) NOT NULL DEFAULT 'warm' CHECK (heat_band IN ('cold', 'warm', 'hot', 'burning')),
  status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'won', 'lost', 'archived')),
  vertical_slug VARCHAR(120),
  source_run_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hot_clients_user ON hot_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_hot_clients_heat ON hot_clients(user_id, heat_score DESC);
CREATE INDEX IF NOT EXISTS idx_hot_clients_status ON hot_clients(user_id, status);
CREATE INDEX IF NOT EXISTS idx_hot_clients_platform ON hot_clients(platform_slug);
CREATE INDEX IF NOT EXISTS idx_hot_clients_discovered ON hot_clients(discovered_at DESC);

COMMENT ON TABLE hot_clients IS 'High-intent prospects from job-posting intercept hunts';
