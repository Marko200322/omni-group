BEGIN;

CREATE TABLE IF NOT EXISTS video_meeting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_type VARCHAR(20) NOT NULL CHECK (meeting_type IN ('support', 'sales')),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('manual', 'zoom', 'google_meet')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'completed', 'canceled')),
  topic VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  meeting_url TEXT,
  external_meeting_id VARCHAR(255),
  agent_name VARCHAR(120),
  agent_avatar_url VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_meetings_user ON video_meeting_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_type_status ON video_meeting_requests(meeting_type, status);
CREATE INDEX IF NOT EXISTS idx_video_meetings_scheduled_at ON video_meeting_requests(scheduled_at);

COMMIT;
