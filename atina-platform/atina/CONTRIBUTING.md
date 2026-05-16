# Contributing

This repository is actively developed as an Atina + Forge system. Contribute with a "safe first" workflow: boot predictable local infra, verify core endpoints, then ship changes with smoke checks.

When the wider **omni group** monorepo is on **Level 1** (limited time/budget), use the minimal gate doc: `docs/operations/NIVO-1-GATE.md` and repo-root `NIVO-1-START.md`.

## Monorepo parent checkout (`omni group`)

If this project sits under the **omni group** workspace root, one local pass matching **CI (monorepo)** runs **[`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1)** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../docs/GIT-BRANCH-PROTECTION.md); first step **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md); then `pytest`, then this package’s `npm run test:ci`, then **`apps/omnigroup-web`** build, Nest `verify:ci`, ×3 `docker compose config`; optional **`-SkipOmnigroupWeb`**, **`-SkipDocAudit`** locally only). Options and **Get-Help**: **[`scripts/README.md`](../../scripts/README.md)** (**Port mismatch** when Nest `verify:ci` / `POSTGRES_PORT` ≠ host DB port). **LATEST verify:** **[`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md)** (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)). Team **F.4** runbook: **[`NIVO-1-F4-TIM-CHECKLIST.md`](../../docs/NIVO-1-F4-TIM-CHECKLIST.md)**. Multi-stack HTTP smoke (Astra + Nest + optional Atina Node **GET** `/health`): [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1). Bundled Atina checks (**login**, **`/me`**, Forge, admin): **`npm run smoke:all`** — formalni Atina release gate: [`docs/operations/release-gate-checklist.md`](docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../docs/NIVO-1-DRYRUN-LOG.md) · kanonski [`scripts/README.md`](../../scripts/README.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## Local Dev Lifecycle (Required)

Run these in order for a reliable local environment:

```bash
npm run dev:ready
npm run dev:start
npm run dev:check
```

What each command does:

- `npm run dev:ready`: bootstrap (`db:up + migrate + seed`) and run lint.
- `npm run dev:start`: ensure DB services, free local app port, then start dev API.
- `npm run dev:check`: run **`npm run smoke:all`** ( **`scripts/smoke-all.ps1`**: health, login once, `/me`, Forge status, workflow execution-stats smoke, forge-admin) then **`npm run lint`** while the app is running.

Stop environment:

```bash
npm run dev:stop
```

Restart quickly:

```bash
npm run dev:restart
```

## Atina + Forge Operational Scope

- `atina`: core platform runtime in this repo.
- `forge`: active module in `src/modules/forge`, currently in live development scope.
- Platform-level reliability is monitored via admin workflow template stats and alerts:
  - `GET /api/v1/admin/workflow/templates/execution-stats?days=30`
  - `GET /api/v1/admin/overview`

Use these two admin endpoints before and after meaningful backend changes to validate no reliability regressions were introduced.

## API/Endpoint validation gate

Use `http://localhost:3000` for local base URL.

Core checks:

- `GET /health`
- `GET /api/v1/admin/overview` (admin token)
- `GET /api/v1/admin/workflow/templates/execution-stats?days=30` (admin token)

Forge checks (authenticated):

- `GET /api/v1/forge/status`
- `GET /api/v1/forge`
- `POST /api/v1/forge`
- `POST /api/v1/forge/:id/run`

PowerShell quick checks:

```powershell
npm run smoke:all
```

For narrow debugging (each script logs in separately unless you pass **`-AccessToken`** — see `scripts/*.ps1` headers). Script index and prerequisites: [`scripts/README.md`](scripts/README.md). If you extend **`smoke-all.ps1`**, every invoked script must declare **`[string]$AccessToken`** in **`param()`** so the JWT is applied (otherwise a second login runs and Postgres may error on **`refresh_tokens`** — see `docs/operations/release-gate-checklist.md`, *Smoke tests*).

*Monorepo tri-stub HTTP (workspace root):* [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) covers Astra + Nest + optional this Node with **GET** `/health` on the stub — not a substitute for **`npm run smoke:all`** here; see root [`scripts/README.md`](../../scripts/README.md).

```powershell
npm run smoke:health
npm run smoke:auth
```

## Operational Flow For New Modules/Endpoints

Apply this flow for every new module or endpoint change:

1. **Define contract first**
   - Document route, method, auth scope, request/response shape, and error codes.
   - Add/update validation schema and permission checks before wiring handlers.
2. **Implement and register**
   - Register module wiring in the same PR as route/controller/service changes.
   - Ensure config keys are documented in `.env.example` if new settings are required.
3. **Test and smoke**
   - Add unit tests for core logic and integration tests for endpoint contracts.
   - Run: `npm run dev:check`, then execute impacted manual endpoint checks.
4. **Monitor and release**
   - For workflow/Forge-impacting changes, verify:
     - `GET /api/v1/admin/overview`
     - `GET /api/v1/admin/workflow/templates/execution-stats?days=30`
   - Add rollback trigger + verification steps in PR notes.

## PR readiness gate

Before opening or updating a PR:

- [ ] `npm run dev:ready` completes without errors.
- [ ] API is up and `npm run dev:check` passes.
- [ ] Atina + Forge impacted endpoints were manually verified.
- [ ] New modules/endpoints include contract docs and matching tests.
- [ ] If workflow-chain behavior changed, both admin monitoring endpoints were checked.
- [ ] Docs were updated if endpoint behavior, contracts, or runbook changed.
- [ ] No secrets were added to docs, source, fixtures, or commits.

## Production change gate (Atina + Forge)

Use this gate for any release-bound PR (features, fixes, infra, migrations):

- [ ] `npm run build` passes locally or in CI.
- [ ] `npm run test:ci` passes.
- [ ] Forward migration is validated in staging with realistic data.
- [ ] Backward path exists (down migration or snapshot restore procedure documented).
- [ ] Deployment runbook updates are reflected in `RUN-ATINA-PLATFORM.txt`.
- [ ] `.env.example` remains synchronized with config keys and safe defaults.
- [ ] Post-deploy verification steps are documented in PR description:
  - `GET /health`
  - `GET /api/v1/admin/overview`
  - `GET /api/v1/admin/workflow/templates/execution-stats?days=30`
  - impacted Forge endpoints (`/api/v1/forge/*`)

## Rollback Drill Requirement

Before merging high-impact changes (auth, billing, migrations, workflows), define rollback in the PR:

1. Rollback trigger conditions (what failure metrics/statuses force rollback).
2. Rollback owner (who executes and who approves).
3. Technical rollback steps (app version, env/secret restore, DB reversal method).
4. Verification steps after rollback.

If rollback cannot be performed in under 15 minutes, call it out explicitly and require release-owner approval.

## Troubleshooting

### Port 3000 already in use

```bash
npm run free:port
```

If needed, rerun:

```bash
npm run dev:start
```

### Local state drift (migrations/seed mismatch)

```bash
npm run dev:stop
npm run dev:ready
```

### Smoke checks failing unexpectedly

1. Confirm app is running: `GET /health`.
2. Prefer **`npm run smoke:all`** (one login for authenticated steps via `scripts/smoke-all.ps1`; see `docs/operations/release-gate-checklist.md`). If you hit **`AUTH_RATE_LIMIT_EXCEEDED`**, wait for `retryAfterSeconds` or use **`smoke:all`** instead of many separate logins.
3. Re-authenticate and retry **`npm run smoke:auth`** when isolating auth only.
4. Check `.env` values for JWT, DB, and payment provider keys.
5. Re-run bootstrap: `npm run dev:bootstrap`.

### Forge endpoint fails with auth/plan errors

1. Ensure you are using an authenticated user token.
2. Confirm test account has required plan permissions for Forge module usage.
3. Retry with a clean auth flow (`/api/v1/auth/login`) and then rerun endpoint calls.

## Notes for Contributors

- Prefer minimal, scoped PRs.
- Add tests for changed behavior when possible (unit first, integration for endpoint contract changes).
- Keep docs synced with behavior changes, especially for run commands and API operations.
