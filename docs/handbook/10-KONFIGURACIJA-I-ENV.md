# 10 — Konfiguracija i env promenljive

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`09-MODEL-PODATAKA.md`](./09-MODEL-PODATAKA.md) · Sledeće: [`11-RAZVOJ-I-TESTIRANJE.md`](./11-RAZVOJ-I-TESTIRANJE.md)

Pravila: (1) tajne nikad u git (`.env*` su ignorisani; primeri su `*.example`); (2) svaki stack ima svoj `.env`, a `config/env-aggregator.json` daje **ne-tajne** podrazumevane vrednosti koje se primenjuju samo ako env nije postavljen; (3) produkciona matrica tajni je u [`../SECRETS-MATRIX.md`](../SECRETS-MATRIX.md) i `atina-platform/atina/docs/operations/production-config-matrix.md`.

## Pregled fajlova

| Fajl | Za koga | Napomena |
|------|---------|----------|
| `atina-platform/atina/.env.example` | Express Atina (~420 linija) | Učitava `src/config/index.ts` |
| `atina-system/.env.example` | Nest | `apply-env-aggregator.ts` dopunjava iz agregatora |
| `apps/omnigroup-web/.env.example` | Next | `NEXT_PUBLIC_*` idu u browser |
| `tools/youtube-pipeline/.env.example` | Celery pipeline | Učitava i Atina `.env` |
| `.env.docker.prod.example` (koren) | `docker-compose.prod.yml` | `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `ATINA_PORT`, `WEB_PORT`, `AUTONOMY_ENABLED`, `AUTONOMY_AUTO_START_SCHEDULER` |
| `config/env-aggregator.json` | Svi | Sekcije `atina`, `nest`, `omnigroupWeb`, `youtubePipeline` |
| `sistem_naplate/config.example.py` | Offline skripte | Telegram, IBAN |

## Express Atina — po grupama

### Aplikacija, baza, Redis

| Promenljiva | Podrazumevano / napomena |
|-------------|---------------------------|
| `NODE_ENV`, `PORT` (3000), `APP_URL`, `APP_NAME`, `PHASE` | `PHASE` bira koji moduli se montiraju |
| `DB_HOST`, `DB_PORT`, `DB_NAME` (`atina_saas_db`), `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_POOL_MIN/MAX` | |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` | Bez Redis-a Bull pada na in-memory |
| `LOG_LEVEL`, `LOG_FILE` | Winston |

### Auth i admin

`JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` (seed admin).

### Plaćanja

