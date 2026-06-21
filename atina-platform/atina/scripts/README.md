# Atina `scripts`

PowerShell helpers for smoke tests and local vault DB operations.

| Script | One-line description | Prerequisite |
|--------|----------------------|--------------|
| `smoke-all.ps1` | **`npm run smoke:all`**: **`GET /health`**, one login, same JWT for **`/auth/me`**, **`GET /api/v1/forge/status`**, workflow execution-stats smoke, **`smoke-forge-admin.ps1`** (see header: `-AccessToken` must be in each child script’s `param()`). | Atina API running; same credentials/DB as other smokes. Optional: `-BaseUrl`, `-Email`, `-Password`. |
| `smoke-health.ps1` | Calls `GET /health` and prints status, version, environment, uptime. | Atina API reachable (default `http://localhost:3000`). |
| `smoke-auth.ps1` | Logs in via `POST /api/v1/auth/login` and `GET /api/v1/auth/me`; prints user id, email, role. Optional **`-AccessToken`** skips login (used by `smoke-all.ps1`). | Atina API running; credentials match a real user (defaults: `admin@atina.io` / `Admin@123456`). |
| `smoke-forge-status.ps1` | Authenticates then validates `GET /api/v1/forge/status` (nextProvider, budgetRsd, etc.). Optional **`-AccessToken`** skips login. | Atina API running; valid account with Forge access. Optional: `-BaseUrl`, `-Email`, `-Password`. |
| `smoke-forge-admin.ps1` | Authenticates; checks forge status, workflow templates, admin overview, and template execution stats. Optional **`-AccessToken`** skips login. | Atina API running; admin-capable user. Optional: `-BaseUrl`, `-Email`, `-Password`, `-ExecutionStatsDays`. |
| `smoke-atina-forge-workflow-template.ps1` | Authenticates; verifies admin workflow execution stats shape (and optionally a template key). Optional **`-AccessToken`** skips login. | Atina API running; admin. Optional: `-BaseUrl`, `-Email`, `-Password`, `-Days`, `-TemplateKey`, `-RequireTemplateKey`. |
| `smoke-hunting.ps1` | **`npm run smoke:hunting`**: readiness → bootstrap → templates → pipeline run → outbound stats. **`-SkipPipeline`** for brzi prolaz. | Atina API + DB; `PHASE=v2`, `AUTONOMY_REAL_ECOSYSTEM_RUNS=true`. Optional: `-AccessToken`, `-VerticalSlug`, `-Intensity`. |
| `vault-db-ops.ps1` | Backs up, prunes, or restores `vault.db` under configurable paths. | Run from **repo root** (paths like `./data/vault.db` resolve from CWD). For restore, backups must exist where expected. |
| `free-port.ps1` | Lists or stops processes listening on a TCP port (default 3000); supports `-DryRun`. | Windows (`Get-NetTCPConnection` / `Stop-Process`). Use an elevated shell if listing or killing fails due to permissions. |

## Parent monorepo (`omni group`)

This folder is **only** Atina Node SaaS helpers. For the **full** repo gate (GitHub job **`python`**, required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../scripts/README.md) → root `pytest` → this package `test:ci` → **`apps/omnigroup-web`** `npm ci` + `build` → Nest `verify:ci` / `verify:n1` → three `docker compose config`; optional **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** locally), run from the **workspace root**: [`verify-monorepo.ps1`](../../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../../scripts/smoke-stack.ps1) (multi-stack HTTP; Atina Node = **GET** `/health` when enabled) · **`npm run smoke:all`** (this folder) — [`release-gate-checklist.md`](../docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`scripts/README.md`](../../../scripts/README.md) (**Port mismatch** za Nest **`POSTGRES_PORT`**) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../scripts/README.md) — **Kad podigneš novi broj**.
