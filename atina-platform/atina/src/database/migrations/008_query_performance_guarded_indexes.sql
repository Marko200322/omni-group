BEGIN;

-- Guard legacy upgrades where schema_migrations may be out of sync.
-- These indexes target the most expensive filter+sort paths in tasks,
-- ecosystem_runs, and audit_events while remaining safe for repeated runs.

-- tasks: list/count executions and user task feeds ordered by recency
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_created_at
  ON tasks(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status_created_at
  ON tasks(user_id, status, created_at DESC);

-- ecosystem_runs: forge/system run analytics over recent windows
CREATE INDEX IF NOT EXISTS idx_ecosystem_runs_system_status_created_at
  ON ecosystem_runs(ecosystem_system_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ecosystem_runs_run_type_created_at
  ON ecosystem_runs(run_type, created_at DESC);

-- audit_events: onboarding/admin feeds and timeline endpoints
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type_created_at
  ON audit_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity_event_type_created_at
  ON audit_events(entity_type, entity_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor_event_type_created_at
  ON audit_events(actor_user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_retry_all_idempotency
  ON audit_events((payload->>'idempotencyKey'), created_at DESC)
  WHERE event_type = 'admin_onboarding_bootstrap_retry_all';

COMMIT;
