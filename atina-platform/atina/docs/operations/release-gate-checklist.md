# Formal release quality gate

This runbook is the formal release quality gate for production deployments. Every gate is mandatory and must include required evidence before a GO decision can be made.

## Gate Policy

- All gates listed below are `REQUIRED`.
- A gate is green only when status is `PASS` and all required evidence is linked.
- Any `FAIL` is an automatic release block until remediation and re-validation.
- `N/A` is exceptional and requires explicit approver rationale in the sign-off record.
- Evidence must map to the exact release candidate (`version/tag`, `commit SHA`, `build ID`).

## Local prerequisites — Atina Node (`atina-platform/atina`) integration gate

The **Integration tests** gate for this package assumes a live PostgreSQL instance and an applied SQL schema.

- **Database name:** use a dedicated database (default in code and `.env.example`: **`atina_saas_db`**) so the SaaS migrations do not collide with another stack reusing **`atina_db`** on the same Postgres.
- **Typical local flow:** from `atina-platform/atina`, run `npm run db:up` (or your own Postgres), ensure `.env` matches host/port/user/password/`DB_NAME`, then **`npm run migrate`**, then **`npm run test:integration`**.
- **Shortcut:** **`npm run test:integration:local`** runs **`npm run migrate`** then **`npm run test:integration`** (same DB prerequisites).
- **Suite location:** `src/tests/integration` (includes `auth.integration.test.ts` against the real middleware stack).
- **CI:** the package workflow provisions a fresh Postgres database **`atina_saas_db`** and runs `npm run migrate` before integration tests (see `.github/workflows/ci.yml`).

## Local notes — Smoke tests (`npm run smoke:all`)

- **vs parent `smoke-stack.ps1`:** from the monorepo root, **`scripts/smoke-stack.ps1`** is a **multi-stack HTTP** probe (Astra + Nest + optional Atina Node). For Atina Node it only hits **`GET /health`** when that stub is enabled — it does **not** run login, `/me`, Forge, or admin checks. Use **`npm run smoke:all`** in **this** package for that bundled gate; details: root [`scripts/README.md`](../../../../scripts/README.md) (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **EVIDENCE-INDEX** / **NIVO-1-DRYRUN-LOG** gde se indeks citira; monorepo job **`python`** → required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) and [`NIVO-1-START.md`](../../../../NIVO-1-START.md) odjeljak 5 (stack order + smoke).
- **`npm run smoke:all`** runs **`scripts/smoke-all.ps1`**: **`GET /health`**, one **`POST /auth/login`**, then the same JWT for **`GET /api/v1/auth/me`**, **`GET /api/v1/forge/status`**, admin workflow **execution-stats** (`smoke-atina-forge-workflow-template.ps1`), and **`smoke-forge-admin.ps1`** (overview + templates + stats) — fewer auth rate-limit hits than chaining separate smokes. Individual scripts (`smoke:auth`, `smoke:forge:status`, …) still perform their own login unless you pass **`-AccessToken`** (see script headers). If **`smoke:all`** fails with **`duplicate key value violates unique constraint "refresh_tokens_token_hash_key"`**, a child smoke script is likely performing a second login because **`-AccessToken`** was not declared in that script’s **`param()`** block (PowerShell drops unknown bound parameters).
- Scripts default to **`http://localhost:3000`**. Another base URL: **`npm run smoke:all -- -BaseUrl "http://host:port"`** (arguments after **`--`** are forwarded to PowerShell). Same pattern for individual smokes, e.g. **`npm run smoke:health -- -BaseUrl "http://127.0.0.1:3001"`**.
- The **running API** must use a PostgreSQL instance with **this package’s migrations applied** to the same `DB_NAME` the process reads from. **Host vs Docker:** `npm run migrate` uses **`DB_HOST`** from your host `.env` (often `localhost`); the **`app`** service in `docker-compose.yml` talks to the **`postgres`** container. If those are not the same physical database, migrate the one the API uses: for the compose stack run **`npm run docker:migrate`** (and optionally **`npm run docker:seed`** for bootstrap data). If **`smoke:auth`** fails with **`relation "plans" does not exist`**, the DB behind that API is not migrated or is the wrong instance.
- **`DB_NAME` mismatch (Docker):** `app` and `postgres` both read **`DB_NAME`** from the same `.env` next to `docker-compose.yml` (default **`atina_saas_db`**). If the **`app`** container was created when `.env` had another value (e.g. `atina_db`), it can point at an empty DB while migrations ran against **`atina_saas_db`**. Check with `docker inspect atina_app` (look for `DB_NAME`); after fixing `.env`, run **`docker compose up -d --force-recreate app`**. **`Invalid email or password`** on **`smoke:auth`** usually means the target DB has no seed — run **`npm run docker:seed`** against that stack.
- **Forge smokes** (`smoke:forge:*`) need a **writable** SQLite vault at `FORGE_VAULT_PATH`. Default **`docker-compose.override.yml`** uses **`forge_vault_app_data:/app/data`** (image pre-`chown`s that path for user `atina`). A bind mount on **`/data`** without matching permissions often yields **`SQLITE_READONLY`** or **`SQLITE_CANTOPEN`**; use the default named volume or fix host permissions (see `docker-compose.override.forge-vault-bindmount.example.yml` for shared vault).
- **Staging / production** per-script smoke matrices, evidence capture, and rollback replays: [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) (optional bundled probe: **`npm run smoke:all -- -BaseUrl "…"`** from `atina-platform/atina`).

