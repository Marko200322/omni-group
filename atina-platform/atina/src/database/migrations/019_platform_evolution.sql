-- Platform evolution agent — task queue za samomodifikaciju (dashboard, web, testovi, deploy).

CREATE TABLE IF NOT EXISTS platform_evolution_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(64) NOT NULL,
  priority INT NOT NULL DEFAULT 50,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  target_paths JSONB NOT NULL DEFAULT '[]',
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_platform_evolution_tasks_status_priority
  ON platform_evolution_tasks (status, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_platform_evolution_tasks_type
  ON platform_evolution_tasks (task_type);

COMMENT ON TABLE platform_evolution_tasks IS
  'Autonomy evolution: research_gap, ui_improvement, test_fix, outreach_tune, deploy_prep';
