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

Migration `011_system_alerts.sql` adds `system_alerts` table (Alert System module #23) with indexes on `user_id`, `status`, `severity`, `created_at`.

## 012 AI RAG chunks (Faza 6)

Migration `012_ai_rag_chunks.sql` adds `ai_rag_chunks` for module `ai-rag` (`POST /ingest`, `GET /search`). Keyword search via `ILIKE`; vector extension = backlog.

## 013 Kriptoman payment provider

Migration `013_payments_kriptoman_provider.sql` extends `payments.provider` CHECK to include `kriptoman`.

## 015 Autonomy Loop

Migration `015_autonomy_loop.sql` adds:

- `industry_verticals` — registry of 500+ verticals (seed via API)
- `autonomy_cycles` — closed-loop run audit
- `generated_artifacts` — module/page/workflow outputs
- `autonomy_deploy_jobs` — Git + CI deploy pipeline jobs

Migration `016_autonomy_budget.sql` adds:

- `autonomy_budget_state` — singleton balance (initial, spent, revenue)
- `autonomy_budget_ledger` — spend/revenue audit per autonomy action

Module: `autonomy-loop` at `/api/v1/autonomy-loop/*`. Checklist: [`docs/AUTONOMY-LOOP-v1-CHECKLIST.md`](../../../docs/AUTONOMY-LOOP-v1-CHECKLIST.md).

Migration `009_users_name_legacy_column.sql` adds `users.name` if missing (older DBs where `CREATE TABLE IF NOT EXISTS` skipped the full 001 shape), backfills from `email`, then sets `NOT NULL` + default — matches current app + integration seeds.

## 018 outbound messages

Migration `018_outbound_messages.sql` — outbound email queue (draft → queued → sent).

## 019 platform evolution

Migration `019_platform_evolution.sql` — `platform_evolution_tasks` queue for self-modification tasks (UI, tests, deploy prep). Checklist: [`docs/operations/CHECKLIST-100-PROCENTA.md`](../../../docs/operations/CHECKLIST-100-PROCENTA.md).
