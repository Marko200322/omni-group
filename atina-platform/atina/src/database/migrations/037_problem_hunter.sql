-- Problem Hunter: sources, companies, signals, search runs, cache

CREATE TABLE IF NOT EXISTS problem_hunter_sources (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  daily_limit INTEGER NOT NULL DEFAULT 50,
  monthly_budget_eur NUMERIC(10, 2) NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problem_hunter_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_name VARCHAR(200) NOT NULL,
  domain VARCHAR(255),
  website TEXT,
  industry_category VARCHAR(80),
  identity_hash VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, identity_hash)
);

CREATE TABLE IF NOT EXISTS problem_hunter_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES problem_hunter_companies(id) ON DELETE SET NULL,
  source_id VARCHAR(64) NOT NULL REFERENCES problem_hunter_sources(id),
  source_url TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  industry_category VARCHAR(80),
  detected_problem TEXT NOT NULL,
  problem_category VARCHAR(80),
  original_context TEXT,
  evidence JSONB NOT NULL DEFAULT '[]',
  fact_lines JSONB NOT NULL DEFAULT '[]',
  inference_lines JSONB NOT NULL DEFAULT '[]',
  unknown_lines JSONB NOT NULL DEFAULT '[]',
  urgency VARCHAR(20) NOT NULL DEFAULT 'medium',
  confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  lead_score INTEGER NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  score_reasons JSONB NOT NULL DEFAULT '[]',
  duplicate_of UUID REFERENCES problem_hunter_signals(id) ON DELETE SET NULL,
  matched_deliverable_id VARCHAR(64),
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problem_hunter_search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id VARCHAR(64) NOT NULL,
  industry_category VARCHAR(80),
  query_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  results_count INTEGER NOT NULL DEFAULT 0,
  signals_created INTEGER NOT NULL DEFAULT 0,
  cost_eur NUMERIC(10, 4) NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS problem_hunter_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(64) NOT NULL,
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT NOT NULL,
  result_hash VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, query_hash)
);

CREATE INDEX IF NOT EXISTS idx_ph_signals_user_score ON problem_hunter_signals(user_id, lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_ph_signals_industry ON problem_hunter_signals(user_id, industry_category);
CREATE INDEX IF NOT EXISTS idx_ph_signals_status ON problem_hunter_signals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ph_companies_domain ON problem_hunter_companies(user_id, domain);

INSERT INTO problem_hunter_sources (id, label, enabled, priority) VALUES
  ('web_search', 'Web search (Tavily/API)', false, 80),
  ('manual_import', 'Manual import', true, 100),
  ('client_hunter', 'Client Hunter bridge', true, 90)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE problem_hunter_signals IS 'Structured problem signals with FACT/INFERENCE/UNKNOWN separation';
