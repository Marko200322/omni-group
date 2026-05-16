BEGIN;

CREATE TABLE IF NOT EXISTS ecosystem_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  system_slug VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  stage VARCHAR(50) NOT NULL DEFAULT 'v1',
  budget_allocated DECIMAL(12,2) NOT NULL DEFAULT 0,
  revenue_generated DECIMAL(12,2) NOT NULL DEFAULT 0,
  efficiency_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecosystem_systems_user_id ON ecosystem_systems(user_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_systems_slug ON ecosystem_systems(system_slug);
CREATE INDEX IF NOT EXISTS idx_ecosystem_systems_status ON ecosystem_systems(status);

CREATE TABLE IF NOT EXISTS ecosystem_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecosystem_system_id UUID NOT NULL REFERENCES ecosystem_systems(id) ON DELETE CASCADE,
  run_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  input_payload JSONB NOT NULL DEFAULT '{}',
  output_payload JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecosystem_runs_system_id ON ecosystem_runs(ecosystem_system_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_runs_status ON ecosystem_runs(status);

INSERT INTO schema_migrations (version) VALUES ('002_ecosystem_systems')
ON CONFLICT DO NOTHING;

COMMIT;
