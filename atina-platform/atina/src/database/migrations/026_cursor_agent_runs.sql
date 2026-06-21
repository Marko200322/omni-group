-- Cursor SDK agent runs (mobile admin + evolution automation)

CREATE TABLE IF NOT EXISTS cursor_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  agent_id TEXT,
  run_id TEXT,
  result_summary TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cursor_agent_runs_user_created
  ON cursor_agent_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cursor_agent_runs_status
  ON cursor_agent_runs(status);
