# Atina Rollback Drill Runbook (Time-Sequenced)

This runbook is the execution plan for rollback validation drills covering:

- Primary Postgres rollback
- Forge vault rollback
- App revalidation and evidence collection

Use with `docs/operations/db-backup-restore-runbook.md`.

**Monorepo (`omni group` root):** opciono [`scripts/README.md`](../../../../scripts/README.md) — [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) kao **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) mirror pre/po drill-u (prvo **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../../scripts/README.md), zatim pytest + **`apps/omnigroup-web`** build osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** za Nest **`verify:ci`**); posle što endpointi opet odgovaraju, opciono [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (HTTP; Atina Node stub = **GET** `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [NIVO-1-F4-TIM-CHECKLIST.md](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

## 1) Roles and Drill Inputs

Required roles:

- Incident commander (IC)
- DB operator
- App operator
- Scribe/evidence collector

Required inputs before start:

- Candidate release identifier (commit or artifact tag)
- Last known good release identifier
- Target backup timestamp (`YYYYMMDD-HHMMSS`)
- Rollback trigger threshold (default: 5 minutes critical failure)

## 2) T-Sequence Execution Plan

### T-20m to T-10m (Preparation)

1. Confirm service health baseline:

```powershell
npm run smoke:all
```

(`npm run smoke:all` → **`scripts/smoke-all.ps1`**: health, jedan login, JWT za `/me`, `forge/status`, workflow execution-stats smoke, `forge-admin` — detalj [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*.)

2. Capture pre-drill baseline row counts:

```powershell
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "atina_db" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "atina_user" }
if (-not $env:POSTGRES_PASSWORD) { throw "POSTGRES_PASSWORD must be set before drill." }
docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -c \"SELECT COUNT(*) AS users_count FROM users;\""
docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -c \"SELECT COUNT(*) AS tasks_count FROM tasks;\""
```

3. Confirm recoverable artifacts exist:

- Postgres dump exists and hash verified.
- Forge vault backup exists in `data/vault-backups`.

### T-10m to T-0m (Failure Injection / Trigger)

Simulate rollback condition with one of:

- Deploy a known bad build in staging.
- Temporarily break DB connectivity env var in staging only.
- Run migration that is expected to regress a non-critical path in controlled env.

Trigger rollback when any gate fails for >5 min:

- `GET /health` unhealthy.
- Auth checks fail.
- Forge status invalid.
- Admin workflow metrics inaccessible.

### T+0m to T+10m (Rollback Execution)

1. Freeze writes / stop app:

```powershell
docker compose stop app
```

2. Restore primary Postgres backup:

```powershell
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "atina_db" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "atina_user" }
$PG_DUMP_FILE = "<path-to-approved-dump-file>"
if (-not $env:POSTGRES_PASSWORD) { throw "POSTGRES_PASSWORD must be set before restore." }
if (-not (Test-Path $PG_DUMP_FILE)) { throw "Dump file not found: $PG_DUMP_FILE" }

docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();\""
docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d postgres -c \"DROP DATABASE IF EXISTS $DB_NAME;\""
docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d postgres -c \"CREATE DATABASE $DB_NAME;\""
docker cp $PG_DUMP_FILE atina_postgres:/tmp/restore-source.dump
docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' pg_restore -U '$DB_USER' -d '$DB_NAME' --clean --if-exists --no-owner --no-privileges /tmp/restore-source.dump"
```

3. Restore Forge vault backup:

```powershell
npm run vault:restore:latest
```

4. Bring app back:

```powershell
docker compose up -d app
```

### T+10m to T+20m (Verification Gates)

Run mandatory verification:

```powershell
npm run smoke:all
docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -c \"SELECT version FROM schema_migrations ORDER BY version;\""
docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -c \"SELECT COUNT(*) AS users_count FROM users;\""
docker compose exec -T postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -c \"SELECT COUNT(*) AS tasks_count FROM tasks;\""
```

(`npm run smoke:all` → **`scripts/smoke-all.ps1`**; jedan login, isti JWT za `/me`, Forge status, workflow execution-stats, forge-admin — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*.)

Pass criteria:

- `smoke:all` passes end-to-end.
- `/health` remains healthy for 5 continuous minutes.
- `schema_migrations` readable and complete.
- Post-rollback row counts are plausible vs baseline.
- SQL commands return tabular output (`users_count`, `tasks_count`) without connection/auth errors.

### T+20m to T+30m (Closeout)

- IC declares rollback success or failure.
- Document RTO (time to recover) and verification completion time.
- Attach all command outputs and hashes.
- Create follow-up issues for any failed checks or manual interventions.

## 3) Drill gate (what to run + evidence to collect)

### Commands (gate)

- [ ] `npm run smoke:all` before drill
- [ ] Postgres backup hash validation (`Get-FileHash`)
- [ ] Forge vault backup existence + hash
- [ ] `docker compose stop app`
- [ ] Postgres `pg_restore` command
- [ ] `npm run vault:restore:latest`
- [ ] `docker compose up -d app`
- [ ] `npm run smoke:all` after rollback
- [ ] `schema_migrations` query
- [ ] Baseline vs post-rollback row count queries

### Evidence (gate)

- [ ] Timeline with timestamps for each T-step
- [ ] Operator and approver names
- [ ] Backup filenames + SHA256 values
- [ ] Console output snippets for restore commands
- [ ] Smoke test outputs pre/post rollback
- [ ] DB verification query outputs
- [ ] Final go/no-go decision record

## 4) Failure Handling During Drill

If Postgres restore fails:

1. Keep app stopped.
2. Validate dump file hash and re-run restore once.
3. If second attempt fails, switch to previous known-good dump.
4. Escalate and mark drill as failed; capture full error output.

If Forge vault restore fails:

1. Use explicit file restore with `-Action restore-file`.
2. Validate `FORGE_VAULT_PATH` points to a `.db` file.
3. Re-run forge smoke checks before declaring success.

## 5) Last Executed Drill Snapshot (2026-04-01)

Observed outputs from latest rehearsal:

- `docker compose ps` showed `atina_app`, `atina_postgres`, and `atina_redis` all up and healthy.
- Postgres backup/list verification succeeded with custom archive TOC output (`TOC Entries: 198`).
- `npm run vault:backup` and `npm run vault:restore:latest` both returned `{"ok":true,...}`.
- Verification SQL passed:
  - `schema_migrations`: 7 rows
  - `users_count`: 4
  - `tasks_count`: 13
- `npm run smoke:all` failed at `smoke-forge-status.ps1` with:
  - `{"success":false,"error":{"code":"NOT_FOUND","message":"Route not found"}}`

Drill status from this run:
- **Data restore path validated**
- **Traffic-ready verification not complete** until Forge status smoke endpoint/script mismatch is fixed.
