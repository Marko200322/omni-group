# Secrets matrica — sve env varijable za produkciju

**Cilj:** jedan fajl gde vidiš **svaku** env varijablu koju treba postaviti za produkcioni boot (Atina Node SaaS, Nest atina-system, Python Forge/Astra). Sa primerom, validacionim pravilom i mestom gde se konzumira u kodu.

**Pravilo:** ovaj dokument **NIKADA** ne sme da sadrži pravu vrednost — samo placeholdere i primere oblika. Realne vrednosti idu u secret manager (1Password / Bitwarden / AWS Secrets Manager / GitHub Secrets / `.env` na serveru — ne u repo).

**Glavni `.env` šabloni u repou:**
- Atina Node SaaS: [`atina-platform/atina/.env.example`](../atina-platform/atina/.env.example)
- Nest atina-system: [`atina-system/.env.example`](../atina-system/.env.example)
- YouTube pipeline (opciono): [`tools/youtube-pipeline/.env.example`](../tools/youtube-pipeline/.env.example)

**Povezano:**
- Vlasnik paket: [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md)
- CEO sekcija G evidencija: [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md)
- TypeORM prod: [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md)
- Agregatori (7× URL + KEY): `atina-platform/atina/.env` — vidi [`AGENT-HANDOFF-OSTALO.md`](./AGENT-HANDOFF-OSTALO.md)

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## A. Atina Node SaaS (`atina-platform/atina`) — produkcija

### A.1 Core / app
| Variable | Required (prod) | Primer (forma) | Validaciono pravilo | Konzumira |
|----------|-----------------|----------------|---------------------|-----------|
| `NODE_ENV` | **DA** | `production` | Mora biti tačno `production` da se uključe prod validacije | `src/config/index.ts` |
| `APP_URL` | DA | `https://app.<tvoj-domen>` | Mora biti https u prod | konfiguracija + email linkovi |
| `APP_NAME` | NE | `ATINA` | string | branding |
| `PORT` | NE | `3000` | broj | server bootstrap |

### A.2 Database (Postgres)
| Variable | Required (prod) | Primer | Validaciono pravilo | Konzumira |
|----------|-----------------|--------|---------------------|-----------|
| `DB_HOST` | **DA** | `atina-prod.cluster-abc.eu-central-1.rds.amazonaws.com` | non-empty | `src/database/` |
| `DB_NAME` | **DA** | `atina_saas_db` | NE menjati posle inicijalne migracije bez `--force-recreate` | isto |
| `DB_USER` | **DA** | `<prod-user>` | non-empty | isto |
| `DB_PASSWORD` | **DA** | `<jak-pass>` | **NE sme** biti `atina_password` u prod (boot pada) | isto |
| `DB_PORT` | NE | `5432` | broj; default 5432 | isto |
| `DB_PORT_EXPOSE` | NE | `5433` | Windows + Docker Desktop workaround za `localhost:5432` ECONNRESET | `docker-compose.yml` |
| `DB_SSL` | DA (managed DB) | `true` | `true` za RDS / Supabase / Neon; `false` za lokalni Docker | TypeORM/pg config |
| `DB_POOL_MIN` | NE | `2` | broj | pool config |
| `DB_POOL_MAX` | NE | `10` | broj | pool config |

### A.3 Redis (BullMQ)
| Variable | Required (prod) | Primer | Validaciono pravilo | Konzumira |
|----------|-----------------|--------|---------------------|-----------|
| `REDIS_HOST` | **DA** | `<redis-host>` | non-empty | queue, cache |
| `REDIS_PORT` | NE | `6379` | broj | isto |
| `REDIS_PASSWORD` | DA (managed Redis) | `<pass>` | required za Redis Cloud | isto |
| `REDIS_DB` | NE | `0` | broj 0–15 | isto |

### A.4 JWT / Auth
| Variable | Required (prod) | Primer | Validaciono pravilo | Konzumira |
|----------|-----------------|--------|---------------------|-----------|
| `JWT_SECRET` | **DA** | random 32+ char hex | **min 32 znaka**, NE smeju biti placeholder iz `.env.example` (boot pada) | auth middleware |
| `JWT_REFRESH_SECRET` | **DA** | drugi random 32+ char | isto kao gore | refresh token logika |
| `JWT_EXPIRES_IN` | NE | `7d` | string | token issuer |
| `JWT_REFRESH_EXPIRES_IN` | NE | `30d` | string | isto |

