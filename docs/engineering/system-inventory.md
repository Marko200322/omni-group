# Omni Group — System Inventory (Phase 1)

**Generated:** 2026-09-20  
**Phase:** 1 — inventory only (no code changes per engineering orchestration rules)  
**Source of truth:** GitHub monorepo at repo root  
**Canonical ops list:** [`../STATUS-KANON.md`](../STATUS-KANON.md)  
**Prior map (partial overlap):** [`../../SYSTEM-MAP.md`](../../SYSTEM-MAP.md)

---

## 1. Purpose

This document satisfies **Phase 1** of the Master AI Engineering Orchestration: a single inventory of runnable systems, modules, data stores, integrations, tests, deployment, and secrets *handling* (not secret values).

**Not in scope for Phase 1:** fixes, refactors, architecture audit findings, security findings (Phases 2–9).

---

## 2. Executive summary

| Layer | Role in production today |
|-------|---------------------------|
| **`apps/omnigroup-web`** | Public site, client dashboard, admin UI; **BFF** proxies to Atina API (`/api/atina/*`, `/api/auth/*`, `/api/contact`) |
| **`atina-platform/atina`** | **Primary backend** on VPS (`atina-api` container, port 3000 internal); Express + TypeScript; Postgres + Redis |
| **`atina-system`** | NestJS stack; **not** in live `docker-compose.prod.yml` (N/A for current prod gate — see STATUS-KANON LIVE) |
| **Python (root)** | Forge worker, Atina worker, **Astra** HTTP (`:8080`); local/dev multi-stack; optional vs prod Docker prod compose |
| **`tools/outreach-engine`** | n8n stub / outreach automation assets (not live mass send) |
| **`tools/youtube-pipeline`** | Celery pipeline (optional; keys often empty) |
| **VPS prod** | `docker-compose.prod.yml`: postgres, redis, migrate/seed profiles, **atina-api**, **web**, **caddy** |

**Live URLs (prod):** https://omnigrouptech.com · https://api.omnigrouptech.com  
**Staging:** `staging.omnigrouptech.com` — **not deployed** (P3-D01 DEFERRED)

---

## 3. Repository layout (top level)

| Path | Type |
|------|------|
| `apps/omnigroup-web/` | Next.js 14 app (standalone Docker build) |
| `atina-platform/atina/` | Atina SaaS API + 64 feature modules |
| `atina-system/` | NestJS API (PDF/Titan scenarios, Bull/Redis when enabled) |
| `tests/` | Root **Python pytest** |
| `scripts/` | Deploy, audit, E2E, cron install, factory phase (~100+ PS1/SH) |
| `docs/` | Runbooks, STATUS-KANON, generated audits |
| `deploy-secrets.local/` | **Local only** (gitignored): `deploy.config.json`, SSH keys |
| `atina-platform/atina/KLJUCEVI-POPUNI.local.txt` | Integration key source → synced to `.env` / deploy config |
| `docker-compose.prod.yml` | Production VPS stack |
| `docker-compose.yml` | Python forge/atina/astra + vault volume |
| `docker-compose.atina.yml` | Nest + Postgres + Redis |
| `infra/k8s/`, `infra/observability/` | Future / deferred (PHASE=v2, not K8s prod) |
| `sve/` | PDF blueprints / Master Spec references |
| `sistem_naplate/` | Billing domain notes (legacy folder name) |

---

## 4. Applications and services

### 4.1 Production (VPS)

| Service | Image / build | Depends on | Notes |
|---------|---------------|------------|--------|
| `postgres` | postgres:16-alpine | — | DB `atina_saas_db` |
| `redis` | redis:7-alpine | — | Sessions, queues, cache |
| `migrate` | atina builder | postgres | Profile `setup`; SQL migrations |
| `seed` | atina builder | postgres | Profile `setup` |
| `atina-api` | `omni-group-atina-api` | postgres, redis | Autonomy scheduler runs in-process |
| `web` | `omni-group-web` | atina-api healthy | Next standalone, host 3010→3000 |
| `caddy` | caddy:2-alpine | web, atina-api | TLS termination, public 443 |

Env files on VPS (from local templates):  
`atina-platform/atina/.env.docker.prod`, `apps/omnigroup-web/.env.production`, root `.env.docker.prod`.

Deploy entry: `scripts/deploy-from-local-secrets.ps1` → `prepare-vps-prod.ps1` → `deploy-config-env.ps1` → `deploy-to-vps.ps1`.

### 4.2 Local / dev stacks