## Mandatory Gates and Required Evidence

| Gate | Required Status | Primary Owner | Backup Owner | Required Evidence (minimum) | Verification Command / Runbook |
|---|---|---|---|---|---|
| Lint | PASS | Dev Owner | Tech Lead | CI lint job URL, pass status screenshot/log, commit SHA, execution timestamp (UTC) | `npm run lint` |
| Unit tests | PASS | Dev Owner | QA Lead | CI unit test job URL, summary report, coverage report link/snapshot, commit SHA, execution timestamp (UTC) | `npm run test:unit` |
| Integration tests | PASS | QA Lead | Dev Owner | Integration job URL/report, target environment, test dataset/fixtures reference, commit SHA, execution timestamp (UTC) | `npm run test:integration` |
| Smoke tests | PASS | Release Manager | On-call Engineer | Smoke run output, checks for critical user journeys, service health checks, execution environment, execution timestamp (UTC) | `npm run smoke:all` (see Local notes above); staging/prod detail: [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) |
| Post-deploy verification | PASS | On-call Engineer | Release Manager | Production endpoint verification output, monitoring dashboard links/screenshots, error budget/log query links, verification timestamp (UTC) | `docs/operations/deploy-rollback-checklist.md` post-deploy section |

## Release gate execution (steps)

- [ ] Release scope frozen (`version/tag`, `commit SHA`, `build ID`).
- [ ] Owners assigned for all mandatory gates.
- [ ] Lint gate PASS with required evidence.
- [ ] Unit tests gate PASS with required evidence.
- [ ] Integration tests gate PASS with required evidence.
- [ ] Smoke tests gate PASS with required evidence.
- [ ] Post-deploy verification PASS with required evidence.
- [ ] Known risks reviewed and classified (accepted vs blocking).
- [ ] Rollback owner, rollback trigger, and rollback path confirmed.
- [ ] Go/no-go decision captured in `docs/operations/release-signoff-template.md`.
- [ ] **Auth / HTTP headers (Atina API)**
  - [ ] Production `authenticate` must not treat `x-test-role` as credentials (JWT / API key only). Evidence: `src/tests/unit/auth.middleware.test.ts`, `src/tests/integration/auth.integration.test.ts`, and route suites with 401 + `AUTHENTICATION_ERROR` when auth is off, including `x-test-role: admin` (search route tests for the title fragment `even with x-test-role admin header`). Spot-check: `x-test-role` should appear only under `src/tests`, not under `src/api`, `src/modules`, `src/core`, or `src/utils`.
  - [ ] If both `x-api-key` and `Authorization: Bearer` are present, the API key branch runs first; a failed key does **not** fall back to JWT (`auth.middleware.test.ts`).
  - [ ] `Authorization` must use the **`Bearer`** scheme (prefix match is case-sensitive).
  - [ ] Duplicate header lines: the **first** value wins via `headerFirst` in `src/utils/http-headers.ts` (wired from `auth.middleware.ts`, auth `login`, analytics `/track`, Stripe webhook, `CoreEngine` `x-request-id`). For `x-request-id`, some stacks join duplicates into one comma-separated string — `CoreEngine` then applies `firstCommaSegment` after `headerFirst`. For `X-Forwarded-For`, auth `login` and analytics `/track` store the **client** IP via `clientIpFromForwardedFor` in `src/utils/http-headers.ts` (same as `firstCommaSegment(headerFirst(...))` + socket fallback; first hop in the forwarded chain). Empty first `Authorization` entry is not skipped; empty `x-api-key` array is absent for auth purposes; empty-string first `x-api-key` list entry is falsy (Bearer path). Evidence: `http-headers.test.ts`, `auth.middleware.test.ts`, `core-engine.test.ts` (duplicate `X-Request-Id`).

## Gate Evidence Register (Required Per Release)

| Gate | Status (PASS/FAIL/N/A) | Owner | Verified At (UTC) | Evidence Link(s) | Release SHA/Build ID | Reviewer | Notes |
|---|---|---|---|---|---|---|---|
| Lint |  |  |  |  |  |  |  |
| Unit tests |  |  |  |  |  |  |  |
| Integration tests |  |  |  |  |  |  |  |
| Smoke tests |  |  |  |  |  |  |  |
| Post-deploy verification |  |  |  |  |  |  |  |

