BEGIN;

ALTER TABLE avatar_agent_roster
  ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS heygen_avatar_id VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS heygen_voice_id VARCHAR(120) NOT NULL DEFAULT '';

UPDATE avatar_agent_roster
SET photo_url = regexp_replace(avatar_url, '\.svg$', '.png')
WHERE photo_url = '' AND avatar_url LIKE '%.svg';

CREATE TABLE IF NOT EXISTS autonomy_rollout_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'running',
  request JSONB NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomy_rollout_jobs_status ON autonomy_rollout_jobs(status);
CREATE INDEX IF NOT EXISTS idx_autonomy_rollout_jobs_started ON autonomy_rollout_jobs(started_at DESC);

COMMIT;