| Stack | Compose file | Typical ports |
|-------|--------------|---------------|
| Atina Node full | `atina-platform/atina/docker-compose.yml` | 3000, 5432, 6379 |
| Python + Astra | root `docker-compose.yml` | 8080 |
| Nest atina-system | `docker-compose.atina.yml` (+ optional `docker-compose.nest-port-3001.yml`) | 3001, 5433, 6380 |
| n8n outreach | `tools/outreach-engine/docker-compose.n8n.yml` | optional |

### 4.3 Frontend (omnigroup-web)

| Area | Routes (examples) |
|------|-------------------|
| Marketing | `/`, `/services`, `/products`, `/pricing`, `/contact`, `/solutions/*` |
| Legal | `/legal/*` |
| Auth | `/login`, `/register`, `/forgot-password` |
| Client | `/dashboard`, billing success/cancel |
| Admin | `/admin`, `/admin/mobile` |
| Dev ops | `/dev/docs`, `/dev/status` (STATUS-KANON dashboard) |
| Public sites | `/sites/[slug]` |
| BFF | **~136** `src/app/api/**/route.ts` handlers (proxy + session cookies + CSRF) |

### 4.4 Backend API surface (Atina Node)

- Base path: `/api/v1/...` (web BFF uses `/api/atina/...` prefix).
- Module registration via `src/modules/*/*.module.ts` (**64 modules**).
- Health: `GET /health` (also exposed via web `/api/health`).

---

## 5. Atina Node — registered modules (64)

Each row is a `*.module.ts` under `atina-platform/atina/src/modules/`:

| Module | Domain hint |
|--------|-------------|
| admin | Users, invites, payments list, market KPI |
| analytics | Admin analytics |
| ai-memory | Recall / remember |
| ai-rag | RAG chunks |
| alert-system | System alerts |
| apex-predator | Apex predator providers |
| api-gateway | Gateway facade |
| atina-system | Bridge to Nest/system concepts |
| audit-log | Audit events |
| auth | Login, JWT, sessions |
| automation | Automation hooks |
| autonomy-loop | Scheduler, outbound queue, evolution, budget |
| backup-recovery | Backup ops |
| billing | Catalog, fulfillment, deliverables, invoices |
| client-hunter | Job board / hunt copy |
| compliance | Compliance checks |
| contracts | Contracts |
| craftor | Craftor generation |
| crm | Contacts |
| cursor-agent | Cursor agent runs |
| deal-offer | Deal offers |
| digital-signature | Signatures |
| dominus360 | Dominus360 runner |
| follow-up | Follow-up |
| follow-up-automation | Automated follow-up |
| forge | Forge vault / workflows |
| gdpr | GDPR |
| integration-hub | Integrations |
| kpi | KPI |
| lead-scoring | Lead scoring |
| live-call-avatar | Live avatar / Recall |
| load-balancer | Load balancer module |
| marketing-growth | Marketing growth |
| notifications | Email, in-app |
| omnigame | Omnigame |
| omnitube | Omnitube |
| outreach | Outreach campaigns |
| package-pricing | Package pricing |
| payments | Stripe, manual, Wise, PayPal, Kriptoman, webhooks |
| phase-launch | Phase launch gates |
| problem-hunter | Problem Hunter signals |
| product-factory | Internal product factory |
| proxy-rotation | Proxy rotation |
| public-site | Client public sites |
| recommendation | Recommendations |
| resource-management | Resources |
| resource-procurement | Procurement orders |
| scaling | Scaling |
| scraper | Scraper / Apify |
| self-healing | Self-healing |
| sistem-naplate | Legacy billing naming |
| subscriptions | Subscriptions |
| tasks | Tasks |
| template-engine | Templates |
| titan-master | Titan master |
| titan-monitor | Titan monitor |
| titan-score | Titan score |
| titanis | Titanis runs |
| titanix | Titanix |
| users | User profile |
| validator | Validation |
| video-meetings | Zoom/Meet support booking, avatars |
| workflow-chain | Workflow templates |

**Naming note:** PDF/Master Spec “50 modules” map loosely to these folders; **depth and production readiness vary per module** (verify in Phase 4 business-logic audit).

**Astra:** Python HTTP service (root Dockerfile), not an Express module.  
**Titan* modules:** Present in Node codebase; not all exposed on public marketing UI.

---

## 6. Data layer

