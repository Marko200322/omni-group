BEGIN;

CREATE TABLE IF NOT EXISTS outbound_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vertical_slug VARCHAR(120),
  category VARCHAR(80),
  lead_email VARCHAR(255),
  lead_name VARCHAR(255),
  lead_company VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  source VARCHAR(50) NOT NULL DEFAULT 'autonomy_generate',
  metadata JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_status ON outbound_messages(status);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_vertical ON outbound_messages(vertical_slug);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_user ON outbound_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_created ON outbound_messages(created_at DESC);

COMMIT;
