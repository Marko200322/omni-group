# Atina + Forge deploy and rollback runbook

This runbook is aligned with the current Atina repository scripts and live endpoints.

- Staging before prod (ordered gate): [`STAGING-RELEASE-CHECKLIST.md`](../../../../docs/STAGING-RELEASE-CHECKLIST.md)
- Lokacija u monorepu: ovaj fajl je ispod **`atina-platform/atina/`**; komande iz ovog dokumenta tipično iz tog foldera osim gde je eksplicitno „repo koren“.
- Parent monorepo (`omni group`): [NIVO-1-START.md](../../../../NIVO-1-START.md) · [`scripts/README.md`](../../../../scripts/README.md) — [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (CI mirror — job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`** gde se indeks pominje, u [`scripts/README.md`](../../../../scripts/README.md), zatim pytest + ostalo; uključuje i **`apps/omnigroup-web`** build osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** za Nest/pg u istom README-u), [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (multi-stack HTTP; Atina Node stub = **GET** `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*); PowerShell **Get-Help** za obe skripte vidi [`scripts/README.md`](../../../../scripts/README.md) · **LATEST verify:** [NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [NIVO-1-SMOKE-EVIDENCE-LATEST.md](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [NIVO-1-F4-TIM-CHECKLIST.md](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md) · pre-staging red: [STAGING-RELEASE-CHECKLIST.md](../../../../docs/STAGING-RELEASE-CHECKLIST.md) · indeks evidencija: [EVIDENCE-INDEX.md](../../../../docs/EVIDENCE-INDEX.md).
- **Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.
- Runtime scripts: `package.json` and `scripts/*.ps1` (bundled HTTP gate: **`npm run smoke:all`** → **`scripts/smoke-all.ps1`**, optional **`-BaseUrl`** via `npm run smoke:all -- -BaseUrl "https://..."`; see formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) Local notes — Smoke tests).
- Primary operational endpoints:
  - `GET /health`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
  - `GET /api/v1/forge/status`
  - `GET /api/v1/admin/overview`
  - `GET /api/v1/admin/workflow/templates/execution-stats?days=30`

## 0) CEO sekcija G — Node SaaS production gate (concise) — [`CHECKLIST-CEO-SISTEM.md`](../../../../CHECKLIST-CEO-SISTEM.md)

Use this block as the **short operational gate** aligned with workspace [`CHECKLIST-CEO-SISTEM.md`](../../../../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija G** (Atina SaaS). Sign-off šablon: [`CEO-G-PRODUCTION-EVIDENCE.template.md`](../../../../docs/CEO-G-PRODUCTION-EVIDENCE.template.md); mapa otvorenih stavki u **CEO sekcijama A–H**: [`CEO-OPEN-BULLETS-RUNBOOK.md`](../../../../docs/CEO-OPEN-BULLETS-RUNBOOK.md). Full matrices remain in odjeljak 1–8 below and in [`production-config-matrix.md`](./production-config-matrix.md). **Do not commit secrets** — use vault/CI variables and placeholders such as `<vault-managed-password>`.

### Prod-context build (`npm run build`)

- Run from repo root `atina-platform/atina` on the **same Node major** as production (see `README.md`, engine `>=20 <21`).
- Match the deploy pipeline: set `NODE_ENV=production` for the build step when your image/Dockerfile does, so compile-time behavior matches prod (e.g. `NODE_ENV=production npm run build`).
- Pass criteria: exit code `0`, no TypeScript compile errors; optionally record command + commit SHA in release evidence.
- **NIVO-2 / E2E context:** after schema changes, run migrations locally or on staging, then integration/E2E as in [`NIVO-2-E2E.md`](./NIVO-2-E2E.md) before treating the candidate as production-ready.

### Staging migration review (before prod)

- [ ] **Snapshot:** staging DB backup/snapshot taken; **snapshot ID** recorded (see [`db-backup-restore-runbook.md`](./db-backup-restore-runbook.md)).
- [ ] **Diff:** list new/changed files under `src/database/migrations/` vs last promoted release; PR or ticket link attached.
- [ ] **Risk:** note locking, long migrations, nullable/backfill, and **forward-only** vs **reversible** (down migration or restore-only path — align with [`db-rollback-drill-runbook.md`](./db-rollback-drill-runbook.md) if applicable).
- [ ] **Apply once:** run migration job **once** per staging deploy (odjeljak 1.B); verify app logs and `GET /health` after apply.
- [ ] **Evidence:** migration log reference + staging dry-run decision (odjeljci 3–4).

### `.env` / runtime config (production)

- [ ] `NODE_ENV` = `production` (required — see [`production-config-matrix.md`](./production-config-matrix.md) odjeljak 1).
- [ ] `DB_SSL` = `true` when managed Postgres requires TLS; `false` only if policy explicitly allows non-TLS (matrix odjeljak 2).
- [ ] No default/placeholder **secrets** in prod (`JWT_*`, `DB_PASSWORD`, provider keys, webhook secrets) — all from vault; full list in matrix odjeljak 1–7 and boot gate odjeljak 9.
- [ ] Payments/SMTP: follow matrix odjeljak 3–4 when live email or live providers are in scope (payment/SMTP redovi u **CEO sekciji G** — [`CHECKLIST-CEO-SISTEM.md`](../../../../CHECKLIST-CEO-SISTEM.md)).

### Smoke: `/health`, auth, Forge, admin (incl. execution-stats)

- [ ] **Public health:** `GET <base-url>/health` → healthy payload (scripts: `smoke-health.ps1`; staging/prod tables — odjeljci 2 i 6).
- [ ] **Auth:** login + token + `GET .../auth/me` (scripts: `smoke-auth.ps1` or login snippet in odjeljcima 2 i 6).
- [ ] **Admin:** `GET .../admin/overview` and `GET .../admin/workflow/templates/execution-stats?days=<n>` with **Bearer** admin token (matrica u odjeljku 2, direktne sonde u odjeljku 6).
- [ ] **Forge (when in scope):** `smoke-forge-status.ps1` and related rows in odjeljak 2 (aligns with README smoke suite).
- [ ] **Optional bundled smoke (from `atina-platform/atina`):** `npm run smoke:all -- -BaseUrl "<base-url>"` — runs **`scripts/smoke-all.ps1`**: **`GET /health`**, one **`POST /auth/login`**, then the same JWT for **`/auth/me`**, **`GET /api/v1/forge/status`**, workflow execution-stats smoke, and **`smoke-forge-admin.ps1`** ([`release-gate-checklist.md`](./release-gate-checklist.md) Local notes — Smoke tests). Use for a quick pre/post deploy probe when you do not need separate JSON evidence files per script; formal staging/prod tables in odjeljcima 1, 6 i 8 still list granular commands. For strict template-key enforcement on execution stats, run **`smoke-atina-forge-workflow-template.ps1`** with **`-RequireTemplateKey`**.

### Rollback owner and triggers

- [ ] **Before deploy:** name **rollback owner** (and release owner) in preflight / change record (odjeljci 1.A i 5.A, [`release-signoff-template.md`](./release-signoff-template.md)).
- [ ] **Triggers:** `/health` sustained failure, auth failure, Forge/admin regression, error-rate threshold — odjeljak 7; **execution:** odjeljak 8.
- [ ] After rollback, re-run **Critical** smokes from odjeljak 8.C and capture outputs in the release record.

---

## 1) Staging Dry-Run End-to-End Plan (No localhost)

Goal: prove a release candidate is deployable and verifiable on staging before production.

### A. Required staging variables

Set these in the PowerShell session used for the full staging dry-run:

```powershell
$env:STAGING_BASE_URL = "https://staging.example.com"
$env:STAGING_ADMIN_EMAIL = "admin@atina.io"
$env:STAGING_ADMIN_PASSWORD = "<staging-admin-password>"
$env:STAGING_TEMPLATE_KEY = "ecosystem-hunt-to-conversion"
$env:STAGING_STATS_DAYS = "30"
$env:STAGING_DRY_RUN_ID = "stg-dryrun-<YYYYMMDD-HHMM>"
```

Pass criteria for variable setup:
- `STAGING_BASE_URL` is HTTPS and points to staging domain (not `localhost`).
- Admin credentials are valid staging credentials.
- `STAGING_TEMPLATE_KEY` exists in staging execution stats.
- `STAGING_DRY_RUN_ID` is unique for this run and used in evidence filenames.

Validate required staging variables before execution:

```powershell
$required = @(
  "STAGING_BASE_URL",
  "STAGING_ADMIN_EMAIL",
  "STAGING_ADMIN_PASSWORD",
  "STAGING_TEMPLATE_KEY",
  "STAGING_STATS_DAYS",
  "STAGING_DRY_RUN_ID"
)
$missing = $required | Where-Object { [string]::IsNullOrWhiteSpace((Get-Item -Path "env:$_" -ErrorAction SilentlyContinue).Value) }
if ($missing.Count -gt 0) { throw "Missing required staging vars: $($missing -join ', ')" }
if (-not $env:STAGING_BASE_URL.StartsWith("https://")) { throw "STAGING_BASE_URL must start with https://" }
if ($env:STAGING_BASE_URL -match "localhost") { throw "STAGING_BASE_URL must not point to localhost" }
```

### B. Dry-run sequence (exact order)

1. **Preflight gate**
   - [ ] Release owner and rollback owner assigned.
   - [ ] Alert channel routing checked (Slack/Email/Pager) and current on-call confirmed.
   - [ ] Staging DB snapshot created and snapshot ID recorded.
   - [ ] CI green:
     ```powershell
     npm run test:ci
     ```
2. **Staging deploy execution**
   - [ ] Deploy candidate image/artifact to staging (replace placeholders with your deploy platform command):
     ```powershell
     <deploy-cli> deploy --env staging --artifact <artifact-or-image> --ref <commit-sha>
     ```
   - [ ] Apply staging env/secrets for this candidate:
     ```powershell
     <deploy-cli> env apply --env staging --from <vault-ref-or-secrets-bundle>
     ```
   - [ ] Run migrations once for staging DB.
   - [ ] Wait for service readiness and healthy startup logs:
     ```powershell
     Invoke-RestMethod -Method GET -Uri "$env:STAGING_BASE_URL/health"
     ```
3. **Staging smoke + integration validation**
   - [ ] Execute scripted smoke checks against staging URL.
   - [ ] **Fast path (optional):** from `atina-platform/atina`, `npm run smoke:all -- -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD` before or after the per-script matrix in odjeljak 2 when you only need a single pass/fail signal.
   - [ ] Execute endpoint-level integration checks against staging URL.
   - [ ] Capture outputs for release evidence:
     ```powershell
     $evidenceDir = "./release-evidence/$env:STAGING_DRY_RUN_ID"
     New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
     ```
4. **Decision gate**
   - [ ] Mark `PASS` only if all Critical and High checks pass.
   - [ ] Mark `FAIL` and rollback staging if any Critical check fails.

## 2) Staging Smoke + Integration Command Matrix

Run from repo root using PowerShell.

Create evidence directory once per dry-run:

```powershell
$evidenceDir = "./release-evidence/$env:STAGING_DRY_RUN_ID"
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
```

| Type | Command | Required vars | Expected pass condition | Severity |
|---|---|---|---|---|
| Build gate | `npm run build` | none | exits `0` | High |
| CI gate | `npm run test:ci` | test env/CI vars | exits `0` | High |
| Smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-health.ps1 -BaseUrl $env:STAGING_BASE_URL` | `STAGING_BASE_URL` | JSON `ok=true`, `status=ok` | Critical |
| Smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-auth.ps1 -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD` | `STAGING_BASE_URL`, `STAGING_ADMIN_EMAIL`, `STAGING_ADMIN_PASSWORD` | JSON `ok=true`, token returned, `/auth/me` success | Critical |
| Smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-forge-status.ps1 -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD` | same as above | JSON `ok=true`, `nextProvider` + `budgetRsd` present | High |
| Smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-atina-forge-workflow-template.ps1 -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD -Days ([int]$env:STAGING_STATS_DAYS) -TemplateKey $env:STAGING_TEMPLATE_KEY` | all staging vars | JSON `ok=true`, template key found in execution stats | High |
| Integration | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-forge-admin.ps1 -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD -ExecutionStatsDays ([int]$env:STAGING_STATS_DAYS)` | base URL + admin creds + days | JSON `ok=true`, forge/admin checks all populated | High |
| Integration | `Invoke-RestMethod -Method GET -Uri "$env:STAGING_BASE_URL/health"` | `STAGING_BASE_URL` | returns health payload with `status=ok` | Critical |
| Integration | Login + `/auth/me` probe (below) | base URL + admin creds | access token returned and `/auth/me` authorized | Critical |
| Integration | `Invoke-RestMethod -Method GET -Uri "$env:STAGING_BASE_URL/api/v1/admin/overview" -Headers @{ Authorization = "Bearer $token" }` | token | admin payload in `data` | High |
| Integration | `Invoke-RestMethod -Method GET -Uri "$env:STAGING_BASE_URL/api/v1/admin/workflow/templates/execution-stats?days=$env:STAGING_STATS_DAYS" -Headers @{ Authorization = "Bearer $token" }` | token + stats days | `data.summary` and `data.alerts` present | High |

Reusable login/token snippet for integration commands:

```powershell
$loginBody = @{
  email = $env:STAGING_ADMIN_EMAIL
  password = $env:STAGING_ADMIN_PASSWORD
} | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Method POST -Uri "$env:STAGING_BASE_URL/api/v1/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.data.accessToken
if (-not $token) { throw "Missing access token from staging login." }
```

Evidence capture examples (same commands, persisted outputs):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-health.ps1 -BaseUrl $env:STAGING_BASE_URL | Tee-Object -FilePath "$evidenceDir/smoke-health.json"
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-auth.ps1 -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD | Tee-Object -FilePath "$evidenceDir/smoke-auth.json"
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-forge-status.ps1 -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD | Tee-Object -FilePath "$evidenceDir/smoke-forge-status.json"
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-atina-forge-workflow-template.ps1 -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD -Days ([int]$env:STAGING_STATS_DAYS) -TemplateKey $env:STAGING_TEMPLATE_KEY | Tee-Object -FilePath "$evidenceDir/smoke-workflow-template.json"
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-forge-admin.ps1 -BaseUrl $env:STAGING_BASE_URL -Email $env:STAGING_ADMIN_EMAIL -Password $env:STAGING_ADMIN_PASSWORD -ExecutionStatsDays ([int]$env:STAGING_STATS_DAYS) | Tee-Object -FilePath "$evidenceDir/integration-forge-admin.json"
Invoke-RestMethod -Method GET -Uri "$env:STAGING_BASE_URL/health" | ConvertTo-Json -Depth 8 | Tee-Object -FilePath "$evidenceDir/integration-health.json"
```

## 3) Staging smoke + integration evidence gate

Required artifacts before declaring staging dry-run `PASS`:

- [ ] `dry-run-metadata.txt` with run ID, UTC start/end, release commit SHA, artifact/image ID, operator name.
- [ ] `preflight.txt` confirming owners, on-call confirmation, staging DB snapshot ID, and `npm run test:ci` result.
- [ ] `smoke-health.json`
- [ ] `smoke-auth.json`
- [ ] `smoke-forge-status.json`
- [ ] `smoke-workflow-template.json`
- [ ] `integration-forge-admin.json`
- [ ] `integration-health.json`
- [ ] `integration-auth-me.json` (login and `/auth/me` output using staging URL)
- [ ] `integration-admin-overview.json`
- [ ] `integration-execution-stats.json`
- [ ] `monitoring-screenshot.png` (staging latency/error-rate during dry-run window)
- [ ] `decision.txt` with `PASS`/`FAIL`, approvers, rationale, and rollback reference if failed.

## 4) Staging Pass/Fail Rubric

Use this rubric for the dry-run decision.

### PASS

- All **Critical** checks pass.
- At least 95% of **High** checks pass, with no unresolved customer-impacting regression.
- No sustained (`>5 minutes`) error spike on staging logs/monitoring after deploy.
- Required release evidence captured (commands + outputs + timestamps).

### FAIL

- Any **Critical** check fails once and cannot be cleared by one immediate retry.
- Two or more **High** checks fail.
- Admin workflow reliability payload is missing or clearly degraded versus expected baseline.
- Any migration issue that risks forward-only lock-in without documented rollback path.

### RETRY WINDOW

- One immediate retry is allowed for transient network failure.
- If second attempt fails for a Critical check, classify as `FAIL` and begin rollback.

## 5) Production deploy window execution gate (runbook-aligned)

Use inside the approved change window and align execution with `RUN-ATINA-PLATFORM.txt`.

### A. T-15 to T-5 (window pre-start)

- [ ] Confirm change window start/end and incident bridge channel.
- [ ] Confirm deploy operator, rollback owner, and on-call are present.
- [ ] Confirm pre-deploy snapshot/backup IDs are recorded.
- [ ] Confirm candidate identifiers (`SHA`, artifact/image tag, migration batch).
- [ ] Set release status to `in progress`.

### B. T0 to T+10 (deployment execution)

- [ ] Deploy new app version/image to production.
- [ ] Apply release-specific env/secrets changes.
- [ ] Run migrations exactly once for target DB.
- [ ] Verify startup/readiness logs show healthy service initialization.
- [ ] Verify `GET /health` responds healthy before moving on.

### C. T+10 to T+20 (immediate verification gate)

- [ ] Run smoke checks (`health`, `auth`, `forge/status`, workflow execution-stats contract, forge-admin bundle), or **`npm run smoke:all`** from `atina-platform/atina` for a single bundled pass ([`release-gate-checklist.md`](./release-gate-checklist.md)).
- [ ] Record outputs in release evidence folder and release record.
- [ ] Compare error/latency trend against pre-window baseline.
- [ ] If any Critical verification fails beyond retry policy, trigger rollback immediately.

### D. T+20 to window end (stabilization handoff)

- [ ] Confirm gate status with Release Manager (`PASS` / rollback).
- [ ] Post deployment outcome to ops channel with timestamps.
- [ ] Start intensified monitoring handoff per `docs/operations/monitoring-alert-channel-policy.md`.
- [ ] Set release status to `completed` only after handoff criteria are met.

## 6) Post-Deploy Verification (Production)

Run from repo root in PowerShell and attach raw outputs to the release record.

### A. Required production variables

```powershell
$env:PROD_BASE_URL = "https://<production-domain>"
$env:PROD_ADMIN_EMAIL = "admin@atina.io"
$env:PROD_ADMIN_PASSWORD = "<admin-password>"
$env:PROD_TEMPLATE_KEY = "ecosystem-hunt-to-conversion"
$env:PROD_STATS_DAYS = "30"
```

### B. Verification gate (commands + expected outputs)

| Step | Command | Expected output (pass) | Gate |
|---|---|---|---|
| Health smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-health.ps1 -BaseUrl $env:PROD_BASE_URL` | JSON contains `"ok":true` and `"status":"ok"` | Critical |
| Auth smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-auth.ps1 -BaseUrl $env:PROD_BASE_URL -Email $env:PROD_ADMIN_EMAIL -Password $env:PROD_ADMIN_PASSWORD` | JSON contains `"ok":true` plus non-empty `"userId"` and `"email"` | Critical |
| Forge status smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-forge-status.ps1 -BaseUrl $env:PROD_BASE_URL -Email $env:PROD_ADMIN_EMAIL -Password $env:PROD_ADMIN_PASSWORD` | JSON contains `"ok":true`, non-empty `"nextProvider"`, and budget fields | High |
| Workflow template smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-atina-forge-workflow-template.ps1 -BaseUrl $env:PROD_BASE_URL -Email $env:PROD_ADMIN_EMAIL -Password $env:PROD_ADMIN_PASSWORD -Days ([int]$env:PROD_STATS_DAYS) -TemplateKey $env:PROD_TEMPLATE_KEY` | JSON contains `"ok":true`, `"templateKey":"$env:PROD_TEMPLATE_KEY"` | High |
| Forge/admin integration smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-forge-admin.ps1 -BaseUrl $env:PROD_BASE_URL -Email $env:PROD_ADMIN_EMAIL -Password $env:PROD_ADMIN_PASSWORD -ExecutionStatsDays ([int]$env:PROD_STATS_DAYS)` | JSON contains `"ok":true`, plus `checks.forgeStatus.ok=true` and `checks.admin.executionStatsOk=true` | High |
| Direct `/health` probe | `Invoke-RestMethod -Method GET -Uri "$env:PROD_BASE_URL/health"` | object contains `status = "ok"` | Critical |
| Direct auth probe | Login + `/auth/me` snippet below | non-empty access token + `/auth/me` returns user payload | Critical |
| Direct admin overview probe | `Invoke-RestMethod -Method GET -Uri "$env:PROD_BASE_URL/api/v1/admin/overview" -Headers @{ Authorization = "Bearer $token" }` | response includes `data` and `data.users` | High |
| Direct template stats probe | `Invoke-RestMethod -Method GET -Uri "$env:PROD_BASE_URL/api/v1/admin/workflow/templates/execution-stats?days=$env:PROD_STATS_DAYS" -Headers @{ Authorization = "Bearer $token" }` | response includes `data.summary` and `data.alerts` | High |

### C. Login token snippet for direct probes

```powershell
$loginBody = @{
  email = $env:PROD_ADMIN_EMAIL
  password = $env:PROD_ADMIN_PASSWORD
} | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Method POST -Uri "$env:PROD_BASE_URL/api/v1/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.data.accessToken
if (-not $token) { throw "Missing access token from production login." }
$me = Invoke-RestMethod -Method GET -Uri "$env:PROD_BASE_URL/api/v1/auth/me" -Headers @{ Authorization = "Bearer $token" }
if (-not $me.data.id) { throw "Production /auth/me did not return a user id." }
```

## 7) Rollback trigger gate

Trigger rollback when one or more conditions persist beyond agreed window (default: 5 minutes):

- [ ] `GET /health` fails or app is not serving traffic.
- [ ] Login or token-based authenticated checks fail.
- [ ] Forge status/flows regress materially after deploy.
- [ ] Admin workflow reliability metrics show severe degradation.
- [ ] Critical error rate breaches release threshold.

## 8) Rollback execution gate (runnable) + validation

### A. Rollback inputs (set first)

```powershell
$env:ROLLBACK_BASE_URL = "https://<production-domain>"
$env:ROLLBACK_ADMIN_EMAIL = "admin@atina.io"
$env:ROLLBACK_ADMIN_PASSWORD = "<admin-password>"
$env:ROLLBACK_TEMPLATE_KEY = "ecosystem-hunt-to-conversion"
$env:ROLLBACK_STATS_DAYS = "30"
$PREVIOUS_STABLE_RELEASE = "<artifact-or-image-tag>"
$DB_SNAPSHOT_ID = "<pre-deploy-snapshot-id>"
```

### B. Execution gate

- [ ] Halt rollout to prevent additional instances of the bad release.
- [ ] Repoint traffic to `$PREVIOUS_STABLE_RELEASE`.
- [ ] Reapply previous stable secrets and runtime environment.
- [ ] Execute DB rollback via tested mechanism:
  - [ ] preferred: restore snapshot `$DB_SNAPSHOT_ID`, or
  - [ ] approved down migration path.
- [ ] Confirm restored app version is serving traffic.
- [ ] Start validation commands below immediately after traffic is stable.

### C. Rollback validation commands (must pass)

Run each command exactly as shown:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-health.ps1 -BaseUrl $env:ROLLBACK_BASE_URL
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-auth.ps1 -BaseUrl $env:ROLLBACK_BASE_URL -Email $env:ROLLBACK_ADMIN_EMAIL -Password $env:ROLLBACK_ADMIN_PASSWORD
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-forge-status.ps1 -BaseUrl $env:ROLLBACK_BASE_URL -Email $env:ROLLBACK_ADMIN_EMAIL -Password $env:ROLLBACK_ADMIN_PASSWORD
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-atina-forge-workflow-template.ps1 -BaseUrl $env:ROLLBACK_BASE_URL -Email $env:ROLLBACK_ADMIN_EMAIL -Password $env:ROLLBACK_ADMIN_PASSWORD -Days ([int]$env:ROLLBACK_STATS_DAYS) -TemplateKey $env:ROLLBACK_TEMPLATE_KEY
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-forge-admin.ps1 -BaseUrl $env:ROLLBACK_BASE_URL -Email $env:ROLLBACK_ADMIN_EMAIL -Password $env:ROLLBACK_ADMIN_PASSWORD -ExecutionStatsDays ([int]$env:ROLLBACK_STATS_DAYS)
```

Expected validation result:
- All five commands return JSON with `"ok":true`.
- `smoke-health` returns `"status":"ok"`.
- `smoke-auth` returns non-empty `"userId"`.
- `smoke-forge-status` returns non-empty `"nextProvider"` and budget values.
- `smoke-forge-admin` returns `"checks":{"admin":{"executionStatsOk":true...}}`.

### D. Rollback completion criteria

- [ ] Critical rollback validations pass on first attempt, or one immediate retry if there is a clear transient network error.
- [ ] `/health` remains healthy for 5 continuous minutes after rollback.
- [ ] Incident channel updated with rollback complete timestamp and version restored.
- [ ] Release record includes rollback reason, snapshot/migration reference, and all validation outputs.

## 9) Evidence to Capture in Release Record

- Deploy start/end timestamps.
- Commit SHA and artifact version.
- Migration execution log reference.
- Staging and production smoke command outputs.
- Endpoint verification outputs (`health`, `forge/status`, admin endpoints).
- Decision outcome: passed, failed, or rolled back (with reason).

## 10) Related Operational References

- `README.md`
- `RUN-ATINA-PLATFORM.txt`
- `docs/operations/db-backup-restore-runbook.md`
- `docs/operations/db-rollback-drill-runbook.md`
- `docs/operations/monitoring-alert-channel-policy.md`
- `scripts/smoke-all.ps1` (via **`npm run smoke:all`**; optional **`-- -BaseUrl`**)
- `scripts/smoke-health.ps1`
- `scripts/smoke-auth.ps1`
- `scripts/smoke-forge-status.ps1`
- `scripts/smoke-atina-forge-workflow-template.ps1`
- `scripts/smoke-forge-admin.ps1`

## 11) Security Sign-Off Blockers (Deploy/Rollback Gate)

Release is blocked until all security controls below are validated against current build:

| Blocker area | Required control | Verification evidence | Status |
|---|---|---|---|
| Auth hardening | Authenticated endpoints (`/auth/me`, `/auth/change-password`, `/auth/logout`) require auth + session limiter | route middleware review + targeted tests | Closed |
| Rate-limit robustness | Limiter keying does not trust spoofable `x-forwarded-for` and uses server-resolved client identity | unit tests for spoof attempts and limiter behavior | Closed |
| Validation coverage | Auth mutation endpoints enforce DTO validation and reject malformed payloads | `validateBody(...)` on route definitions + validation tests | Closed |
| Error leakage | 5xx errors do not expose internal implementation details outside dev | error-handler tests in non-dev config | Closed |

### Security Sign-Off Commands (impacted scope)

```powershell
npm run lint
npm run test -- --runInBand src/tests/unit/rate-limit.middleware.test.ts src/tests/unit/core-engine.test.ts
```

### Security Residual Risk Log (required)

- [ ] Document any accepted temporary risk with owner + expiry date.
- [ ] Document any untested prod-only behavior (WAF/proxy/CDN interactions).
- [ ] Confirm rollback path preserves the same auth/rate-limit/error-handling controls.

**See also:** [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md) (repo root `docs/`).
