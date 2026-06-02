BEGIN;

CREATE TABLE IF NOT EXISTS industry_verticals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  category VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'seed',
  priority_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  conversion_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  revenue_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  research_data JSONB NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  last_cycle_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industry_verticals_category ON industry_verticals(category);
CREATE INDEX IF NOT EXISTS idx_industry_verticals_status ON industry_verticals(status);
CREATE INDEX IF NOT EXISTS idx_industry_verticals_priority ON industry_verticals(priority_score DESC);

CREATE TABLE IF NOT EXISTS autonomy_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cycle_type VARCHAR(50) NOT NULL DEFAULT 'closed_loop',
  status VARCHAR(30) NOT NULL DEFAULT 'running',
  vertical_slug VARCHAR(120),
  steps JSONB NOT NULL DEFAULT '[]',
  result JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomy_cycles_user_id ON autonomy_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomy_cycles_status ON autonomy_cycles(status);
CREATE INDEX IF NOT EXISTS idx_autonomy_cycles_vertical ON autonomy_cycles(vertical_slug);

CREATE TABLE IF NOT EXISTS generated_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vertical_slug VARCHAR(120) NOT NULL,
  artifact_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'written',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_artifacts_vertical ON generated_artifacts(vertical_slug);
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_type ON generated_artifacts(artifact_type);

CREATE TABLE IF NOT EXISTS autonomy_deploy_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vertical_slug VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  git_commit_sha VARCHAR(64),
  deploy_payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_autonomy_deploy_jobs_vertical ON autonomy_deploy_jobs(vertical_slug);
CREATE INDEX IF NOT EXISTS idx_autonomy_deploy_jobs_status ON autonomy_deploy_jobs(status);

INSERT INTO schema_migrations (version) VALUES ('015_autonomy_loop')
ON CONFLICT DO NOTHING;

COMMIT;
