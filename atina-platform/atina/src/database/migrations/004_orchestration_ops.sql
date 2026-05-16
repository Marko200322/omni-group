BEGIN;

CREATE TABLE IF NOT EXISTS gateway_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_key VARCHAR(120) NOT NULL UNIQUE,
  upstream_slug VARCHAR(80) NOT NULL,
  path_template VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'GET',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);

CREATE TABLE IF NOT EXISTS self_heal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subsystem VARCHAR(80) NOT NULL,
  issue_key VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'detected',
  remediation_action TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  healed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_self_heal_status ON self_heal_events(status);

CREATE TABLE IF NOT EXISTS workflow_chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  chain_definition JSONB NOT NULL DEFAULT '[]',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_chains_user ON workflow_chains(user_id);

INSERT INTO schema_migrations (version) VALUES ('004_orchestration_ops')
ON CONFLICT DO NOTHING;

COMMIT;
