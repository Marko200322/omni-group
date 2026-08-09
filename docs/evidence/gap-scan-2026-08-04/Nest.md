# Nest (`atina-system`) production readiness audit

## Executive answer

**Nest is not required for the current omnigrouptech.com live product.**  
Live traffic is served by **`atina-platform/atina`** (Express) + **`apps/omnigroup-web`** (Next.js). Nest is a **parallel stack** for PDF/TSC scenarios, local dev, CI, and future expansion — explicitly **not** in the live Docker compose file.

---

## Live stack vs Nest stack

| Layer | Live prod (`docker-compose.prod.yml`) | Nest dev/CI (`docker-compose.atina.yml`) |
|--------|----------------------------------------|------------------------------------------|
| API | `atina-api` → `atina-platform/atina` :3000 | `atina-api` → `atina-system` :3001→3000 |
| Web | `web` → `apps/omnigroup-web` | — |
| DB | Shared Postgres `atina_saas_db` | **Separate** Postgres (`atina` DB, port 5433) |
| Proxy | Caddy → `web` + `atina-api` only | — |
| Nest service | **Absent** | Present |

**Caddy routing** (`infra/caddy/Caddyfile`): only `web:3000` and `atina-api:3000`. No Nest host, no port 3001.

**Confirmed live state** (`docs/ADMIN-JEDNA-LISTA.md`): VPS runs web, atina-api, postgres, redis, caddy; fulfillment **850/850 PASS**; item #5 notes *"Nest **nije** u live Docker stacku"*.

---

## TYPEORM_SYNC — current state

| Location | Value | Risk |
|----------|-------|------|
| `atina-system/.env.example` | `TYPEORM_SYNC=true` | Dev default only |
| `docker-compose.atina.yml` L58 | `TYPEORM_SYNC: "true"` | Dev bootstrap; Talas 113 **WARN** |
| `config/env-aggregator.json` | `"true"` | Local aggregator only |
| Live prod compose | **Not set** (Nest not deployed) | N/A |

**Runtime logic** (`atina-system/src/app.module.ts`):

```31:34:atina-system/src/app.module.ts
const typeOrmSynchronize =
  !isProduction &&
  !e2eWithDb &&
  process.env.TYPEORM_SYNC !== 'false';
```

With `NODE_ENV=production`, **`synchronize` is always off** regardless of `TYPEORM_SYNC`. The CEO C gate still requires explicit **`TYPEORM_SYNC=false`** in deploy env plus migrations — belt-and-suspenders, not optional if Nest ever ships.

---

## Migrations — repo readiness

| Item | Status |
|------|--------|
| Migration file | `atina-system/src/database/migrations/1739126400000-InitialSchema.ts` (users, leads, contracts, invoices, vault, supply heartbeat) |
| CLI DataSource | `atina-system/src/database/data-source.ts` — `synchronize: false` |
| Scripts | `migration:run`, `migration:show`, `migration:revert` in `package.json` |
| CI gate | `verify:ci` = build + unit + **`migration:run`** + e2e |
| Prod evidence | `docs/TYPEORM-PROD-EVIDENCE-LATEST.md` — **not closed** ("čeka izvršenje") |

**Critical:** Live DB uses **Atina Node** migrations (`schema_migrations` + `.sql` files), including its own `users` table. **Do not run Nest `migration:run` against `atina_saas_db`** — schema collision risk. Nest prod needs a **dedicated Postgres** (separate DB or instance), as in `docker-compose.atina.yml`.

---

## Auth — stubs vs real

| Module | Status |
|--------|--------|
| **auth** | **Real** — bcrypt + JWT (`auth.service.ts`, `JwtStrategy`, controller tests, e2e) |
| **users, crm, billing, contracts, analytics, supply-core** | Real CRUD + tests |
| **ai** | **Stub** — returns `[Atina AI stub]…` without `OPENAI_API_KEY` |
| **notifications** | **Stub** — `transport: 'logger-stub'` |
| **Prod env guard** | `validate-production-env.ts` — rejects short/placeholder `JWT_SECRET`, requires `CORS_ORIGINS` |

Live site auth is **Atina Node JWT** (`atina-platform/atina`), not Nest. `omnigroup-web` has no runtime calls to Nest (no `3001`, `NEST_*`, or Nest URL env).

---

## CEO section C — checklist state

From `CHECKLIST-CEO-SISTEM.md` section C:

