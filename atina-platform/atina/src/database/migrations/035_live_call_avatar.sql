BEGIN;

CREATE TABLE IF NOT EXISTS live_call_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_request_id UUID REFERENCES video_meeting_requests(id) ON DELETE SET NULL,
  agent_id VARCHAR(64) NOT NULL,
  agent_type VARCHAR(20) NOT NULL CHECK (agent_type IN ('support', 'sales')),
  live_provider VARCHAR(32) NOT NULL DEFAULT 'stub',
  platform VARCHAR(32) NOT NULL DEFAULT 'browser'
    CHECK (platform IN ('browser', 'zoom', 'google_meet')),
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'ended', 'failed', 'handoff')),
  external_session_id TEXT,
  recall_bot_id VARCHAR(128),
  meeting_url TEXT,
  join_url TEXT,
  provider_payload JSONB NOT NULL DEFAULT '{}',
  turn_count INTEGER NOT NULL DEFAULT 0,
  max_duration_minutes INTEGER NOT NULL DEFAULT 30,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_call_sessions_user ON live_call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_call_sessions_status ON live_call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_call_sessions_meeting ON live_call_sessions(meeting_request_id);

CREATE TABLE IF NOT EXISTS live_call_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES live_call_sessions(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  input_text TEXT,
  output_text TEXT,
  latency_ms INTEGER,
  provider VARCHAR(32),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_call_turns_session ON live_call_turns(session_id, created_at);

COMMIT;
