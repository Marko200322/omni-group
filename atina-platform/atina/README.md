# ATINA — SaaS + AI Automation Platform

> Production-ready modular SaaS platform with multi-provider payments, AI automation, CRM, web scraping, and a full admin panel.

Contributor guide: see `CONTRIBUTING.md` for the standard local dev lifecycle (`dev:ready`, `dev:start`, `dev:check`, `dev:stop`, `dev:restart`).
Operational runbook: see `RUN-ATINA-PLATFORM.txt` for production deployment, verification, and rollback.
Deploy/rollback runbook: see `docs/operations/deploy-rollback-checklist.md` for script-aligned staging dry-run, release, and rollback execution steps, including command matrix and pass/fail rubric.
Production config matrix: see `docs/operations/production-config-matrix.md` for required vs optional env variables, secrets policy, and production boot validation.
Monitoring alert routing policy: see `docs/operations/monitoring-alert-channel-policy.md` for admin-metric thresholds, Slack/Email/Pager routing requirements, and escalation policy.
Logging (Winston, `LOG_LEVEL` / `LOG_FILE`): see [`docs/operations/LOGGING-NOTES.md`](./docs/operations/LOGGING-NOTES.md).

**Kratak opis (SR):** Node/Express SaaS u monorepu **omni group** — lokalni ciklus u `CONTRIBUTING.md`, deploy/rollback u [`docs/operations/deploy-rollback-checklist.md`](./docs/operations/deploy-rollback-checklist.md). N1 brzi gate: [`operations/NIVO-1-GATE.md`](./docs/operations/NIVO-1-GATE.md). Pun **CI (monorepo)** mirror iz korena: [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) · [`scripts/README.md`](../../scripts/README.md).

