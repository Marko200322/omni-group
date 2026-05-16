BEGIN;

CREATE INDEX IF NOT EXISTS idx_audit_events_actor_created_at
  ON audit_events(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity_created_at
  ON audit_events(entity_type, entity_id, created_at DESC);

COMMIT;