> **Generiši:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — daje 64 hex znaka (32 bajta entropije).

### A.5 Admin bootstrap
| Variable | Required (prod) | Primer | Validaciono pravilo | Konzumira |
|----------|-----------------|--------|---------------------|-----------|
| `ADMIN_EMAIL` | **DA** | `<tvoj-admin-email>` | valid email | seed prilikom bootstrapa |
| `ADMIN_PASSWORD` | **DA** | `<jak-min-12-char>` | **NE sme** biti `Admin@123456` u prod (boot pada) | seed |
| `ADMIN_NAME` | NE | `System Admin` | string | seed |

### A.6 Stripe (opciono — koristi ako prodaješ kroz Stripe)
| Variable | Required | Primer | Validaciono pravilo | Konzumira |
|----------|----------|--------|---------------------|-----------|
| `STRIPE_SECRET_KEY` | DA (ako Stripe enabled) | `sk_live_…` | **mora `sk_live_`** u prod (NE `sk_test_`) | `src/modules/payments/stripe-*` |
| `STRIPE_WEBHOOK_SECRET` | DA (ako webhook) | `whsec_…` | iz Stripe webhook endpoint stranice | webhook handler |
| `STRIPE_PUBLISHABLE_KEY` | NE | `pk_live_…` | za frontend (ako koristi Stripe.js) | client-side |
| `STARTER_PRICE_ID` | NE | `price_…` | iz Stripe Products | billing |
| `PRO_PRICE_ID` | NE | `price_…` | isto | isto |
| `ENTERPRISE_PRICE_ID` | NE | `price_…` | isto | isto |

### A.7 PayPal (opciono)
| Variable | Required | Primer | Validaciono pravilo | Konzumira |
|----------|----------|--------|---------------------|-----------|
| `PAYPAL_CLIENT_ID` | DA (ako PayPal enabled) | `<live-client-id>` | iz live REST app | payments |
| `PAYPAL_CLIENT_SECRET` | DA | `<live-secret>` | isto | isto |
| `PAYPAL_MODE` | DA u prod | `live` | mora `live` u prod (NE `sandbox`) | isto |

### A.8 Wise (opciono — payouts)
| Variable | Required | Primer | Validaciono pravilo | Konzumira |
|----------|----------|--------|---------------------|-----------|
| `WISE_API_KEY` | DA (ako Wise enabled) | `<live-key>` | live token | payouts |
| `WISE_PROFILE_ID` | DA | `<profile-id>` | broj iz Wise naloga | isto |

### A.9 Forge (vault)
| Variable | Required (prod) | Primer | Validaciono pravilo | Konzumira |
|----------|-----------------|--------|---------------------|-----------|
| `FORGE_VAULT_PATH` | **DA** | `/var/lib/atina/vault.db` | apsolutna putanja na **persistent volume** (ne ephemeral container disk) | Forge engine |
| `FORGE_MIN_RESERVE_RSD` | NE | `0` | broj (RSD min rezerva) | execution guard |
| `FORGE_HARD_STOP_MODE` | NE | `false` / `true` | bool | execution guard |

### A.10 SMTP (opciono — samo ako šalješ email)
| Variable | Required | Primer | Validaciono pravilo | Konzumira |
|----------|----------|--------|---------------------|-----------|
| `SMTP_ENABLED` | NE (default false) | `true` | bool string | email service |
| `SMTP_HOST` | DA (ako SMTP_ENABLED=true) | `smtp.sendgrid.net` | non-empty | isto |
| `SMTP_PORT` | NE | `587` | broj 587/465/25 | isto |
| `SMTP_SECURE` | NE | `false` | bool; true za 465 | isto |
| `SMTP_USER` | DA (ako SMTP) | `<smtp-user>` | non-empty | isto |
| `SMTP_PASSWORD` | DA (ako SMTP) | `<smtp-pass>` | non-empty | isto |
| `EMAIL_FROM` | DA (ako SMTP) | `noreply@<tvoj-domen>` | valid email | from header |
| `EMAIL_FROM_NAME` | NE | `ATINA` | string | from name |

