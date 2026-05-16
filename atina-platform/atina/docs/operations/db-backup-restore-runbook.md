# Atina DB Backup and Restore Runbook (Postgres + Forge Vault)

This runbook is for the current Atina stack:

- Primary DB: PostgreSQL (`atina_postgres` in `docker-compose.yml`)
- Forge vault DB: SQLite file (`FORGE_VAULT_PATH`, defaults to `data/vault.db`)
- App: `atina_app`

Use this before deploys, migration windows, and rollback drills.

**Monorepo (`omni group` root):** pre rizičnih DB promena opciono pokreni pun lokalni gate — [`scripts/README.md`](../../../../scripts/README.md) ([`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1); PowerShell **Get-Help**; isti red kao CI (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) uključuje **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../../scripts/README.md), zatim pytest + **`apps/omnigroup-web`** build osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** za Nest **`verify:ci`**). Kad su Astra + Nest podignuti, opciono i [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (HTTP; Atina Node stub = **GET** `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*) · **LATEST verify:** [NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [NIVO-1-SMOKE-EVIDENCE-LATEST.md](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [NIVO-1-F4-TIM-CHECKLIST.md](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

## 1) Preconditions and Variables

Iz **korena monorepa** pređi u folder platforme:

```powershell
Set-Location "atina-platform\atina"   # od korena repoa `omni group`
```

Set the shared variables in your PowerShell session:

```powershell
$TS = Get-Date -Format "yyyyMMdd-HHmmss"
$BACKUP_ROOT = "backups"
$RUN_DIR = Join-Path $BACKUP_ROOT $TS
New-Item -ItemType Directory -Force -Path $RUN_DIR | Out-Null

# Database values (align with .env in the target environment)
$DB_NAME = $env:DB_NAME
$DB_USER = $env:DB_USER
if (-not $DB_NAME) { $DB_NAME = "atina_db" }
if (-not $DB_USER) { $DB_USER = "atina_user" }
```

Verify required containers and health:

```powershell
docker compose ps
docker inspect --format "{{.State.Health.Status}}" atina_postgres
docker inspect --format "{{.State.Health.Status}}" atina_app
```

Acceptance criteria:

- `atina_postgres` is running and health is `healthy`.
- `atina_app` is running (or intentionally stopped for maintenance windows).

## 2) Primary DB Backup (Postgres)

Create a compressed full logical backup (`pg_dump -Fc`) with binary-safe copy:

```powershell
$PG_DUMP_NAME = "postgres-$DB_NAME-$TS.dump"
$PG_DUMP_FILE = Join-Path $RUN_DIR $PG_DUMP_NAME
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' pg_dump -U '$DB_USER' -d '$DB_NAME' -Fc -f /tmp/$PG_DUMP_NAME"
docker cp "atina_postgres:/tmp/$PG_DUMP_NAME" $PG_DUMP_FILE
docker exec atina_postgres sh -lc "rm -f /tmp/$PG_DUMP_NAME"
```

If `POSTGRES_PASSWORD` is not exported in your shell, set it first:

```powershell
$env:POSTGRES_PASSWORD = "<db-password>"
```

Create integrity metadata (size and hash):

```powershell
$PG_HASH_FILE = Join-Path $RUN_DIR "postgres-$DB_NAME-$TS.sha256"
(Get-FileHash -Algorithm SHA256 $PG_DUMP_FILE).Hash | Out-File -Encoding ascii $PG_HASH_FILE
Get-Item $PG_DUMP_FILE | Select-Object FullName, Length, LastWriteTime
```

Backup verification check (restore listing without writing data):

```powershell
docker cp $PG_DUMP_FILE atina_postgres:/tmp/restore-check.dump
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' pg_restore -l /tmp/restore-check.dump" | Select-Object -First 20
```

Acceptance criteria:

- Dump file exists and is non-zero size.
- SHA256 file exists.
- `pg_restore -l` returns TOC entries (not an error).

## 3) Forge Vault Backup (SQLite)

Preferred (uses repo script):

```powershell
npm run vault:backup
```

Optional explicit path (if not using default `data/vault.db`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "./scripts/vault-db-ops.ps1" `
  -Action backup `
  -VaultPath "./data/vault.db" `
  -BackupDir "./data/vault-backups"
```

Capture latest vault backup metadata:

```powershell
$VAULT_LATEST = Get-ChildItem "./data/vault-backups" -Filter "vault-*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $VAULT_LATEST) { throw "No Forge vault backup created." }
$VAULT_HASH_FILE = Join-Path $RUN_DIR "forge-vault-$TS.sha256"
(Get-FileHash -Algorithm SHA256 $VAULT_LATEST.FullName).Hash | Out-File -Encoding ascii $VAULT_HASH_FILE
$VAULT_LATEST | Select-Object FullName, Length, LastWriteTime
```

Acceptance criteria:

- New file appears in `data/vault-backups`.
- File size is non-zero and SHA256 was captured.

## 4) Restore Procedure (Primary DB)

Use this only in approved restore/rollback windows.

1. Stop application writes:

```powershell
docker compose stop app
```

2. Ensure target dump exists:

```powershell
$PG_DUMP_FILE = "<path-to-dump-file>"
Test-Path $PG_DUMP_FILE
```

3. Recreate database from dump:

```powershell
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();\""
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d postgres -c \"DROP DATABASE IF EXISTS $DB_NAME;\""
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d postgres -c \"CREATE DATABASE $DB_NAME;\""
docker cp $PG_DUMP_FILE atina_postgres:/tmp/restore-source.dump
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' pg_restore -U '$DB_USER' -d '$DB_NAME' --clean --if-exists --no-owner --no-privileges /tmp/restore-source.dump"
```

4. Validate schema/migrations after restore:

```powershell
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -c \"SELECT version, applied_at FROM schema_migrations ORDER BY version;\""
```

Acceptance criteria:

- Restore command exits successfully.
- `schema_migrations` query returns expected versions.

## 5) Restore Procedure (Forge Vault)

Restore latest Forge vault backup:

```powershell
npm run vault:restore:latest
```

Restore specific backup file:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "./scripts/vault-db-ops.ps1" `
  -Action restore-file `
  -VaultPath "./data/vault.db" `
  -SourceFile "./data/vault-backups/vault-YYYYMMDD-HHMMSS.db"
```

Acceptance criteria:

- Script returns JSON with `"ok":true`.
- Vault DB file exists at `FORGE_VAULT_PATH` (or default `data/vault.db`).

## 6) Post-Restore Verification (must pass before traffic resumes)

Start app:

```powershell
docker compose up -d app
```

Run production smoke pack:

```powershell
npm run smoke:all
```

(`npm run smoke:all` runs **`scripts/smoke-all.ps1`**: **`GET /health`**, one **`POST /auth/login`**, then the same JWT for **`/auth/me`**, **`GET /api/v1/forge/status`**, workflow execution-stats smoke, and **`smoke-forge-admin.ps1` — see formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) Local notes — Smoke tests.)

Run targeted DB sanity queries:

```powershell
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -c \"SELECT COUNT(*) AS users_count FROM users;\""
docker exec atina_postgres sh -lc "PGPASSWORD='$POSTGRES_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -c \"SELECT COUNT(*) AS tasks_count FROM tasks;\""
```

Final acceptance criteria:

- All smoke tests pass.
- Health endpoint stable for 5 minutes.
- DB sanity counts and migration versions are readable.
- Forge status endpoint returns valid payload (`nextProvider`, `budgetRsd`).

## 7) Evidence to Record

Store under release ticket or incident timeline:

- Backup file paths and SHA256 checksums.
- Console outputs for `pg_dump`/`pg_restore`/vault operations.
- `schema_migrations` query output.
- Smoke test output (`npm run smoke:all`).
- Start/end timestamps and owner initials.

## 8) Drill Execution Record (2026-04-01)

Commands executed from this repo on Windows/PowerShell:

- `docker compose ps`
- `docker inspect --format "{{.State.Health.Status}}" atina_postgres`
- `docker inspect --format "{{.State.Health.Status}}" atina_app`
- `npm run vault:backup`
- `npm run vault:restore:latest`
- `npm run smoke:all`

Exact output highlights:

- Container health:
  - `atina_postgres`: `healthy`
  - `atina_app`: `healthy`
- Postgres backup artifact:
  - `backups/20260401-142701/postgres-atina_db-20260401-142701.dump`
  - size: `101241` bytes
  - SHA256: `FDA836FCC024D8DA2E5C4291FA4D2F8A7CC532E94E9CB5CA55DD867A00107E7A`
- `pg_restore -l` verification returned TOC entries, including:
  - `Archive created at 2026-04-01 12:27:23 UTC`
  - `TOC Entries: 198`
  - `FUNCTION public update_updated_at_column() atina_user`
- Forge vault backup/restore output:
  - backup: `{"ok":true,"action":"backup",...,"backupPath":"...\\data\\vault-backups\\vault-20260401-142800.db"}`
  - restore: `{"ok":true,"action":"restore-latest",...,"destination":"...\\data\\vault.db"}`
  - vault backup SHA256: `FA459768E8F208207B325EAE94BD349170D76BA3CF60C0B5DD2B704E68D6CA39`
- DB verification query results:
  - `schema_migrations`: 7 rows (versions `001_initial_schema` through `007_audit_events_composite_feed_indexes`)
  - `users_count`: `4`
  - `tasks_count`: `13`
- Smoke suite result:
  - `smoke:health` passed
  - `smoke:auth` passed
  - `smoke:forge:status` failed with `{"success":false,"error":{"code":"NOT_FOUND","message":"Route not found"}}`

Verification disposition:
- Backup and restore mechanics: **PASS**
- Full smoke pack gate: **FAIL** (Forge status endpoint route mismatch; requires endpoint/script alignment before declaring full rollback drill PASS)