| Item | Status |
|------|--------|
| `verify:ci` green | **[x]** (repo + CI) |
| npm audit plan | **[x]** (`NPM-AUDIT-NIVO1.md` — 4 high prod deps documented) |
| Migrations in repo | **[x]** |
| All Nest modules + tests | **[x]** |
| **Prod: `TYPEORM_SYNC=false` + migrations on prod DB** | **[ ]** — **only open CEO C item** |

`docs/VLASNIK-DOSTAVA.md` item 17: *"Nest TypeORM prod — **samo ako Nest u prod**"*.

---

## What fails if Nest stays off?

**On omnigrouptech.com today: nothing user-facing breaks.**

| Area | Impact if Nest off |
|------|---------------------|
| Site, checkout, IBAN, admin, fulfillment 17×50 | **No impact** — all via Atina Node |
| `api.omnigrouptech.com` | **No impact** — Caddy → Atina Node only |
| Login / register / dashboard | **No impact** — Atina Node auth |
| Workflow-chain `atina-system` module slug | **No impact** — in-process Node module, not Nest HTTP |
| Local/CI tri-stub smoke (CEO H) | Nest stub fails if you run `smoke-stack.ps1` without Nest up — **not prod** |
| CEO C checklist | **Stays open** until evidence filed |
| Future Nest-in-prod (backlog item #9) | Blocked until Nest added to compose + dedicated DB |

---

## Ordered steps to close CEO C

Given Nest is **not** in live prod, two valid paths:

### Path A — Close as **N/A until Nest enters prod** (matches current architecture)

1. **Record decision** — Live product does not deploy Nest; CEO C prod DB step applies only when Nest joins `docker-compose.prod.yml` (see `docs/VLASNIK-DOSTAVA.md` #17).
2. **Confirm repo gate** — `npm run verify:ci` in `atina-system` passes (already **[x]** in CEO list).
3. **Update evidence** — In `docs/TYPEORM-PROD-EVIDENCE-LATEST.md`: status **N/A**, reason *Nest not in prod stack*, date, owner; note live DB is Atina Node `schema_migrations`, not Nest `migrations`.
4. **Mark checklist** — `[x]` on CEO C line 95 **with N/A annotation**, or leave `[ ]` until Path B if you want strict literal compliance.

### Path B — Full CEO C closure (prepare Nest for future prod)

1. **Provision dedicated Nest Postgres** — New DB/instance (not `atina_saas_db`); credentials in secrets only.
2. **Backup** — `pg_dump` per `TYPEORM-PRODUCTION-CHECKLIST.md` step 2.
3. **Review migration** — Read `1739126400000-InitialSchema.ts` `up()` SQL.
4. **Set prod env** — `NODE_ENV=production`, **`TYPEORM_SYNC=false`**, `POSTGRES_*`, `POSTGRES_SSL=true`, `JWT_SECRET` ≥32 chars, `CORS_ORIGINS=https://omnigrouptech.com` (or target domain).
5. **Run migrations** — From `atina-system/`: `npm ci && npm run build && npm run migration:run` against **Nest-only** DB.
6. **Verify** — `SELECT name FROM migrations ORDER BY id DESC LIMIT 5;` shows `InitialSchema1739126400000`.
7. **Deploy Nest** (optional now) — Add service to prod compose or K8s (`infra/k8s/base/nest-api/` exists but is example/staging scaffolding).
8. **Smoke** — `GET /health` on Nest URL; `npm run verify:ci` locally as regression.
9. **File evidence** — Complete `docs/TYPEORM-PROD-EVIDENCE-LATEST.md` (Pass block per checklist template).
10. **Check off** — `[x]` CEO C line 95 in `CHECKLIST-CEO-SISTEM.md` + `docs/ADMIN-JEDNA-LISTA.md` item #5.

**Recommended for current live product:** Path A for honesty; Path B steps 1–6 only if you plan Nest+Python+Astra in prod (backlog #9).

---

## Readiness summary

| Dimension | Repo / CI | Live prod |
|-----------|-----------|-----------|
| In docker-compose.prod.yml | N/A | **No** |
| TYPEORM_SYNC=false | Documented; not enforced on live (Nest absent) | N/A |
| Migrations | 1 migration + CLI ready | **Not applied** (no Nest DB) |
| verify:ci | Green in CI/local | N/A |
| Auth | Real JWT (not stub) | Unused on live |
| CEO C | 1 open prod item | Blocked by Nest-not-deployed + evidence |

**Bottom line:** Nest is **repo-ready for CI** and **architecturally optional** for omnigrouptech.com. CEO C is a **governance/evidence gate**, not a live-product blocker. Closing it today means either documenting **N/A** or standing up a **separate Nest database** — never migrating Nest schema onto the live Atina SaaS database.

[REDACTED]
