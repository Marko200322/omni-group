# Evidencija — CEO sekcija G (Atina SaaS produkcioni gate)

**Poslednji pregled repoa (2026-06-04):** lokalni preduslov **PASS** (`0194d1f`) - CI Run [#149](https://github.com/Marko200322/omni-group/actions/runs/26933987866). Handoff: [STAGING-LOCAL-PREFLIGHT-LATEST.md](./STAGING-LOCAL-PREFLIGHT-LATEST.md). **Staging/prod red ispod i dalje prazan** (8 stavki ceka vlasnika na URL-u).

**Status:** _lokalno spremno; ceka staging/prod sign-off vlasnika_

**Glavni runbook (Atina release gate):** [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md)  
**Staging gate:** [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) · staging-prod paritet: [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md)  
**Deploy / rollback:** [`atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md)  
**Šablon (kopija po release-u):** [`CEO-G-PRODUCTION-EVIDENCE.template.md`](./CEO-G-PRODUCTION-EVIDENCE.template.md)

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

---

## Redosled za vlasnika (1–3 sata, prvo putuš; brže kasnije)

> **Preduslov za 1–8 ispod:** imaš (a) staging URL gde Atina Node API sluša, (b) prod URL ili spreman server / containerized deploy, (c) pristup payments dashboardu (Stripe / PayPal / Wise), (d) SMTP relay nalog ako koristiš email.

### Korak 1 — `npm run build` u produkcijskom CI/serveru

Lokalni `tsc` PASS od **2026-05-16** je samo *preduslov*. Mora isti commit/tag uspeti i u **prod CI pipeline-u** (GitHub Actions, GitLab CI, ili build na serveru):

```bash
cd atina-platform/atina
npm ci
npm run build       # generiše dist/
```

Snimi: build job URL ili snippet izlaza, commit SHA.

### Korak 2 — Migracije pregledane na **stagingu**

Pre nego što se pipeline dotakne prod baze, primeni iste migracije na **staging Postgres**:

```bash
# Iz atina-platform/atina, sa staging .env
npm ci
npm run build
npm run migrate     # ili: npm run migrate:status pa migrate:up
```

Posle: `GET <STAGING_URL>/health` mora vratiti `ok`. Pogledaj log za bilo kakve "duplicate key" / "relation already exists" greške.

Detalji: [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) odjeljak 2 (*Migrations review*).

### Korak 3 — Prod `.env` (na serveru, NE u repou)

Minimum (zameni placeholdere — `atina-platform/atina/.env.example` je šablon):

```bash
NODE_ENV=production
APP_URL=https://app.<tvoj-domen>

DB_HOST=<prod-host>
DB_NAME=atina_saas_db
DB_USER=<prod-user>
DB_PASSWORD=<prod-pass-min-strength>
DB_PORT=5432
DB_SSL=true              # za managed Postgres (RDS, Supabase, Neon, ...)
DB_POOL_MIN=2
DB_POOL_MAX=10

REDIS_HOST=<prod-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<prod-redis-pass>

JWT_SECRET=<min-32-karaktera-novi-random>
JWT_REFRESH_SECRET=<min-32-karaktera-novi-random>

ADMIN_EMAIL=<tvoj-prod-admin-email>
ADMIN_PASSWORD=<jak-min-12-karaktera-novi>      # NE Admin@123456 (boot će pasti)

# Stripe (samo ako koristiš plaćanja)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# PayPal (opciono)
PAYPAL_CLIENT_ID=<live-id>
PAYPAL_CLIENT_SECRET=<live-secret>
PAYPAL_MODE=live

# Wise (opciono)
WISE_API_KEY=<live-key>
WISE_PROFILE_ID=<live-profile>

# SMTP (samo ako šalješ email)
SMTP_ENABLED=true
SMTP_HOST=<relay-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-pass>
EMAIL_FROM=noreply@<tvoj-domen>
EMAIL_FROM_NAME=ATINA

FORGE_VAULT_PATH=/var/lib/atina/vault.db        # persistent volume van containera

CORS_ORIGINS=https://app.<tvoj-domen>,https://admin.<tvoj-domen>
LOG_LEVEL=info
```

> **Dva auto-fail uslova u boot-u (vidi `src/config`):**  
> 1. `JWT_SECRET` / `JWT_REFRESH_SECRET` < 32 znaka **ili** placeholder vrednosti iz `.env.example` → boot pada.  
> 2. `ADMIN_PASSWORD` = `Admin@123456` u `NODE_ENV=production` → boot pada.

Šablon: [`atina-platform/atina/.env.example`](../atina-platform/atina/.env.example) (ima eksplicitne `REQUIRED (prod)` markere).

### Korak 4 — Stripe / PayPal / Wise **live** + webhook secreti

#### Stripe (najčešće)
1. **`https://dashboard.stripe.com/apikeys`** → kreiraj **Live mode** Secret key + Publishable key. Stavi u prod env: `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_PUBLISHABLE_KEY=pk_live_…`.
2. **`https://dashboard.stripe.com/webhooks`** → **Add endpoint** → `https://app.<tvoj-domen>/api/v1/payments/webhook` (proveri tačnu putanju u `atina-platform/atina/src/modules/payments/`). Listen na bar `checkout.session.completed`, `payment_intent.succeeded`, `customer.subscription.updated`, `invoice.payment_failed`.
3. Kopiraj **Signing secret** → `STRIPE_WEBHOOK_SECRET=whsec_…`.
4. Klikni **Send test webhook** iz dashboarda → očekuj **HTTP 200** u app log-u (i bez ispisa secreta u log-u).

Sandbox dry-run je dokumentovan u [`NIVO-2-STAGING-WEBHOOKS.md`](./NIVO-2-STAGING-WEBHOOKS.md) — koristi tu evidenciju pre prebacivanja na live.

#### PayPal *(opciono ako prodaješ PayPal)*  
- `https://developer.paypal.com/dashboard/applications/live` — kreiraj live REST app. `PAYPAL_MODE=live`.  
- Webhook: `https://app.<tvoj-domen>/api/v1/payments/paypal/webhook` (proveri putanju), event "Checkout order completed" + "Subscription created".

#### Wise *(opciono — payouts)*
- `https://wise.com/settings/api-tokens` (prebaci na **Live**).
- `WISE_API_KEY=<live>`, `WISE_PROFILE_ID=<live profile id>`.

### Korak 5 — SMTP (ako šalješ email)

- Bilo koji SMTP relay: SendGrid, Mailgun, Amazon SES, Postmark, ili tvoj IMAP provider.  
- Postavi `SMTP_*` u prod `.env` (Korak 3).  
- Ako ne šalješ email — `SMTP_ENABLED=false` i preskoči ovo.

### Korak 6 — Smoke posle deploya (`npm run smoke:all`)

Iz tvoje lokalne mašine ili iz CI joba, sa **prod** ili **staging** URL-om:

```powershell
# PowerShell
Set-Location atina-platform\atina
npm run smoke:all -- -BaseUrl "https://app.<tvoj-domen>" -Email "<admin>" -Password "<admin-pass>"
```

```bash
# Bash
cd atina-platform/atina
npm run smoke:all -- -BaseUrl "https://app.<tvoj-domen>" -Email "<admin>" -Password "<admin-pass>"
```

Šta proverava (formalno: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md), *Local notes — Smoke tests*):
1. `GET /health` → 200, JSON sa `ok=true`
2. `POST /auth/login` → 200, JWT token
3. `GET /api/v1/auth/me` → 200, profil admina
4. `GET /api/v1/forge/status` → 200
5. Workflow execution-stats smoke
6. `forge-admin` smoke (overview + templates + stats)

> **Ako padne `relation "plans" does not exist`:** baza nije migrirana — vrati se na Korak 2.  
> **Ako padne `Invalid email or password`:** seed nije pokrenut → `npm run docker:seed` (ili odgovarajući prod seed) protiv prave baze.

Pojedinačni smokes (slabiji rate-limit pritisak) — `package.json` u `atina-platform/atina/`: `smoke:health`, `smoke:auth`, `smoke:forge:status`, `smoke:forge:admin`.

### Korak 7 — Admin monitoring rute (live)

Sa admin JWT-om:

```bash
# Admin overview
curl -H "Authorization: Bearer <ADMIN_JWT>" https://app.<tvoj-domen>/api/v1/admin/overview

# Workflow execution stats
curl -H "Authorization: Bearer <ADMIN_JWT>" https://app.<tvoj-domen>/api/v1/admin/workflow-templates/execution-stats
```

Očekuj 200 + smislen JSON. Ako 401 — admin login je pao u Koraku 6, nazad korak. Ako 500 — log na serveru i `deploy-rollback-checklist.md` (*Admin* / execution-stats) za šta ide dalje.

### Korak 8 — Vlasnik rollback-a + pravilo "kad rolujemo"

Definiši i upiši u sign-off blok ispod (i u tim wiki / pager dežuru ako postoji):

- **Rollback owner (primary):** _(ime, telefon, email — _NE_ commitovati u repo)_
- **Rollback owner (backup):** _(drugo ime)_
- **Rollback trigger thresholds:**
  - 5xx error rate > **X**% u prozoru od 5 min
  - `GET /health` fails više od **3 puta** zaredom u 1 min
  - Stripe webhook 4xx/5xx > **5%** u prozoru od 10 min
  - DB connection pool exhausted (Postgres `max_connections` fail)
- **Rollback path:** redeploy prethodnog tag-a → `npm run migration:revert` (ako migracija ima sigurno `down()`) → ako ne, restore iz pre-deploy backupa (Korak 2 u [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md)).

Detalji: [`atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md).

---

## Preduslov urađen u repou (lokalna mašina, ne zamena za prod)

| Provera | Rezultat |
|---------|----------|
| `atina-platform/atina` — **`npm run build`** (`tsc`) | **PASS** (2026-05-16, lokalno; ~68s) |
| Koren — **`python -m pytest`** | **PASS** (2026-05-16; 11 testova) |

---

## Sign-off blok (popuni — 8 stavki **CEO sekcije G**)

**Datum:** _(YYYY-MM-DD)_  
**Vlasnik release-a:** _(ime)_  
**Okruženje:** staging URL: _(https://...)_, produkcija URL: _(https://...)_  
**Release:** tag/commit: _(npr. v1.2.3 / abcd1234)_

| # | Stavka (CEO sekcija G — red u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md)) | PASS / FAIL / N/A | Napomena |
|---|----------------------------------------------------------------------------------------|-------------------|----------|
| 1 | `npm run build` u **produkcijskom** CI ili na prod serveru (red 226) | | _(lokalni PASS 2026-05-16 je samo preduslov)_ |
| 2 | `npm run test:ci` u CI (već N1 — preduslov, ne ovde) | | _(obično `[x]` u N1; ostavi N/A ovde)_ |
| 3 | Migracije pregledane na **stagingu** (red 228) | | _(staging migrate URL / log)_ |
| 4 | `.env` produkcija (tajne, `NODE_ENV=production`, `DB_SSL=true`) (red 229) | | _(potvrda da boot ne pada)_ |
| 5 | **Stripe / PayPal / Wise live** + webhook secreti (red 230) | | _(test webhook 200 OK)_ |
| 6 | **SMTP** ako je email obavezan (red 231) | | _(jedan test email PASS, ili N/A ako ne šalješ)_ |
| 7 | Smoke (Atina Node): `npm run smoke:all` na prod URL-u (red 232) | | _(exit 0; svih 6 koraka PASS)_ |
| 8 | Admin monitoring: `GET /api/v1/admin/overview`, execution-stats (red 233) | | _(200 OK, smislen JSON)_ |
| 9 | Vlasnik rollback-a + uslovi (red 234) | | _(ime + thresholds + path; vidi Korak 8)_ |

**Ukupno:** Pass / Fail — _(jedna rečenica)_

**Kad je sve Pass:** označi `[x]` na svaki red **CEO sekcije G** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) (redovi 226, 228–234) i ažuriraj [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) (red CEO-G).

---

## Šta je već urađeno u repou (ne ponavljaj — ovo NIJE zadatak vlasnika)

- `tsc` build PASS lokalno (2026-05-16; agent provera)
- `npm run test:ci` zelen — vidi N1 master listu, F.2
- `npm run smoke:all` skripta postoji (`atina-platform/atina/scripts/smoke-all.ps1`)
- Admin rute `GET /api/v1/admin/overview` + execution-stats — implementirane (kod), čeka samo live verifikaciju
- Smoke evidencija lokalnog stack-a (sekcija H, tri stuba): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (Val 348 / 2026-05-08)

**Šta agent NE može (zato si ti ovde):** kupiti Stripe live ključeve, otvoriti SMTP nalog, deploy-ovati na pravi prod server, biti rollback "lice" za pager.