| Store | Technology | Usage |
|-------|------------|--------|
| Primary OLTP | PostgreSQL 16 | Users, billing, fulfillment, CRM, autonomy, etc. |
| Migrations | SQL files | `atina-platform/atina/src/database/migrations/` — **39** files (`001` … `037_problem_hunter`, etc.) |
| Cache / queue | Redis 7 | Sessions, Bull (Nest), Atina queue patterns |
| Python vault | SQLite (volume) | Forge/Atina worker shared ledger (`VAULT_PATH`) |
| Uploads | Local volume | `UPLOAD_DIR` on web container |
| Forge vault (Node) | SQLite path | `FORGE_VAULT_PATH` / `data/vault.db` |

ORM: raw SQL + repositories in Atina Node (not TypeORM on prod API). Nest uses TypeORM when run separately.

---

## 7. Authentication and authorization

| Concern | Implementation |
|---------|----------------|
| Web session | HTTP-only cookies, `og_csrf`, BFF login/logout |
| API auth | JWT / session validation on Atina routes |
| Admin vs user | Role checks on admin module routes |
| BFF security tests | e.g. `billing.module.routes.security.test.ts` |

**Phase 3** will verify IDOR, webhook auth, rate limits, admin exposure (inventory only lists touchpoints).

---

## 8. Billing, payments, delivery

| Flow | Components |
|------|------------|
| Catalog / packages | `billing`, `package-pricing`, package-industry data |
| Checkout | Stripe test, manual IBAN, deliverable checkout BFF |
| Webhooks | Stripe (`/payments/stripe/webhook`), Kriptoman, Wise paths |
| Fulfillment | `deliverable-fulfillment` service, jobs, artifacts, QA approve |
| Invoices | PDF generation, SMTP + Resend, email templates |
| Subscriptions | `subscriptions`, Stripe invoice handlers |

**Prod evidence:** fulfillment matrix 850/850; E2E `scripts/e2e-billing-prod.ps1` PASS (see STATUS-KANON).

---

## 9. Integrations (external services)

Configured via `deploy.config.json` / KLJUCEVI (see [`../generated/EMPTY-KEYS.md`](../generated/EMPTY-KEYS.md)):

| Category | Providers (representative) |
|----------|----------------------------|
| Email | Resend, SMTP (Gmail app), optional Courier (`COMMS_*`) |
| Payments | Stripe **test**, manual; PayPal/Wise/Kriptoman keys often empty (P2) |
| Outbound | Instantly (API; account may be billing-limited), n8n stub |
| AI | OpenRouter (`AI_KEY`), optional aggregators |
| Scrape / leads | Apify, Hunter, Apollo, Snov, NeverBounce, ZeroBounce |
| Comms | Telegram bot (contact notify), Slack webhooks **empty** (P0-04/05) |
| Video / avatar | HeyGen, D-ID, ElevenLabs, Cartesia, Zoom **join URLs** |
| DNS / domain | Spaceship (manual); Resend domain API |

---

## 10. Background work and cron

| Mechanism | Location | Prod notes |
|-----------|----------|------------|
| Autonomy scheduler | In-process `atina-api` | Factory phase M6; caps in env |
| M4 daily hunt | `scripts/m4-daily-hunt.sh` | VPS cron via `install-m4-daily-cron.ps1`; send gated `M4_OUTBOUND_SEND` |
| Keep-warm | `install-keep-warm-cron.ps1` | HTTP ping prod |
| Product factory tick | API routes + autonomy | Internal lane |
| Nest Bull | `atina-system` only | When Redis configured |

---

## 11. Testing infrastructure

| Suite | Command / location |
|-------|-------------------|
| Python | `python -m pytest` (`tests/`) |
| Atina unit | `atina-platform/atina` → `npm run test:ci` (coverage threshold) |
| Atina integration | `npm run test:integration` (needs DB) |
| Atina smoke | `npm run smoke:all` |
| Web | `npm run build` (Next.js) |
| Nest | `npm run verify:ci` / `verify:n1` |
| Monorepo gate | [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md); **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**) |
| Prod autonomous audit | `scripts/audit-prod-autonomous.ps1` |
| Prod E2E billing | `scripts/e2e-billing-prod.ps1` |
| Fulfillment matrix | `scripts/e2e-fulfillment-matrix-prod.ps1` |

**Phase 5** will produce a full **test coverage matrix** vs critical flows listed in orchestration email.

**CI (GitHub):** `.github/workflows/ci-monorepo.yml` — jobs: `python`, `atina-saas`, `omnigroup-web`, `atina-system`, `compose`.  
**Gap vs orchestration ideal:** no single PR gate running full E2E + security scan + integration on every PR (partial coverage).

---

## 12. CI/CD and release