### A.11 CORS / proxy
| Variable | Required (prod) | Primer | Validaciono pravilo | Konzumira |
|----------|-----------------|--------|---------------------|-----------|
| `CORS_ORIGINS` | **DA** | `https://app.<domen>,https://admin.<domen>` | zarezom odvojen, samo https u prod | CORS middleware |
| `TRUST_PROXY` | NE | `1` ili `true` | iza reverse proxy / cloud LB | Express |

### A.12 Rate limiting (default-i obično dovoljni)
| Variable | Required | Primer | Napomena |
|----------|----------|--------|----------|
| `RATE_LIMIT_WINDOW_MS` | NE | `900000` (15 min) | global |
| `RATE_LIMIT_MAX` | NE | `100` | global po IP |
| `AUTH_RATE_LIMIT_*` | NE | — | login pad protection |
| `PASSWORD_RESET_*` | NE | — | reset spam protection |
| `PAYMENTS_RATE_LIMIT_*` | NE | — | payment endpoint |
| `WEBHOOK_RATE_LIMIT_*` | NE | — | webhook endpoint |
| `ADMIN_MUTATION_RATE_LIMIT_*` | NE | — | admin write protection |

### A.13 Logging / monitoring
| Variable | Required | Primer | Konzumira |
|----------|----------|--------|-----------|
| `LOG_LEVEL` | NE | `info` | `debug` / `info` / `warn` / `error` |
| `LOG_FILE` | NE | `logs/atina.log` | path; rotate na hostu |
| `WORKFLOW_TEMPLATE_SUCCESS_ALERT_THRESHOLD` | NE | `80` | 1–100 (%) |

### A.14 Feature flags
| Variable | Default | Konzumira |
|----------|---------|-----------|
| `ENABLE_SCRAPER` | `true` | scraper module |
| `ENABLE_AUTOMATION` | `true` | automation module |
| `ENABLE_CRM` | `true` | CRM module |
| `ENABLE_ANALYTICS` | `true` | analytics module |

### A.15 Agregatori i legacy spoljni servisi (vidi `atina-platform/atina/.env`)
| Variable | Required | Konzumira |
|----------|----------|-----------|
| `FIVESIM_API_TOKEN` | NE (samo ako koristiš 5sim) | scraper / OTP services |
| `FIVESIM_DEPRECATED_API_KEY` | NE | legacy |
| `CAPTCHA_2_API_KEY` | NE | scraper captcha solver |
| `WEBSHARE_API_KEY` | NE | proxy pool |
| `PROXY_ASOCKS_API_KEY` | NE | alt proxy |
| `OWNER_CONTACT_EMAIL` | NE | mailto u app |

---

## B. Nest `atina-system` — produkcija

| Variable | Required (prod) | Primer | Validaciono pravilo | Konzumira |
|----------|-----------------|--------|---------------------|-----------|
| `NODE_ENV` | **DA** | `production` | tačno `production` | TypeORM + validate-production-env |
| `POSTGRES_HOST` | **DA** | `<host>` | non-empty | data-source.ts |
| `POSTGRES_PORT` | DA | `5432` | broj | isto |
| `POSTGRES_USER` | DA | `<user>` | non-empty | isto |
| `POSTGRES_PASSWORD` | DA | `<pass>` | non-empty | isto |
| `POSTGRES_DB` | DA | `<db-ime>` | non-empty | isto |
| `POSTGRES_SSL` | DA (managed DB) | `true` | true / false; share `postgres-ssl.util.ts` | TypeORM CLI + Nest |
| `POSTGRES_SSL_REJECT_UNAUTHORIZED` | NE | `true` | false samo ako prihvataš MITM rizik | isto |
| `TYPEORM_SYNC` | **DA** | **`false`** | **MORA `false`** u prod (CEO sekcija C) | data-source.ts |
| `TYPEORM_LOG` | NE | `false` | uključi privremeno za incident debug | isto |
| `JWT_SECRET` | **DA** | random 32+ | min 32 znaka, ne placeholder | auth |
| `PORT` | NE | `3000` | broj | server |
| `PHASE` | NE | `v1` | string | branding |
| `CORS_ORIGINS` | DA | `https://...` | zarezom odvojen, https | CORS |
| `TRUST_PROXY` | NE | `1` | iza LB | Express |
| `INTERNAL_QUEUE_SMOKE_KEY` | NE | random | zaštita za POST `/internal/queue/smoke` van prod | queue endpoint |
| `INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW` | NE | `60` | rate limit | isto |
| `INTERNAL_QUEUE_SMOKE_RATE_WINDOW_MS` | NE | `60000` | window | isto |
| `REDIS_HOST` | DA (ako BullMQ) | `<host>` | non-empty kad postaviš | QueueModule |
| `REDIS_PORT` | NE | `6379` | broj | isto |

