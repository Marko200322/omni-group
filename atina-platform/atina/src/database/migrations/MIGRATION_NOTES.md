# Migration Notes

## 001 trigger guard

- `001_initial_schema.sql` now checks `pg_trigger` before creating each `update_*_updated_at` trigger.
- This prevents failures when upgrading an existing database that already has these triggers but is missing (or has drifted) `schema_migrations` entries.

## 008 guarded index rollout

New migration: `008_query_performance_guarded_indexes.sql`.

Added `IF NOT EXISTS` indexes for heavy query paths:

- `tasks`: `user_id + type + created_at DESC`, and `user_id + status + created_at DESC`
- `ecosystem_runs`: `ecosystem_system_id + status + created_at DESC`, and `run_type + created_at DESC`
- `audit_events`: `event_type + created_at DESC`, `entity_type + entity_id + event_type + created_at DESC`, `actor_user_id + event_type + created_at DESC`
- `audit_events` idempotency lookup: expression index on `(payload->>'idempotencyKey')` scoped to `event_type = 'admin_onboarding_bootstrap_retry_all'`

These are intentionally additive and idempotent, so they are safe on fresh and existing databases.

## 009 `users.name` for legacy schemas

Migration `009_users_name_legacy_column.sql` adds `users.name` if missing (older DBs where `CREATE TABLE IF NOT EXISTS` skipped the full 001 shape), backfills from `email`, then sets `NOT NULL` + default — matches current app + integration seeds.