| Step | Mechanism |
|------|-----------|
| PR checks | GitHub Actions (see above) |
| Prod deploy | `deploy-from-local-secrets.ps1` (-SafeDeploy skips migrate) |
| Migrations | `migrate` Docker profile or manual rebuild |
| Rollback doc | [`../ROLLBACK-OWNER.md`](../ROLLBACK-OWNER.md) |
| Branch protection | [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md) |

---

## 13. Secrets and configuration (handling only)

| Source | Purpose |
|--------|---------|
| `deploy-secrets.local/deploy.config.json` | VPS, domains, SMTP, Resend, Stripe test, factory phase, webhooks |
| `KLJUCEVI-POPUNI.local.txt` | Integration keys → `apply-integration-keys.ps1` |
| Generated | `.env`, `.env.vps.prod`, `.env.docker.prod`, `.env.vps.production` |
| Never commit | Passwords, API keys, SSH keys, DB dumps in `deploy-secrets.local/` |

---

## 14. AI / agent tooling in repo

| Component | Role |
|-----------|------|
| `cursor-agent` module | Cursor evolution / agent runs (guarded by env flags) |
| `autonomy-loop` | Budget, outbound, evolution ticks |
| `problem-hunter` | Multi-source problem signals |
| `product-factory` | Internal deliverable generation |

**Safety locks (prod):** `AUTONOMY_AUTO_DEPLOY=false`, cold send OFF, Stripe test — see STATUS-KANON.

---

## 15. Overlap: operational P0 (owner) vs engineering program

These are **outside Phase 1 inventory** but block specific go-live items:

| ID | Item | Owner | Agent can after input |
|----|------|-------|------------------------|
| P0-01 | DMARC TXT | **DONE** (2026-09-20) | `_dmarc` verified |
| P0-04/05 | Slack webhooks | **DONE** (2026-09-20) | Contact + ops webhooks on prod |
| P0-07 | Legal counsel sign-off | Ti | Mark DONE in kanon |
| — | Instantly plan upgrade | Ti | Verify API + accounts |
| P2 | LLC, Stripe live, payment APIs | Ti | Deploy pipeline ready |

**Agent DONE (ops):** P0-02, P0-03 (env flag), P0-06, P1 8/8.

---

## 16. Engineering orchestration — next phases (not started)

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | This file (`system-inventory.md`) | **DONE** (2026-09-20) |
| 2 | [`architecture-audit.md`](./architecture-audit.md) | **DONE** (2026-09-20) |
| 3 | [`security-audit.md`](./security-audit.md) | **DONE** (2026-09-20) |
| 4 | [`business-logic-audit.md`](./business-logic-audit.md) | **DONE** (2026-09-20) |
| 5 | [`test-coverage-matrix.md`](./test-coverage-matrix.md) | **DONE** (2026-09-20) |
| 6–8 | [`reliability-performance-mobile-audit.md`](./reliability-performance-mobile-audit.md) | **DONE** (2026-09-20) |
| 9 | [`master-audit.md`](./master-audit.md) | **DONE** (2026-09-20) |
| 10+ | Fix process (PR-by-PR) | **Blocked** until explicit approval |

**Rule:** No source changes during Phases 1–9 documentation pass except explicitly approved fix phase.

---

## 17. Related documents (existing)

| Doc | Use |
|-----|-----|
| [`../STATUS-KANON.md`](../STATUS-KANON.md) | P0–P3 + LIVE single list |
| [`../generated/PROD-AUDIT.md`](../generated/PROD-AUDIT.md) | Automated prod checks |
| [`../generated/EMPTY-KEYS.md`](../generated/EMPTY-KEYS.md) | Empty integration keys |
| [`../TEST-PLAN-KOMPLETAN.md`](../TEST-PLAN-KOMPLETAN.md) | Legacy full test plan |
| [`../../SYSTEM-MAP.md`](../../SYSTEM-MAP.md) | Ports, compose, naming |
| [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) | PR workflow |

---

## 18. Phase 1 exit criteria — checklist

- [x] Repository structure documented  
- [x] Production vs dev stacks identified  
- [x] Primary backend modules listed (64)  
- [x] Frontend BFF role documented  
- [x] Database migration count and stores listed  
- [x] CI/CD and deploy paths referenced  
- [x] Integrations and cron summarized  
- [x] Overlap with STATUS-KANON P0/P2 stated  
- [x] Phase 2 architecture audit  
- [x] Phase 3 security audit  

**Stop point:** Phases 1–9 complete. See [`master-audit.md`](./master-audit.md) before Phase 10 fixes.
