ALTER TABLE outbound_messages
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

UPDATE outbound_messages
SET status = 'dead_letter',
    last_error = COALESCE(last_error, metadata->>'error'),
    updated_at = NOW()
WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_outbound_messages_retry_queue
  ON outbound_messages (status, next_attempt_at, created_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_outbound_messages_dead_letter
  ON outbound_messages (updated_at DESC)
  WHERE status = 'dead_letter';