---

## C. Python (Astra / Forge / src) — produkcija

| Variable | Required | Primer | Konzumira |
|----------|----------|--------|-----------|
| `VAULT_PATH` | DA | `/data/vault.db` | apsolutna putanja, deljena sa Atina Node ako koristiš shared vault | Forge / Astra |
| `ASTRA_*` | _(prema modulima u `src/`)_ | — | po modulima |

> **Astra/Forge env detalji:** `src/forge/`, `src/astra/`, `src/atina/` — ako se koriste, dopuni ovu sekciju iz konkretnih modula. (Većina je internih default-a; eksterni servisi su u Atina Node sekciji A.15.)

---

## D. SaaS deploy environment (CI / orchestracija)

Ako deploy ide kroz GitHub Actions / Render / Railway / Fly:

| Where | Variable | Type | Notes |
|-------|----------|------|-------|
| GitHub Secrets (repo) | `STRIPE_SECRET_KEY` | secret | iste kao A.6, ali u CI deploy job-u |
| GitHub Secrets | `JWT_SECRET` | secret | NE u repo |
| GitHub Secrets | `DB_PASSWORD` | secret | isto |
| GitHub Secrets | `*_TOKEN` | secret | po servisu |
| Hosting platform env | sve iz A/B/C | env | postavi u UI hosting providera ili kroz `flyctl secrets set` / `render env` |

---

## E. Auto-fail uslovi u boot-u (šta sigurno ruši app)

Atina Node (`atina-platform/atina/src/config/`):
1. `JWT_SECRET` < 32 znaka **ili** placeholder vrednost iz `.env.example` → **boot pada**
2. `JWT_REFRESH_SECRET` < 32 znaka → **boot pada**
3. `ADMIN_PASSWORD` = `Admin@123456` u `NODE_ENV=production` → **boot pada**
4. `DB_PASSWORD` = `atina_password` u `NODE_ENV=production` → **boot pada**
5. `CORS_ORIGINS` empty u `NODE_ENV=production` → **boot pada**

Nest atina-system:
1. `JWT_SECRET` < 32 znaka u prod → **boot pada** (validate-production-env)
2. `CORS_ORIGINS` empty u prod → **boot pada**

---

## F. Sign-off blok (popuni za prod release)

**Datum prod deploya:** _(YYYY-MM-DD)_  
**Vlasnik:** _(ime)_  
**Hosting:** _(Render / Fly / VPS / AWS — kratko)_

| Sekcija | Sve required postavljeno (Pass / Fail) | Napomena |
|---------|----------------------------------------|----------|
| A.1 Core | | |
| A.2 DB (`DB_*`, `DB_SSL=true`) | | |
| A.3 Redis | | |
| A.4 JWT (oba secreta 32+) | | |
| A.5 Admin (NE default `Admin@123456`) | | |
| A.6–A.8 Payments (Stripe / PayPal / Wise) | | _(ili N/A ako ne koristiš)_ |
| A.9 Forge vault path | | _(persistent volume)_ |
| A.10 SMTP | | _(ili N/A)_ |
| A.11 CORS / proxy | | |
| B Nest (`TYPEORM_SYNC=false`) | | |
| C Python (vault path) | | |
| E Auto-fail uslovi proveren | | _(boot ne pada zbog placeholdera)_ |

**Ukupno:** Pass / Fail — _(jedna rečenica)_

**Linkovi do mesta gde se kvačica `[x]` lepi:**
- Atina Node SaaS prod: [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) (red 4 — `.env` produkcija)
- Nest TypeORM prod: [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md)
- Agregatori: `AI_*`, `BUSINESS_AND_DEV_*`, `SCRAPER_*`, `FINANCE_*`, `COMMS_*`, `INFRASTRUCTURE_*`, `STORAGE_*` u `atina-platform/atina/.env`

---

*Verzija: secrets matrica v1 (2026-05-13). Ažuriraj samo polja unutar šablona; ne lepi prave vrednosti.*
