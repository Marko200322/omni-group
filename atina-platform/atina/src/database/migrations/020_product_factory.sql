-- Product Factory — izolovane klijentske narudžbine + interni SaaS lane (autonomy).

CREATE TABLE IF NOT EXISTS product_factory_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lane VARCHAR(32) NOT NULL CHECK (lane IN ('client_order', 'internal_saas')),
  slug VARCHAR(128) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  deliverable_id VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  isolation_key VARCHAR(64) NOT NULL UNIQUE,
  output_dir TEXT,
  test_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  deploy_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}',
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_user_id, lane, slug)
);

CREATE TABLE IF NOT EXISTS product_factory_build_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES product_factory_projects(id) ON DELETE CASCADE,
  run_type VARCHAR(32) NOT NULL CHECK (run_type IN ('scaffold', 'test', 'deploy_prep', 'internal_research')),
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_product_factory_projects_lane_status
  ON product_factory_projects (lane, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_factory_projects_owner
  ON product_factory_projects (owner_user_id, lane);

CREATE INDEX IF NOT EXISTS idx_product_factory_build_runs_project
  ON product_factory_build_runs (project_id, created_at DESC);

COMMENT ON TABLE product_factory_projects IS
  'Greenfield softver: client_order (izolovano po narudžbini) | internal_saas (autonomy istražuje za Omni Group)';
