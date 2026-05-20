# Production Secrets and Configuration Matrix

This matrix is referenced from **Nivo 1** production readiness (see `docs/operations/NIVO-1-GATE.md` odjeljak 3).

Use this matrix as the source of truth for production `.env`/secret-store values.

**Monorepo (parent `omni group`):** lokalni red kao GitHub **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) — [NIVO-1-START.md](../../../../NIVO-1-START.md) · [`scripts/README.md`](../../../../scripts/README.md) ([`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) uključuje **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../../scripts/README.md), zatim pytest + **`apps/omnigroup-web`** build osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** za Nest/pg; [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (Atina Node stub = **GET** `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*); PowerShell **Get-Help** vidi [`scripts/README.md`](../../../../scripts/README.md)) · **LATEST verify:** [NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [NIVO-1-SMOKE-EVIDENCE-LATEST.md](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [NIVO-1-F4-TIM-CHECKLIST.md](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

Safe defaults policy:
- Required values must be explicitly set in production boot environments.
- Optional values may use defaults, but defaults must not include production credentials.
- Secrets (`*_SECRET`, `*_PASSWORD`, `*_KEY`) must be injected from a vault/secret manager and rotated on incident or schedule.

## Staging vs prod (SMTP + Stripe)

- **Stripe:** Staging uses Stripe **Test mode** keys and signing secrets only (`pk_test_…`, `sk_test_…`, webhook secrets from the Test-mode endpoint). Production uses **Live mode** keys, live price IDs, and live webhook secrets (see odjeljak 4). Never point staging at live keys or vice versa; store all values in the environment secret store, not in git.
- **SMTP:** Staging may use a non-production mailbox, provider sandbox, or capture sink; keep `SMTP_ENABLED` aligned with whether real delivery is intended. Production uses the real provider, authenticated credentials, and a domain-aligned `EMAIL_FROM` (see odjeljak 3).
- **Webhooks / billing smoke on staging:** Follow [Nivo 2 — staging webhook evidencija](../../../../docs/NIVO-2-STAGING-WEBHOOKS.md) for endpoint registration, test webhooks, and matrix/ticket evidence (no secrets in the repo).

## 1) Core Authentication and App

| Variable | Required (prod) | Secret | Safe default (dev) | Production guidance |
|---|---|---|---|---|
| `NODE_ENV` | Yes | No | `development` | Must be `production`. |
| `APP_URL` | Yes | No | `http://localhost:3000` | Public base URL used by auth/payment links. |
| `PORT` | No | No | `3000` | Override only when platform requires it. |
| `APP_NAME` | No | No | `ATINA` | Branding/display only. |
| `JWT_SECRET` | Yes | Yes | `change-me-in-development` | Strong random secret; never default in production. |
| `JWT_REFRESH_SECRET` | Yes | Yes | `refresh-change-me-dev` | Must be different from access token secret. |
| `JWT_EXPIRES_IN` | No | No | `7d` | Keep aligned with security policy. |
| `JWT_REFRESH_EXPIRES_IN` | No | No | `30d` | Keep aligned with session policy. |

## 2) Database and Redis

| Variable | Required (prod) | Secret | Safe default (dev) | Production guidance |
|---|---|---|---|---|
| `DB_HOST` | Yes | No | `localhost` | Managed DB hostname/private endpoint. |
| `DB_PORT` | No | No | `5432` | Change only for non-standard DB ports. |
| `DB_NAME` | Yes | No | `atina_db` | Dedicated production database name. |
| `DB_USER` | Yes | Yes | `atina_user` | Use least-privilege app role. |
| `DB_PASSWORD` | Yes | Yes | `atina_password` | Vault-managed, rotated credential. |
| `DB_SSL` | No | No | `false` | Set `true` when managed Postgres requires TLS. |
| `DB_POOL_MIN` | No | No | `2` | Tune by workload and DB limits. |
| `DB_POOL_MAX` | No | No | `10` | Tune by workload and DB limits. |
| `REDIS_HOST` | Yes | No | `localhost` | Managed Redis endpoint/private host. |
| `REDIS_PORT` | No | No | `6379` | Non-standard only when required. |
| `REDIS_PASSWORD` | No | Yes | empty | Required if Redis auth is enabled. |
| `REDIS_DB` | No | No | `0` | Isolated logical DB index if needed. |

## 3) SMTP and Notifications

**SMTP:** [`EMAIL-SURFACE.md`](./EMAIL-SURFACE.md) · [`docs/SMTP-STAGING-RUNBOOK.md`](../../../../docs/SMTP-STAGING-RUNBOOK.md) (staging smoke).

| Variable | Required (prod) | Secret | Safe default (dev) | Production guidance |
|---|---|---|---|---|
| `SMTP_ENABLED` | No | No | `false` | Keep `false` unless email delivery is required. |
| `SMTP_HOST` | Conditional | No | `smtp.gmail.com` | Required when `SMTP_ENABLED=true`. |
| `SMTP_PORT` | No | No | `587` | Set to provider port. |
| `SMTP_SECURE` | No | No | `false` | Usually `true` for port 465. |
| `SMTP_USER` | Conditional | Yes | empty | Required when `SMTP_ENABLED=true`. |
| `SMTP_PASSWORD` | Conditional | Yes | empty | Required when `SMTP_ENABLED=true`. |
| `EMAIL_FROM` | No | No | `noreply@atina.io` | Must be sender-domain compliant. |
| `EMAIL_FROM_NAME` | No | No | `ATINA` | Display name only. |

## 4) Payments Providers

| Variable | Required (prod) | Secret | Safe default (dev) | Production guidance |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | Conditional | Yes | empty | Required when Stripe is enabled. |
| `STRIPE_WEBHOOK_SECRET` | Conditional | Yes | empty | Required for Stripe webhook validation. |
| `STRIPE_PUBLISHABLE_KEY` | No | No | empty | Frontend/runtime integration key. |
| `STARTER_PRICE_ID` | No | No | `price_starter` | Replace with real Stripe price IDs in prod. |
| `PRO_PRICE_ID` | No | No | `price_pro` | Replace with real Stripe price IDs in prod. |
| `ENTERPRISE_PRICE_ID` | No | No | `price_enterprise` | Replace with real Stripe price IDs in prod. |
| `PAYPAL_CLIENT_ID` | Conditional | Yes | empty | Required when PayPal is enabled. |
| `PAYPAL_CLIENT_SECRET` | Conditional | Yes | empty | Required when PayPal is enabled. |
| `PAYPAL_MODE` | No | No | `sandbox` | Must be `live` for production processing. |
| `WISE_API_KEY` | Conditional | Yes | empty | Required when Wise is enabled. |
| `WISE_PROFILE_ID` | Conditional | No | empty | Provider account/profile identifier. |

## 5) Forge and Monitoring Thresholds

| Variable | Required (prod) | Secret | Safe default (dev) | Production guidance |
|---|---|---|---|---|
| `FORGE_VAULT_PATH` | Yes | No | `data/vault.db` | Use a persistent absolute path; must end with `.db`. |
| `FORGE_MIN_RESERVE_RSD` | No | No | `0` | Set >0 to enforce reserve guardrails. |
| `FORGE_HARD_STOP_MODE` | No | No | `false` | Set `true` to block execution below reserve. |
| `WORKFLOW_TEMPLATE_SUCCESS_ALERT_THRESHOLD` | No | No | `80` | Integer 1-100; controls admin workflow alert threshold. |

## 6) Admin Bootstrap

| Variable | Required (prod) | Secret | Safe default (dev) | Production guidance |
|---|---|---|---|---|
| `ADMIN_EMAIL` | Yes | No | `admin@atina.io` | Must be controlled and monitored account. |
| `ADMIN_PASSWORD` | Yes | Yes | `Admin@123456` | Replace default and rotate by policy. |
| `ADMIN_NAME` | No | No | `System Admin` | Display name only. |

## 7) Aggregators, Phase, and Pipelines (2026-05-20)

| Variable | Required (prod) | Secret | Safe default (dev) | Production guidance |
|---|---|---|---|---|
| `PHASE` | No | No | `v1` | Boot sync to DB; gates `billing`/`crm`/`analytics` by phase. |
| `AI_URL` / `AI_KEY` | Conditional | Yes | empty | AI aggregator (Craftor, lead-scoring, titan-master, ai-memory). |
| `FINANCE_URL` / `FINANCE_KEY` | Conditional | Yes | empty | PayPal/Wise via finance service when set; else direct provider env. |
| `COMMS_URL` / `COMMS_KEY` | Conditional | Yes | empty | Outreach/follow-up dispatch when set. |
| `SCRAPER_URL` / `SCRAPER_KEY` | Conditional | Yes | empty | Client-hunter / titanis scrape. |
| `CAPTCHA_URL` / `CAPTCHA_KEY` | Conditional | Yes | empty | Captcha aggregator. |
| `DOMAIN_URL` / `DOMAIN_KEY` | Conditional | Yes | empty | Domain registrar aggregator. |
| `WEB3_STORAGE_URL` / `WEB3_STORAGE_KEY` | Conditional | Yes | empty | Web3 storage aggregator. |
| `YOUTUBE_PIPELINE_URL` | Conditional | No | empty | HTTP `POST /run` on `tools/youtube-pipeline` (`PIPELINE_HTTP_PORT`, default 8090). |
| `ELEVENLABS_API_KEY` | Conditional | Yes | empty | OmniTube voice when pipeline uses ElevenLabs. |
| `APEX_SUICIDE_SWITCH_ARMED` | No | No | `false` | Apex-predator soft kill switch; keep `false` unless ops approves. |

Infra secrets (DB, JWT, Redis) remain in `config/env-aggregator.json` for local dev — not committed.

## 8) Rate Limits, Logging, and Feature Flags

| Variable | Required (prod) | Secret | Safe default (dev) | Production guidance |
|---|---|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | No | No | `900000` | Global rate-limit window. |
| `RATE_LIMIT_MAX` | No | No | `100` | Global rate-limit max requests. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | No | `600000` | Auth endpoints window override. |
| `AUTH_RATE_LIMIT_MAX` | No | No | `10` | Auth endpoints max override. |
| `PASSWORD_RESET_WINDOW_MS` | No | No | `3600000` | Password reset window override. |
| `PASSWORD_RESET_MAX` | No | No | `5` | Password reset max override. |
| `PAYMENTS_RATE_LIMIT_WINDOW_MS` | No | No | `600000` | Payments endpoints window override. |
| `PAYMENTS_RATE_LIMIT_MAX` | No | No | `30` | Payments endpoints max override. |
| `WEBHOOK_RATE_LIMIT_WINDOW_MS` | No | No | `60000` | Webhook endpoints window override. |
| `WEBHOOK_RATE_LIMIT_MAX` | No | No | `120` | Webhook endpoints max override. |
| `ADMIN_MUTATION_RATE_LIMIT_WINDOW_MS` | No | No | `900000` | Admin mutation window override. |
| `ADMIN_MUTATION_RATE_LIMIT_MAX` | No | No | `40` | Admin mutation max override. |
| `LOG_LEVEL` | No | No | `info` | Keep `info`/`warn` in production by policy. |
| `LOG_FILE` | No | No | `logs/atina.log` | Ensure writable persistent log path. |
| `ENABLE_SCRAPER` | No | No | `true` | Disable only with approved change window. |
| `ENABLE_AUTOMATION` | No | No | `true` | Disable only with approved change window. |
| `ENABLE_CRM` | No | No | `true` | Disable only with approved change window. |
| `ENABLE_ANALYTICS` | No | No | `true` | Disable only with approved change window. |

## 9) .env.example Alignment (Atina + Forge)

Validated variable coverage against `.env.example`:
- Core app + auth keys
- Postgres + Redis keys
- SMTP toggle and credentials
- Stripe/PayPal/Wise provider keys
- Forge vault and reserve controls
- Admin bootstrap keys
- Rate-limit global and endpoint overrides
- Logging and feature flags

Result: all production matrix variables are represented in `.env.example` and all `.env.example` platform keys are represented in this matrix.

## 10) Production boot validation (gate / stavke)

Run this before every production rollout:

- [ ] `NODE_ENV=production` and no default placeholder secrets remain.
- [ ] All required secret values are loaded from vault/secret manager (not committed in repo).
- [ ] JWT secrets are distinct (`JWT_SECRET` != `JWT_REFRESH_SECRET`) and rotated from defaults.
- [ ] Database values point to production DB, credentials work, and TLS setting (`DB_SSL`) is correct.
- [ ] Payment providers are either fully configured for live mode or intentionally disabled.
- [ ] If SMTP is enabled, `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` are valid and tested.
- [ ] `FORGE_VAULT_PATH` resolves to a persistent writable `.db` location.
- [ ] `WORKFLOW_TEMPLATE_SUCCESS_ALERT_THRESHOLD` is set to a policy-approved value (1-100).
- [ ] Rate-limit overrides are reviewed (`AUTH_*`, `PAYMENTS_*`, `WEBHOOK_*`, `ADMIN_MUTATION_*`).
- [ ] Smoke checks pass after boot: either **`npm run smoke:all`** (bundled; from `atina-platform/atina`) or the individual scripts (`smoke:health`, `smoke:auth`, `smoke:forge:status`, `smoke:atina-forge:workflow-template`, `smoke:forge-admin`). Full staging/prod matrices: [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md).