| Grupa | Promenljive |
|-------|-------------|
| Režim | `PAYMENTS_MODE` (`manual` u M0), `ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION`, `WEB_APP_URL` (redirect posle plaćanja), `PAYMENT_NOTIFY_EMAIL` |
| Ručna uplata | `MANUAL_PAYMENT_ACCOUNT_NAME`, `MANUAL_PAYMENT_IBAN`, `MANUAL_PAYMENT_BANK`, `MANUAL_PAYMENT_SWIFT`, `MANUAL_PAYMENT_CURRENCY`, `MANUAL_PAYMENT_REFERENCE_PREFIX`, `MANUAL_PAYMENT_NOTE` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `STARTER_PRICE_ID`, `PRO_PRICE_ID`, `ENTERPRISE_PRICE_ID` (ili `FINANCE_URL/KEY` agregator) |
| PayPal / Wise | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`; `WISE_API_KEY`, `WISE_PROFILE_ID` |
| Kriptoman | `KRIPTOMAN_ENABLED`, `KRIPTOMAN_URL`, `KRIPTOMAN_API_KEY`, `KRIPTOMAN_WEBHOOK_SECRET`, `KRIPTOMAN_MERCHANT_ID`, `KRIPTOMAN_DEFAULT_CRYPTO`, `KRIPTOMAN_DEV_MOCK` (runbook `docs/INTEGRACIJA-KRIPTOMAN.md`) |
| Naknade u ponudi | `PRICING_FEE_{MANUAL,STRIPE,PAYPAL,KRIPTOMAN}_RATE` i `_FIXED_EUR` |

### Motor cena (`pricing` sekcija konfiguracije)

`PRICING_EUR_USD_RATE`, `PRICING_TARGET_MARGIN_PCT`, `PRICING_YEARLY_INFRA_DISCOUNT`, `PRICING_DEFAULT_TAM_USD`, `PRICING_COMPETITION_DISCOUNT_MAX`, `PRICING_COST_SCRAPER_USD_PER_RUN`, `PRICING_COST_INFRA_USD_PER_HOUR`, `PRICING_COST_SUPPORT_USD_PER_HOUR`, `PRICING_COST_STORAGE_USD_PER_GB`. Regionalni multiplikatori (`balkan` 0.8, `eu` 1, `dach` 1.8, `global` 1) su u kodu (`lib/market-pricing.ts`), ne u env-u — namerno, da server i web ostanu identični.

### Agregatori (10) i AI

`AI_URL`, `AI_KEY`, `AI_MODEL`, `HUNT_GEMINI_MODEL`; `BUSINESS_AND_DEV_URL/KEY`; `SCRAPER_URL/KEY`; `FINANCE_URL/KEY`; `COMMS_URL/KEY`; `INFRASTRUCTURE_URL/KEY` (+ `INFRASTRUCTURE_LOCAL_FALLBACK`); `STORAGE_URL/KEY`; `CAPTCHA_URL/KEY`; `DOMAIN_URL/KEY`; `WEB3_STORAGE_*`. Bez ključeva moduli rade u determinističkom fallback režimu (PDF-ovi se generišu iz šablona, scraper vraća fixture).

### Autonomy loop, evolucija, Product Factory

| Grupa | Promenljive |
|-------|-------------|
| Petlja | `AUTONOMY_ENABLED`, `AUTONOMY_AUTO_START_SCHEDULER`, `AUTONOMY_TICK_INTERVAL_MS` (300000), `AUTONOMY_MAX_VERTICALS_PER_TICK`, `AUTONOMY_AUTO_DEPLOY`, `AUTONOMY_GIT_REPO_PATH`, `AUTONOMY_GENERATED_DIR`, `AUTONOMY_WEB_GENERATED_INDEX_PATH`, `AUTONOMY_REAL_ECOSYSTEM_RUNS` |
| Rollout kategorija | `AUTONOMY_CATEGORY_ROLLOUT_ENABLED`, `_MAX_CATEGORIES`, `_BATCH_SIZE`, `AUTONOMY_ROLLOUT_SEGMENT` |
| Budžet (USD) | `AUTONOMY_INITIAL_BUDGET_USD`, `AUTONOMY_MAX_SPEND_PER_TICK_USD`, `AUTONOMY_MAX_SPEND_PER_DAY_USD`, `AUTONOMY_MIN_RESERVE_USD`, `AUTONOMY_REVENUE_REINVEST_RATE`, `AUTONOMY_COST_{RESEARCH,GENERATE,DEPLOY,AI_LEARN,MARKETING}_USD` |
| Marketing / outreach | `AUTONOMY_MARKETING_ENABLED`, `AUTONOMY_MARKETING_MIN_PRIORITY`, `OUTREACH_DAILY_CAP`, `OUTREACH_WARMUP_MODE`, `OUTREACH_DOMAIN_WARMUP_COMPLETE`, `OUTREACH_DEV_SEND_TO_FALLBACK`, `OUTREACH_FALLBACK_EMAIL` |
| Evolucija | `AUTONOMY_EVOLUTION_RUN_TESTS`, `AUTONOMY_EVOLUTION_CODE_EDIT`, `CURSOR_API_KEY`, `CURSOR_MODEL`, `CURSOR_RUNTIME`, `CURSOR_REPO_PATH`, `CURSOR_CLOUD_REPO_URL`, `CURSOR_EVOLUTION_ENABLED`, `CURSOR_AGENT_ENABLED` |
| Product Factory | `PRODUCT_FACTORY_ENABLED`, `PRODUCT_FACTORY_OUTPUT_DIR`, `PRODUCT_FACTORY_RUN_TESTS`, `PRODUCT_FACTORY_INTERNAL_LANE`, `PRODUCT_FACTORY_MAX_INTERNAL_PER_TICK` |
| Obaveštenja | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `AUTONOMY_TELEGRAM_NOTIFY` |

### Lead baze i hunting

`LEAD_DATABASE_ENABLED`, `LEAD_DATABASE_ROLLOUT_PHASE` (F0–F5, `docs/operations/LEAD-DATABASES-PHASED.md`), `LEAD_ENRICH_ON_HUNT`, `LEAD_ENRICH_MAX_PER_RUN`, `LEAD_DATABASE_PROVIDER_CHAIN`, `EMAIL_VERIFICATION_PROVIDER_CHAIN`, `APOLLO_API_KEY`, `HUNTER_API_KEY`, `LUSHA_API_KEY`, `SNOV_USER_ID`, `SNOV_API_KEY`, `ZOOMINFO_API_KEY`, `ZOOMINFO_API_URL`, `NEVERBOUNCE_API_KEY`, `ZEROBOUNCE_API_KEY`.

### Avatari, sastanci, mediji

`SUPPORT_AVATAR_ENABLED`, `SALES_AVATAR_ENABLED`, `SALES_MEETINGS_ENABLED`, `SUPPORT_AGENT_*` / `SALES_AGENT_*` (ime, titula, avatar URL, glas, pozdrav, persona), `SUPPORT_AGENTS_JSON`, `SALES_AGENTS_JSON`, `SUPPORT_GOOGLE_MEET_URL`, `SALES_GOOGLE_MEET_URL`, `MEETING_DEFAULT_DURATION_MIN`, `ZOOM_ACCOUNT_ID/CLIENT_ID/CLIENT_SECRET`, `AVATAR_VIDEO_PROVIDER_CHAIN` (HeyGen → D-ID), `HEYGEN_API_KEY`, `DID_API_KEY`, `AVATAR_TTS_PROVIDER_CHAIN`, `ELEVENLABS_API_KEY`, `ELEVENLABS_DEFAULT_VOICE_ID`, `CARTESIA_API_KEY/VOICE_ID/MODEL_ID`, `AVATAR_CLIENT_MEMORY_ENABLED`, `AVATAR_PUBLIC_BASE_URL`. Stack: `docs/AVATAR-MEDIA-STACK.md`.

### E-mail, push, Forge, video, ostalo

| Grupa | Promenljive |
|-------|-------------|
| SMTP | `SMTP_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_FROM_NAME` (runbook `docs/SMTP-STAGING-RUNBOOK.md`) |
| Web Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| Forge (Node) | `FORGE_VAULT_PATH`, `FORGE_MIN_RESERVE_RSD`, `FORGE_HARD_STOP_MODE` |
| Video | `YOUTUBE_PIPELINE_URL`, `PIPELINE_HTTP_PORT`, `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN`, `YOUTUBE_PRIVACY_STATUS` |
| Craftor / Steam / Apex | `CRAFTOR_USE_REAL_SCRAPER`, `CRAFTOR_DEPLOY_PATH`, `STEAM_WEB_API_KEY`, `APEX_*` |
| Feature flagovi | `ENABLE_SCRAPER`, `ENABLE_AUTOMATION`, `ENABLE_CRM`, `ENABLE_ANALYTICS`, `WORKFLOW_TEMPLATE_SUCCESS_ALERT_THRESHOLD` |
| Rate limit | `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*`, `AUTH_SESSION_RATE_LIMIT_*`, `PASSWORD_RESET_*`, `PAYMENTS_RATE_LIMIT_*`, `WEBHOOK_RATE_LIMIT_*`, `ADMIN_MUTATION_RATE_LIMIT_*` |

## Nest `atina-system`

`NODE_ENV`, `PORT` (3001), `PHASE`, `POSTGRES_HOST/PORT/USER/PASSWORD/DB/SSL`, `POSTGRES_SSL_REJECT_UNAUTHORIZED`, `JWT_SECRET`, `TYPEORM_SYNC` (**false u produkciji**), `TYPEORM_LOG`, `CORS_ORIGINS`, `REDIS_HOST/PORT`, `TRUST_PROXY`, `INTERNAL_QUEUE_SMOKE_KEY`, `INTERNAL_QUEUE_SMOKE_RATE_*`, `E2E_WITH_DB`, `NEST_NODE_ENV`.

## Omnigroup web

`NEXT_PUBLIC_ATINA_API_BASE`, `ATINA_API_BASE`, `NEXT_PUBLIC_SITE_URL`, `SESSION_SECRET` / `AUTH_SESSION_SECRET`, `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO`, `CONTACT_CRM_INGRESS_EMAIL`, `CONTACT_CRM_INGRESS_PASSWORD`, `CONTACT_SLACK_WEBHOOK_URL`.

## Python stack

| Proces | Promenljive |
|--------|-------------|
| Forge | `VAULT_PATH`, `INITIAL_BUDGET_RSD`, `FORGE_INTERVAL_SEC`, `FORGE_COST_MIN_RSD`, `FORGE_COST_MAX_RSD` |
| Atina worker | `VAULT_PATH`, `INITIAL_BUDGET_RSD`, `ATINA_INTERVAL_SEC`, `ATINA_BATCH_LIMIT` |
| Astra | `VAULT_PATH`, `INITIAL_BUDGET_RSD`, `PORT`, `FLASK_DEBUG` |
| YouTube pipeline | `PIPELINE_HTTP_PORT`, `REDIS_HOST/PORT/DB`, `LOCAL_STORAGE_PATH`, `OUTPUT_PATH`, `MAX_WORKERS`, `LOG_LEVEL`, opciono `AI_*`, `SCRAPER_*`, `YOUTUBE_*` |

## Minimalni setovi po scenariju

| Scenario | Obavezno |
|----------|----------|
| Lokalni razvoj (sve fake) | Atina: `DB_*`, `REDIS_*`, `JWT_*`, `ADMIN_*`, `PAYMENTS_MODE=manual`; web: `NEXT_PUBLIC_ATINA_API_BASE`, `SESSION_SECRET` |
| Produkcija M0 (ručna uplata) | + `ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION=true`, `MANUAL_PAYMENT_*`, `WEB_APP_URL`, `APP_URL`, `SMTP_*` ili `PAYMENT_NOTIFY_EMAIL`, `TELEGRAM_*`; web: `RESEND_API_KEY`, `CONTACT_*`, `ATINA_API_BASE` |
| Stripe uključen | + `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price ID-jevi ili `plans.stripe_price_id_*` |
| AI generisanje dokumenata | + `AI_URL`, `AI_KEY`, `AI_MODEL` (inače fallback šabloni) |
| Lead-gen retainer / lead-list | + `SCRAPER_*`, `LEAD_DATABASE_ENABLED`, bar jedan od `APOLLO/HUNTER/...`, `NEVERBOUNCE` ili `ZEROBOUNCE` |
| AI recepcioner / AI podrška | + `SUPPORT_AVATAR_ENABLED`, `AI_*`, TTS/video lanac po želji |
| Video pipeline retainer | + `YOUTUBE_PIPELINE_URL` i pokrenut `tools/youtube-pipeline` |

## Tajne u Cloud Agent okruženju

Cloud Agent VM nema produkcione tajne; dev `.env` fajlovi se prave skriptom `omni-cloud-start` sa lokalnim podrazumevanim vrednostima (lokalni Postgres/Redis, `PAYMENTS_MODE=manual`). Ako je potreban pravi ključ, vlasnik ga dodaje kroz Cursor Dashboard → Cloud Agents → Secrets, pa se u VM pojavljuje kao env promenljiva.
