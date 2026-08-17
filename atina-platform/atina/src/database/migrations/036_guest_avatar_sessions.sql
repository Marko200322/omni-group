BEGIN;

ALTER TABLE avatar_conversation_sessions
  ALTER COLUMN user_id DROP NOT NULL;

COMMIT;