## Decision Criteria

- **GO**: all mandatory gates are `PASS`, owners are assigned, and required evidence is complete.
- **NO-GO**: any mandatory gate is `FAIL`, evidence is missing/incomplete, or ownership is not assigned.
- **CONDITIONAL GO**: allowed only with documented risk acceptance by required approvers and a time-bound mitigation plan.
- If any gate regresses after GO, execute rollback per `docs/operations/deploy-rollback-checklist.md`.

## Final Go/No-Go Meeting Pack (10-15 minutes)

Use this as the final release-room agenda and decision artifact.

### Timeboxed Agenda

- Minute 0-2: Confirm release metadata (`version/tag`, `SHA`, `build ID`) and attendee roles.
- Minute 2-7: Review gate evidence register (PASS/FAIL/N/A with links).
- Minute 7-10: Confirm deploy window, rollback owner, rollback trigger thresholds.
- Minute 10-15: Capture decision, required follow-ups, and sign-off.

### Meeting gate (final)

- [ ] Required attendees present: Release Manager, Dev Owner, QA Lead, On-call Engineer, Product/Business approver.
- [ ] All mandatory gates are `PASS` or have approved risk acceptance.
- [ ] Evidence links are accessible and map to this exact release candidate.
- [ ] Deploy/rollback runbook owner confirms execution readiness (`docs/operations/deploy-rollback-checklist.md`).
- [ ] Alert routing and escalation readiness confirmed (`docs/operations/monitoring-alert-channel-policy.md`).
- [ ] Decision recorded in `docs/operations/release-signoff-template.md`.

### Decision Criteria (Meeting Use)

| Decision | Required Conditions |
|---|---|
| GO | All mandatory gates `PASS`; no open Critical risks; rollback readiness confirmed. |
| CONDITIONAL GO | No failing Critical gate; explicit risk owner + mitigation ETA + rollback threshold confirmed. |
| NO-GO | Any mandatory gate `FAIL`; missing evidence for mandatory gate; missing required approver/owner. |

### Sign-Off Block

| Role | Name | Decision (GO/CONDITIONAL GO/NO-GO) | Time (UTC) |
|---|---|---|---|
| Release Manager |  |  |  |
| Dev Owner |  |  |  |
| QA Lead |  |  |  |
| On-call Engineer |  |  |  |
| Product/Business Approver |  |  |  |

## See also

- [Root `scripts/README.md`](../../../../scripts/README.md) — **`Get-Help`** za **`smoke-stack.ps1`** i **`verify-monorepo.ps1`**; ista distinkcija multi-stack **`GET /health`** vs ovaj **`npm run smoke:all`**. Odeljak **Doslednost dok** u tom README-u opisuje pravila doc gate-a (md/txt + yaml/ps1/ini) koja `verify-monorepo.ps1` pokreće pre `pytest`-a (isti prvi korak kao job **`python`** / required check **`Python (Doslednost dok + pytest)`** u **CI (monorepo)** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)); uključuje i par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`** u fajlovima koji citiraju indeks.
- [Deploy and rollback runbook](./deploy-rollback-checklist.md) — staging/prod smoke matrices, optional **`smoke-all.ps1`** usage, rollback verification.
- Monorepo evidence index (verify + smoke šabloni; redovi u **EVIDENCE-INDEX** + **NIVO-1-DRYRUN-LOG**; par **smoke-stack** / **`npm run smoke:all`**): [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md)
- **Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.
- [Nivo 1 dry-run log](../../../../docs/NIVO-1-DRYRUN-LOG.md) — dry-run / deploy / rollback zapisi; uvod povezuje **LATEST smoke** (**sekcija H**) sa **`smoke-stack.ps1`** (tri-stub) i **`npm run smoke:all`** (bundled Atina — *Local notes — Smoke tests* iznad) i indeksom evidencija.
- [Nivo 1 minimal gate (Atina)](./NIVO-1-GATE.md) — build, lint, unit tests, and local smoke flow.
- Monorepo master lista (repo root): [`../../../../NIVO-1-MASTER-CHECKLIST.md`](../../../../NIVO-1-MASTER-CHECKLIST.md)
- Full monorepo gate (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`** gde se indeks citira, u [`scripts/README.md`](../../../../scripts/README.md); zatim root `pytest` + Atina `test:ci` + `apps/omnigroup-web` build + Nest `verify:ci` / `verify:n1` + three `docker compose config`; optional **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** locally): [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (multi-stack HTTP when stacks are up; Atina Node included = **`GET /health`** only — bundled Atina HTTP is **`npm run smoke:all`**, *Local notes — Smoke tests* above) · [`scripts/README.md`](../../../../scripts/README.md) (**Port mismatch** za Nest/pg) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md)