**Nivo 1 (malo vremena / budžet):** minimalni inženjerski gate — [`operations/NIVO-1-GATE.md`](./docs/operations/NIVO-1-GATE.md). Pun monorepo: [`../../NIVO-1-START.md`](../../NIVO-1-START.md), CI [`../../.github/workflows/ci-monorepo.yml`](../../.github/workflows/ci-monorepo.yml) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../../docs/GIT-BRANCH-PROTECTION.md`](../../docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md); zatim `pytest`; `test:ci`, job **`omnigroup-web`** — `apps/omnigroup-web` build, Nest `verify:ci`, job **`compose`**: tri `docker compose config` uključujući ovaj `docker-compose.yml`). Jedan red lokalno: [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../../docs/GIT-BRANCH-PROTECTION.md`](../../docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (multi-stack HTTP; Atina Node stub = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`operations/release-gate-checklist.md`](./docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) — [`scripts/README.md`](../../scripts/README.md) (**`-SkipOmnigroupWeb`** bez Next build-a; **`-SkipNestVerifyCi`** = Nest `verify:n1` bez Postgresa; **`-SkipCompose`** bez Docker-a; **`-SkipDocAudit`** bez doc gate audita lokalno; **Port mismatch** u istom README-u za Nest/pg port). **F.4** (matrica koraka): [`NIVO-1-F4-TIM-CHECKLIST.md`](../../docs/NIVO-1-F4-TIM-CHECKLIST.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Evidencija / šabloni (monorepo; indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../docs/NIVO-1-DRYRUN-LOG.md) (uvod: par [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) ↔ **`npm run smoke:all`**).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../../apps/omnigroup-web/README.md).

**Smoke iz korena repoa (`smoke-stack.ps1 -SkipNode:$false`):** `smoke-stack` za ovaj Node i dalje šalje samo **GET** `/health` na stubu. Za login, `/me`, Forge i admin u jednom prolazu koristi **`npm run smoke:all`** — formalni Atina release gate: [`operations/release-gate-checklist.md`](./docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). Ako sa hosta **`http://127.0.0.1:3000/health`** ne radi (prazan odgovor / connection closed), a unutar kontejnera `atina_app` `/health` vraća **200**, probaj **`docker restart atina_app`** — [`scripts/README.md`](../../scripts/README.md), [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**LATEST smoke** (**sekcija H**) **Val 351** / 2026-05-14).

**Nivo 2 (E2E / integracija):** [`operations/NIVO-2-E2E.md`](./docs/operations/NIVO-2-E2E.md) · **N2 master lista** [`../../NIVO-2-MASTER-CHECKLIST.md`](../../NIVO-2-MASTER-CHECKLIST.md) · **CEO sekcija D** — trag [`NIVO-2-CEO-D-TRACE.md`](../../docs/NIVO-2-CEO-D-TRACE.md) · PDF/ops [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](../../docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md) · webhooks [`NIVO-2-STAGING-WEBHOOKS.md`](../../docs/NIVO-2-STAGING-WEBHOOKS.md).

Active systems context:
- `atina` is the core SaaS runtime in this repository.
- `forge` is an active module (`src/modules/forge`) used in the live Atina + Forge ecosystem.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + Bull |
| Auth | JWT (access + refresh tokens) |
| Payments | Stripe · PayPal · Wise |
| Email | SMTP (Nodemailer) |
| Validation | Zod |
| Logging | Winston |
| Containerization | Docker + Docker Compose |
| Testing | Jest + Supertest |

---

## ✅ Atina + Forge — production readiness gate

Use this as the minimum go-live gate for any production release:

- [ ] `npm run build` completes successfully.
- [ ] `npm run test:ci` passes (build + lint + unit tests with coverage).
- [ ] Database migrations are reviewed and tested on staging.
- [ ] `.env` is production-safe (no default secrets, `NODE_ENV=production`, `DB_SSL=true` when required).
- [ ] Payment providers are set to live credentials (`Stripe`, `PayPal`, `Wise`) and webhook secrets are validated.
- [ ] SMTP is validated with real credentials when email delivery is required.
- [ ] **`npm run smoke:all`** passes against the target API (`/health`, login, `/auth/me`, `forge/status`, workflow execution-stats smoke, forge-admin — formalni Atina release gate: [`docs/operations/release-gate-checklist.md`](./docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*).
- [ ] Admin monitoring endpoints are checked before and after deploy:
  - `GET /api/v1/admin/overview`
  - `GET /api/v1/admin/workflow/templates/execution-stats?days=30`
- [ ] Rollback owner and rollback trigger conditions are defined before deployment starts.

Use the complete execution sequence and command examples from `RUN-ATINA-PLATFORM.txt`.

**Detaljan redosled signoff-a:** [`operations/release-gate-checklist.md`](./docs/operations/release-gate-checklist.md) · **Nivo 1 brzi gate:** [`operations/NIVO-1-GATE.md`](./docs/operations/NIVO-1-GATE.md) · monorepo: [`../../NIVO-1-MASTER-CHECKLIST.md`](../../NIVO-1-MASTER-CHECKLIST.md).

## 🔁 Rollback Policy (Production)

Trigger rollback immediately if one or more conditions are true:

- `GET /health` fails for more than 5 minutes after deploy.
- Authentication and token refresh flows fail for valid users.
- Payment webhook processing fails or produces invalid billing state.
- Forge workflow success-rate drops significantly or alerting spikes unexpectedly.

Rollback order:

1. Route traffic to previous stable app version.
2. Restore previous `.env` / secret set.
3. If migration introduced breaking behavior, run the paired down migration or restore pre-deploy DB snapshot.
4. Re-run smoke checks and admin reliability endpoints.
5. Publish incident note with root-cause and follow-up actions.

Detailed step-by-step rollback commands are maintained in `RUN-ATINA-PLATFORM.txt`.

---

## 📁 Project Structure

```
src/
├── core/
│   ├── CoreEngine.ts         # App bootstrap, middleware, routing
│   └── ModuleRegistry.ts     # Auto-load module system
├── modules/
│   ├── auth/                 # JWT auth, refresh tokens, email verify
│   ├── users/                # Profiles, API keys
│   ├── billing/              # Plans, invoices
│   ├── payments/             # Stripe, PayPal, Wise
│   ├── subscriptions/        # Subscription lifecycle
│   ├── tasks/                # Job queue + workers
│   ├── automation/           # Workflow engine
│   ├── scraper/              # Web scraping engine
│   ├── crm/                  # Contacts management
│   ├── contracts/            # Contract lifecycle
│   ├── analytics/            # Events + dashboards
│   ├── notifications/        # In-app + email
│   └── admin/                # Admin panel
├── api/middleware/           # Auth, validation, error handling
├── database/
│   ├── connection.ts         # Pool + transaction helpers
│   ├── migrations/           # SQL migration files
│   └── seeds/                # Seed data
├── queue/
│   └── queue.ts              # Bull queue + in-memory fallback
├── config/
│   └── index.ts              # Centralized env config
├── utils/
│   ├── logger.ts             # Winston logger
│   ├── errors.ts             # Custom error classes
│   └── response.ts           # Standardized API responses
└── tests/
    ├── unit/                 # Unit tests
    └── integration/          # Integration tests
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 20.x (project engine: `>=20 <21`)
- PostgreSQL 16+
- Redis 7+

### 1. Clone and install

```bash
git clone <repo>
cd atina
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
```
JWT_SECRET=your_strong_secret
DB_HOST=localhost
DB_USER=atina_user
DB_PASSWORD=your_password
DB_NAME=atina_db
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
```

For local development, keep `SMTP_ENABLED=false` unless you are testing real email delivery.

### 3. Create the database

```bash
psql -U postgres -c "CREATE USER atina_user WITH PASSWORD 'atina_password';"
psql -U postgres -c "CREATE DATABASE atina_db OWNER atina_user;"
```

### 4. Run migrations

```bash
npm run migrate
```

### 5. Seed initial data (plans, modules, admin)

```bash
npm run seed
```

### 6. Start development server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

---

## 🐳 Docker

### Start everything with one command

```bash
# Copy env
cp .env.example .env
# Edit .env as needed

# Build and start (includes Postgres + Redis + App + Migrations)
docker-compose up --build -d

# Seed data (optional, one-time)
docker-compose --profile seed up seed

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

**Monorepo / multi-stack:** u `docker-compose.yml` je podrazumevano **`APP_NODE_ENV=development`** (lokalni `docker compose up` bez produkcijske validacije JWT/DB lozinki iz kratkih placeholder-a). Za pravi **`NODE_ENV=production`** u kontejneru postavi duge tajne u env i uskladi sa `src/config`. **`/app/data`** je u **Dockerfile**-u pripremljen za non-root (`FORGE_VAULT_PATH` podrazumevano → `data/vault.db`).

### Individual container management

```bash
# Rebuild only app
docker-compose up --build app

# Run migrations only
docker-compose run --rm migrate

# Database shell
docker-compose exec postgres psql -U atina_user -d atina_db
```

---

## 🔌 API Reference

Base URL: `http://localhost:3000/api/v1`

### Auth (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login, get tokens |
| POST | `/refresh` | — | Refresh access token |
| POST | `/logout` | — | Revoke refresh token |
| GET | `/me` | ✅ | Get current user |
| POST | `/forgot-password` | — | Request password reset |
| POST | `/reset-password` | — | Reset with token |
| POST | `/change-password` | ✅ | Change password |
| GET | `/verify-email/:token` | — | Verify email |

### Users (`/api/v1/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | ✅ | Get profile |
| PATCH | `/profile` | ✅ | Update profile |
| GET | `/stats` | ✅ | Usage stats |
| GET | `/api-keys` | ✅ | List API keys |
| POST | `/api-keys` | ✅ | Create API key |
| DELETE | `/api-keys/:id` | ✅ | Revoke API key |
| GET | `/` | Admin | List all users |
| PATCH | `/:id` | Admin | Update user |

### Billing (`/api/v1/billing`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/plans` | — | List plans |
| GET | `/plans/:slug` | — | Get plan |
| GET | `/subscription` | ✅ | Current subscription |
| GET | `/invoices` | ✅ | List invoices |
| GET | `/invoices/:id` | ✅ | Get invoice |

### Payments (`/api/v1/payments`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/stripe/checkout` | ✅ | Create checkout session |
| POST | `/stripe/webhook` | — | Stripe webhook (raw body) |
| POST | `/stripe/cancel` | ✅ | Cancel at period end |
| GET | `/stripe/portal` | ✅ | Billing portal URL |
| POST | `/paypal/order` | ✅ | Create PayPal order |
| POST | `/paypal/capture/:orderId` | ✅ | Capture payment |
| POST | `/wise/transfer` | ✅ | Manual transfer instructions |
| POST | `/wise/confirm/:paymentId` | Admin | Confirm Wise payment |
| GET | `/history` | ✅ | Payment history |

### Tasks (`/api/v1/tasks`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ | Create + queue task |
| GET | `/` | ✅ | List tasks |
| GET | `/:id` | ✅ | Get task |
| POST | `/:id/cancel` | ✅ | Cancel task |
| POST | `/:id/retry` | ✅ | Retry failed task |

### CRM (`/api/v1/crm`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/contacts` | ✅ | List contacts |
| POST | `/contacts` | ✅ | Create contact |
| GET | `/contacts/:id` | ✅ | Get contact |
| PATCH | `/contacts/:id` | ✅ | Update contact |
| DELETE | `/contacts/:id` | ✅ | Delete contact |
| POST | `/contacts/bulk` | ✅ | Bulk import |
| GET | `/stats` | ✅ | CRM stats |

### Automation (`/api/v1/automation`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/workflows` | ✅ | List workflows |
| POST | `/workflows` | ✅ | Create workflow |
| POST | `/workflows/:id/execute` | ✅ | Execute workflow |
| DELETE | `/workflows/:id` | ✅ | Delete workflow |
| GET | `/executions` | ✅ | Recent executions |
| GET | `/executions/:id` | ✅ | Execution status |

### Scraper (`/api/v1/scraper`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/scrape` | ✅ | Scrape single URL |
| POST | `/scrape/bulk` | ✅ | Bulk scrape (async) |
| POST | `/preview` | ✅ | URL metadata preview |
| GET | `/jobs` | ✅ | Scrape job history |
| GET | `/jobs/:id` | ✅ | Job status + results |

### Admin (`/api/v1/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/overview` | Admin | Platform stats |
| GET | `/users` | Admin | All users |
| PATCH | `/users/:id` | Admin | Update user/role/plan |
| GET | `/payments` | Admin | All payments |
| GET | `/modules` | Admin | Module list |
| PATCH | `/modules/:id` | Admin | Enable/disable module |
| GET | `/logs` | Admin | System logs |
| GET | `/health` | Admin | Health check |
| GET | `/plans` | Admin | All plans |
| PATCH | `/plans/:id` | Admin | Update plan |
| GET | `/workflow/templates/execution-stats?days=30&templateKey=<key>` | Admin | Workflow template execution stats by template key (optional drilldown filter; includes `lastRunAt`) |

---

## 📦 Plans & Features

| Feature | Starter ($9.99/mo) | Pro ($49.99/mo) | Enterprise ($199.99/mo) |
|---------|:-:|:-:|:-:|
| API Access | ✅ | ✅ | ✅ |
| Tasks/month | 50 | 500 | Unlimited |
| Team members | 1 | 10 | Unlimited |
| CRM | ❌ | ✅ | ✅ |
| Automation | ❌ | ✅ | ✅ |
| Web Scraper | ❌ | ✅ | ✅ |
| Contracts | ❌ | ✅ | ✅ |
| Analytics | Basic | Advanced | Advanced |
| White Label | ❌ | ❌ | ✅ |
| SSO | ❌ | ❌ | ✅ |

---

## 🔒 Authentication

**JWT Bearer Token:**
```
Authorization: Bearer <accessToken>
```

**API Key:**
```
X-API-Key: atina_<key>
```

---

## 🧪 Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm test -- --coverage
```

---

## 🌐 Environment Variables Reference

See `.env.example` for the full list of configuration options and required/optional labels.
Use `docs/operations/production-config-matrix.md` as the production source of truth for:
- JWT/DB/SMTP/payment provider secret requirements

Za mapu SMTP modula, pozivalaca i imena env ključeva iz `.env.example` vidi [`docs/operations/EMAIL-SURFACE.md`](./docs/operations/EMAIL-SURFACE.md).
- Forge vault path and reserve controls
- Workflow template alert threshold policy
- Production boot validation (gate / stavke — matrix §9)

SMTP toggle:
- `SMTP_ENABLED=false` disables SMTP verification and email sending (recommended for local dev).
- `SMTP_ENABLED=true` enables SMTP, and requires valid `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD`.

Forge vault path:
- `FORGE_VAULT_PATH` is optional; when unset it defaults to `data/vault.db`.
- Relative values are resolved from repository root (`process.cwd()`), absolute paths are preserved.
- Invalid values (empty or non-`.db` paths) fail startup with a clear config error.

---

## 🔧 Stripe Webhook Setup

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Forward webhooks to local: `stripe listen --forward-to localhost:3000/api/v1/payments/stripe/webhook`
3. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env`

---

## ⚙️ Atina + Forge Operations Runbook

Atina (platform runtime) and Forge (`src/modules/forge`) are active systems in the same local lifecycle. Use this runbook for predictable operation and regression-safe checks.

### Standard lifecycle

```bash
npm run dev:ready
npm run dev:start
npm run dev:check
```

Operational command reference:

| Command | Purpose |
|---|---|
| `npm run dev:bootstrap` | Start DB services, run migrations, seed data |
| `npm run dev:ready` | Bootstrap + lint pre-start readiness |
| `npm run dev:start` | DB up + free port 3000 + app start |
| `npm run dev:check` | **`smoke:all`** (`scripts/smoke-all.ps1`) + **`lint`** |
| `npm run dev:restart` | Stop + start |
| `npm run dev:stop` | Free app port + stop postgres/redis |
| `npm run smoke:health` | Health endpoint validation |
| `npm run smoke:auth` | Auth endpoint validation |
| `npm run smoke:forge:status` | Forge status endpoint validation |
| `npm run smoke:atina-forge:workflow-template` | Admin `execution-stats` smoke (response shape); use **`-RequireTemplateKey`** to require `ecosystem-hunt-to-conversion` in aggregates |
| `npm run smoke:forge-admin` | Combined Forge + admin reliability smoke |
| `npm run smoke:all` | Runs **`scripts/smoke-all.ps1`**: **`GET /health`**, one **`POST /auth/login`**, then the same JWT for **`/auth/me`**, **`GET /api/v1/forge/status`**, workflow execution-stats smoke, **`smoke-forge-admin.ps1`** (fewer auth rate-limit hits than chaining separate smokes). Non-default URL: **`npm run smoke:all -- -BaseUrl "http://127.0.0.1:3001"`** — detail (formalni release gate): [`docs/operations/release-gate-checklist.md`](./docs/operations/release-gate-checklist.md) *Local notes — Smoke tests* |

*Monorepo tri-stub HTTP (repo root):* [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) proverava Astra + Nest + opciono ovaj Node sa **GET** `/health` na stubu — nije zamena za **`smoke:all`**; vidi [`scripts/README.md`](../../scripts/README.md).

### Forge operational endpoints

Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/forge/status` | ✅ | Vault/runtime status |
| GET | `/forge` | ✅ | List Forge workspaces |
| POST | `/forge` | ✅ | Create Forge workspace |
| POST | `/forge/:id/run` | ✅ | Execute a Forge run (supports `Idempotency-Key`) |

### Atina + Forge monitoring endpoints (Admin)

Use these as your primary reliability readouts before/after platform changes:

- `GET /api/v1/admin/workflow/templates/execution-stats?days=30`
- `GET /api/v1/admin/overview`

The template stats endpoint returns `summary`, `alerts`, and per-template run metrics (`successRate`, `failedRuns`, etc.) and should be the first place to check for cross-system degradation.

Quick verification commands:

```bash
npm run smoke:all
npm run smoke:forge:status
npm run smoke:atina-forge:workflow-template
```

### Vault DB backup/retention/recovery

Use the helper script `scripts/vault-db-ops.ps1` through npm:

```bash
npm run vault:backup
npm run vault:prune
npm run vault:restore:latest
```

Custom source/paths (PowerShell examples):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\vault-db-ops.ps1 -Action backup -VaultPath .\data\vault.db -BackupDir .\data\vault-backups
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\vault-db-ops.ps1 -Action prune -RetentionDays 14 -KeepLast 20
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\vault-db-ops.ps1 -Action restore-file -SourceFile .\data\vault-backups\vault-20260401-120000.db
```

PowerShell compatibility note:
- Smoke commands are wired through `package.json` using `powershell -NoProfile -ExecutionPolicy Bypass -File ...`.
- Run them via `npm run ...` from PowerShell (recommended) to avoid quoting/execution-policy issues.
- If **`AUTH_RATE_LIMIT_EXCEEDED`** appears after many logins, wait for `retryAfterSeconds` or use **`npm run smoke:all`** (single login for the authenticated steps).

---

## 🩺 Troubleshooting

- `EADDRINUSE: address already in use :::3000`:
  - Free the port: `npm run free:port`
  - Then restart: `npm run dev:start`
- Health check fails:
  - Confirm DB/Redis containers are up (`npm run db:up`)
  - Run bootstrap: `npm run dev:bootstrap`
  - Retest: `npm run smoke:health`
- Auth smoke fails:
  - Verify JWT/env settings in `.env`
  - Rerun auth smoke: `npm run smoke:auth`
- SMTP warning on startup:
  - Keep `SMTP_ENABLED=false` for local development
  - Enable SMTP only for real email-flow testing
- Forge `/run` duplicates or retries:
  - Use `Idempotency-Key` for safe retriable calls
  - Check the same key behavior before re-running manual tests

---

## ✅ Daily gate (Atina + Forge)

- [ ] `npm run dev:ready` passes
- [ ] `npm run dev:start` has app healthy on `http://localhost:3000/health`
- [ ] `npm run dev:check` passes
- [ ] Forge endpoints (`/forge/status`, `/forge`, `/forge/:id/run`) are validated when Forge code changed
- [ ] Admin monitoring endpoints checked for template reliability after workflow-chain changes
- [ ] `npm run dev:stop` executed when done

---

## 📝 License

MIT — See LICENSE file.

---

Built with ❤️ by ATINA Team
