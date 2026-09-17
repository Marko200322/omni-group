# System Integration Checklist — šta još treba povezati / dodati / srediti

**Svrha:** Jedan master spisak preostalog posla posle full-stack audita (kod + env + infra + prod).  
**Ne zamenjuje:** [`FULFILLMENT-17-PACKAGE-CHECKLIST.md`](./FULFILLMENT-17-PACKAGE-CHECKLIST.md), [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md), [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md).

**Legenda:** `[x]` gotovo · `[ ]` todo · `[~]` delimično · `[!]` blokirano spoljnim faktorom · **(V)** vlasnik/ops · **(K)** kod/inženjering

**Poslednji audit:** 2026-07-04 (M0–M6 + gap register §11; infra PR: upload volume, PHASE, contact fail-closed, admin BFF gates)

---

## 0. Brzi status — šta je već zeleno

- [x] Fulfillment pipeline — 17 handlera, checklist, retry, memory (`deliverable-fulfillment.service.ts`)
- [x] E2E lokalno **17/17** — `scripts/e2e-fulfillment-all-packages.ps1`
- [x] Atina `test:ci` **3438/3438** + coverage gate
- [x] Git push `main` (`d45c322`, `bfa68d5`)
- [x] Prod deploy incremental — migracije 031–033, kontejneri healthy
- [x] Prod smoke **32/32** — `scripts/smoke-platform-full.ps1 -WebBase https://omnigrouptech.com`
- [x] Web BFF auth (login, session, dashboard/admin) — **ne oslanjaj se na zastareli** [`DASHBOARD-AUTH-ROADMAP.md`](./DASHBOARD-AUTH-ROADMAP.md)
- [x] Manual payment + admin confirm put (jedini ručni korak do Stripe live)
- [x] Incremental deploy secret reuse — `scripts/prepare-vps-prod.ps1`
- [x] Retainer mesečni cron — `retainer-scheduler.service.ts`
- [x] Shop Stripe checkout **kod** — `payments.service.ts` + BFF `shop-order`
- [x] Slack notifier **kod** — `utils/slack-notifier.service.ts`
- [x] Avatar bootstrap **kod** — `client-deliverable-bootstrap.service.ts`

**Marketing & revenue fazno paljenje (M0–M6):** vidi **[`MARKETING-REVENUE-PHASED-CHECKLIST.md`](./MARKETING-REVENUE-PHASED-CHECKLIST.md)** — trenutno si na **M0 gotovo / M1 keys pending**.

---

## 1. Ključevi i env — popuni ti (V)

**Centralni fajl za popunu:** `atina-platform/atina/KLJUCEVI-POPUNI.local.txt` (gitignored)  
**Posle popune:** `scripts/apply-integration-keys.ps1` → sync u `.env` + `deploy-secrets.local/deploy.config.json`

| Prioritet | Ključ / grupa | Fajl | Status | Akcija |
|-----------|---------------|------|--------|--------|
| P0 | `api.omnigrouptech.com` DNS | registrar | `[!]` | A zapis → `5.189.184.103`; proveri `scripts/verify-production-dns.ps1` |
| P1 | **HeyGen** `HEYGEN_API_KEY` | KLJUCEVI §2, `.env` L158 | `[ ]` | https://heygen.com → API key |
| P1 | **D-ID** `DID_API_KEY` | KLJUCEVI §2, `.env` L159 | `[ ]` | https://d-id.com → fallback avatar |
| P1 | **Slack** `SLACK_WEBHOOK_URL` | KLJUCEVI §2b, `.env` L167 | `[ ]` | Slack App → Incoming Webhooks |
| P2 | **Stripe live** | KLJUCEVI §3, deploy `stripe*` | `[!]` | Čeka firmu: secret, publishable, webhook, `STARTER/PRO/ENTERPRISE_PRICE_ID` |
| P2 | **Resend (web kontakt)** | `apps/omnigroup-web/.env.local` | `[~]` | `RESEND_API_KEY` + verifikuj domen `omnigrouptech.com` |
| P2 | **Resend (Atina)** | KLJUCEVI §5 | `[ ]` | `RESEND_API_KEY` u atina `.env` |
| P3 | **SMTP Atina** | deploy `smtp.*`, `.env.example` | `[ ]` | `smtp.enabled=true` + kredencijali na VPS |
| P3 | **Cartesia TTS** | KLJUCEVI §2 | `[ ]` | `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID` |
| P3 | **PayPal / Wise / Kriptoman** | KLJUCEVI §4 | `[ ]` | Opciono alternativna plaćanja |
| P4 | **Lead DB F1+** | `.env` `LEAD_DATABASE_*` | `[ ]` | F0 disabled; vidi `docs/operations/LEAD-DATABASES-PHASED.md` |
| P4 | **Apollo, Hunter, Lusha, Snov, ZoomInfo** | KLJUCEVI §6 | `[ ]` | Enrich/verify leadova |
| P4 | **YouTube OmniTube** | `.env.example` L352+ | `[ ]` | OAuth + upload pipeline |
| P4 | **VAPID push** | `.env.example` | `[ ]` | Admin mobile push |
| P4 | **Zoom / Google Meet** | `.env.example` | `[ ]` | Live meeting linkovi za sales/support |

**Agregatori (10 servisa):** `AI_KEY`, `SCRAPER_KEY`, `COMMS_KEY`, `FINANCE_KEY`, … — vidi `atina-platform/atina/.env.example` + `config/env-aggregator.json`. Dev defaulti rade lokalno; prod zahteva prave ključeve.

**Web prod env (V):**

- [ ] `SESSION_SECRET` — min 32 znaka (`apps/omnigroup-web/.env.example`)
- [ ] `NEXT_PUBLIC_SITE_URL=https://omnigrouptech.com`
- [ ] `NEXT_PUBLIC_ATINA_API_BASE=https://api.omnigrouptech.com` (posle DNS)

**Atina prod hardening (V):**

- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` — ≥32, ne placeholder
- [ ] `ADMIN_PASSWORD` — jaka lozinka (posle deploya u `.env.vps.prod`)
- [ ] `DB_PASSWORD` + `DB_SSL=true`
- [ ] `AUTONOMY_EVOLUTION_CODE_EDIT=false` u prod
- [ ] `OUTREACH_DEV_SEND_TO_FALLBACK=false` u prod
- [ ] **Nikad** `RATE_LIMIT_DISABLED=true` u prod

---

## 2. DNS i infrastruktura (V)

| Stavka | Status | Akcija |
|--------|--------|--------|
| `omnigrouptech.com` → VPS | `[x]` | OK |
| `api.omnigrouptech.com` → VPS | `[!]` | **NXDOMAIN** — dodaj A zapis |
| `deploy.config.json` → `apiDomain` | `[ ]` | Postavi eksplicitno posle DNS |
| SSH ključ umesto lozinke | `[ ]` | `sshKeyPath` u deploy config; ukloni password auth |
| Caddy TLS za API subdomain | `[~]` | Spreman u compose; čeka DNS |
| SMTP na VPS | `[ ]` | deploy `smtp.enabled: false` → uključi |
| Upload persistent storage | `[ ]` | Prod: `UPLOAD_DIR` volume u `docker-compose.prod.yml` — web nema mount, upload se gubi na redeploy |
| `apps/omnigroup-web/Dockerfile` | `[x]` | Postoji — dopuni deploy docs (upload volume + prod env) |
| K8s migrate job | `[ ]` | Manual posle `scripts/deploy-k8s.ps1` |
| Staging execution log | `[ ]` | Popuni `STAGING-EXECUTION-LOG.template.md` |
| CEO evidence fajlovi | `[ ]` | `GIT-A-EVIDENCE`, `CEO-G-PRODUCTION-EVIDENCE`, TypeORM prod |

---

## 3. Kod — wiring koji još nije live (K)

### 3.1 Plaćanja i billing

| Stavka | Gde | Status | Akcija |
|--------|-----|--------|--------|
| Stripe Price ID placeholder | `payments.service.ts` | `[~]` | Zameni `price_starter` itd. pravim Stripe Price ID |
| `PAYMENTS_MODE=manual` | `.env` default | `[x]` | Namerno do firme; flip na `live` + webhook |
| Shop Stripe checkout | `createShopCheckoutSession` | `[~]` | Kod OK; treba Stripe keys |
| Manual payment copy | `MANUAL_PAYMENT_*` | `[x]` | U deploy config |
| `sistem_naplate/` Python | `sistem_naplate/README.md` | `[ ]` | **Nije uvezan** u Node billing — odvojen FAZA 1 alat |

### 3.2 Email i notifikacije — stubovi

| Stavka | Gde | Status | Akcija |
|--------|-----|--------|--------|
| Task `send_email` | `task-executors.ts` | `[x]` | Wired via `NotificationsService` / COMMS / SMTP; soft-fail `email_not_configured` |
| Automation `send_email` | `automation-workflow.runner.ts` | `[x]` | Isto — nije fake `sent: true` |
| Automation `http_request` | `automation-workflow.runner.ts` | `[x]` | Real axios (30s timeout) |
| Kontakt forma bez Resend | `apps/.../api/contact/route.ts` | `[x]` | Prod fail-closed (`503`) unless CRM/Slack/Resend; dev stub OK |
| QA pending admin email | `deliverable-fulfillment.service.ts` | `[~]` | Zavisi od SMTP/Resend |

### 3.3 Avatar / video

| Stavka | Gde | Status | Akcija |
|--------|-----|--------|--------|
| HeyGen video artifact | `heygen-video.provider.ts` | `[~]` | Bez `HEYGEN_API_KEY` → metadata only |
| D-ID fallback | avatar chain | `[~]` | Bez `DID_API_KEY` |
| `provisionClientAvatar` | `client-deliverable-bootstrap.service.ts` | `[~]` | `configured: false` bez keys |
| BFF avatar session | `api/atina/video-meetings/.../session` | `[x]` | Proxy OK; backend treba keys |
| `SALES_MEETINGS_ENABLED` | `.env.example` | `[ ]` | `false` — uključi kad sales avatar live |

### 3.4 Lead-gen / hunting / outreach

| Stavka | Gde | Status | Akcija |
|--------|-----|--------|--------|
| `LEAD_DATABASE_ENABLED=false` | `.env` | `[x]` | F0 by design |
| Mesečni retainer cron | `retainer-scheduler.service.ts` | `[x]` | Radi; enrich prazan na F0 |
| ZoomInfo provider | `zoominfo.provider.ts` | `[ ]` | OAuth nije implementiran — vraća `[]` |
| Outreach warmup | `.env` | `[~]` | `OUTREACH_WARMUP_MODE=true` blokira masovni send |
| `OUTREACH_FALLBACK_EMAIL` | `.env.example` | `[ ]` | Dev fallback |

### 3.5 Moduli — stub vs live provider

| Modul | Registrovan | Provider | Akcija |
|-------|-------------|----------|--------|
| **digital-signature** | `[x]` CoreEngine | Stub IDs | Real e-sign + webhooks — `digital-signature-wiring-checklist.md` |
| **package-pricing** | `[x]` | Stub math | Live pricing ako treba van deterministic |
| **titan-score** | `[x]` | Stub | **Nedostaje seed** u `001_seed_data.ts` — vidi `titan-score/WIRING.md` |
| **deal-offer** | `[x]` | `[~]` | Checklist zastareo — ažurirati `deal-offer.checklist.md` |

**Napomena:** `src/modules/*/WIRING.md` (3 fajla) ima neoznačene checkboxe — **zastareli** u odnosu na kod.

### 3.6 Public site / klijentski sajtovi

| Stavka | Gde | Status | Akcija |
|--------|-----|--------|--------|
| Prazan page body | `ClientSiteView.tsx` | `[~]` | "Content coming soon." — bootstrap sadržaj u public-site |
| Platform search | `PlatformShell.tsx` | `[ ]` | Disabled / "coming soon" |
| Demo KPI fallback | `platform-metrics.ts` | `[~]` | Sintetički brojevi kad API nedostupan |
| Live published URL paketi | landing, website-* | `[~]` | Treba DNS + public-site deploy path |
| Shop orders na klijentskom sajtu | `ClientSiteView.tsx` + BFF | `[~]` | Manual OK; Stripe čeka keys |

### 3.7 Fulfillment QA / admin

| Stavka | Gde | Status | Akcija |
|--------|-----|--------|--------|
| QA gate default off | env | `[x]` | Auto-release kad checklist pass |
| Admin approve/reject | `AdminFulfillmentPanel.tsx` | `[x]` | BFF + billing controller |
| Client deliveries panel | `DeliveriesPanel.tsx` | `[x]` | |
| Invite client | `InviteClientPanel.tsx` + admin | `[x]` | |

---

## 4. Web BFF — rute koje degradiraju bez backend keys

BFF sloj (`apps/omnigroup-web/src/app/api/`) — **~87 ruta**. Auth radi. Sledeće **zahtevaju Atina keys**:

| Grupa ruta | Zavisi od |
|------------|-----------|
| `/api/atina/payments/stripe/*` | Stripe / FINANCE_KEY |
| `/api/atina/payments/paypal/*`, `/wise/*` | PayPal / Wise keys |
| `/api/atina/cursor-agent/*` | `CURSOR_API_KEY` |
| `/api/atina/hunting/*` | Scraper + lead DB + autonomy |
| `/api/atina/video-meetings/*` | ElevenLabs + HeyGen/D-ID |
| `/api/atina/autonomy-loop/*` | AI + infra keys |
| `/api/atina/billing/fulfillment/*` | `[x]` manual path OK |

Demo session (`session.demo`) — blokiran sa admin ruta (namerno).

---

## 5. Testovi i dokumentacija (K)

### Coverage „later wave“ (jest.config.js)

Unit testovi odloženi — očekuje se smoke/E2E:

- Wave 2: `autonomy-loop`, `video-meetings`, `admin`, `ai-rag`, `alert-system`
- Wave 3: `lead-databases`, `cursor-agent`, `public-site`, `product-factory`, …
- Wave 4: **ceo fulfillment pipeline** (handlers, bootstrap, generators)

**Akcija:** Dodaj targeted unit testove po talasu ili prihvati E2E-only.

### Ostali test/docs gapovi

| Stavka | Status | Akcija |
|--------|--------|--------|
| `apps/omnigroup-web` nema `test` script | `[ ]` | P1 u OWNER-ACTION-CHECKLIST |
| `sistem_naplate` nema `pytest.ini` | `[ ]` | P1-G |
| `SLACK_WEBHOOK_URL` u `.env.example` | `[ ]` | Dodati za discoverability |
| Zastareli D.1 restore runbook | `[ ]` | `OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md` — kod već restored |
| Prazni .md fajlovi (0-byte) | `[ ]` | `EMPTY-DOCS-RUNBOOK.md` |
| `DASHBOARD-AUTH-ROADMAP.md` | `[ ]` | Ažurirati — auth je implementiran |
| Module `WIRING.md` checkboxes | `[ ]` | Sync sa stvarnim stanjem |

---

## 6. Marketing vs stvarna isporuka (gap analiza)

> **Operativni plan** (kada paliti hunter, outreach, autonomy marketing, Stripe): **[`MARKETING-REVENUE-PHASED-CHECKLIST.md`](./MARKETING-REVENUE-PHASED-CHECKLIST.md)** — faze M0–M6 sa env blokovima, gate-ovima i KPI.

| Obećanje / UI | Bez keys / config | Sa keys |
|---------------|-------------------|---------|
| Dashboard KPIs, MRR | Demo/sintetički brojevi | Live iz Atina API |
| Platform search | "Coming soon" | Treba implementacija |
| Klijentski sajt sadržaj | "Content coming soon" | Bootstrap iz fulfillment |
| Kontakt forma | Prihvata, ne šalje email | Resend live |
| ai-support-retainer avatar | Artifact + `configured: false` | HeyGen/D-ID video |
| lead-gen mesečno | Cron radi, enrich F0 | Apollo/Hunter F2+ |
| Outbound / Titanis | Warmup blokira send | Posle warmup + domain |
| Stripe/PayPal checkout UI | BFF postoji; backend manual/stub | Live keys |
| Digital signature | Stub ID `ds_stub_*` | Pravi e-sign provider |
| Automation email koraci | Fake `sent: true` | SMTP/COMMS wire |
| Fulfillment live URL | DNS blokira javni URL | DNS + deploy |

---

## 7. Namerno odloženo (nije bug)

- NIVO-3 vizija / PDF opseg — `NIVO-3-MASTER-CHECKLIST.md`
- Faza 6 K8s pun AI — `FAZA-6-BACKLOG.md`
- Lead DB F0→F5 phased rollout
- ZoomInfo enterprise OAuth
- Manual payment jedini gate pre firme
- `KRIPTOMAN_ENABLED=false`, `AUTONOMY_MARKETING_ENABLED=false`
- YouTube pipeline „local fake“ — F4-4
- Nest + Astra optional u smoke tri-stub

---

## 8. Skripte — redosled kad popunjavaš ključeve

```powershell
# 1. Popuni KLJUCEVI-POPUNI.local.txt (HeyGen, D-ID, Slack, Stripe kad bude)
# 2. Sync env
.\scripts\apply-integration-keys.ps1

# 3. Lokalno
.\scripts\restart-atina-dev.ps1

# 4. DNS provera
.\scripts\verify-production-dns.ps1

# 5. Deploy prod
.\scripts\deploy-from-local-secrets.ps1

# 6. Smoke
.\scripts\smoke-platform-full.ps1 -WebBase https://omnigrouptech.com -Password <admin>

# 7. E2E fulfillment
.\scripts\e2e-fulfillment-all-packages.ps1

# 8. Kontakt Resend test
.\scripts\test-contact-resend.ps1
```

---

## 9. Prioritetni redosled (preporuka)

| # | Stavka | Ko |
|---|--------|-----|
| 1 | DNS `api.omnigrouptech.com` | V |
| 2 | HeyGen **ili** D-ID + Slack webhook | V → `apply-integration-keys.ps1` → deploy |
| 3 | Resend web kontakt + domen verify | V |
| 4 | Stripe live (posle firme) | V |
| 5 | Wire `send_email` stubove (tasks + automation) | K |
| 6 | Seed `titan-score` u `001_seed_data.ts` | K |
| 7 | Public-site page content bootstrap | K |
| 8 | Prod env hardening (JWT, SESSION, NEXT_PUBLIC_*) | V |
| 9 | CEO evidence + staging log | V |
| 10 | Doc hygiene (WIRING, DASHBOARD-AUTH, EMPTY-DOCS) | K |
| 11 | Unit test Wave 2–4 (opciono) | K |

---

## 11. Gap register — šta nedostaje u celom sistemu (audit 2026-07-02)

Kompletan spisak **novih** rupa koje nisu pokrivene samo ključevima. Svaka stavka ima **fazu** (M0–M6 iz [`MARKETING-REVENUE-PHASED-CHECKLIST.md`](./MARKETING-REVENUE-PHASED-CHECKLIST.md)) ili **Infra** / **Backlog-K**.

### 11.1 P0 — direktno košta novac (M0)

- [x] **`BillingCheckoutPanel` nije mountovan** — Stripe/PayPal/Wise/manual subscription UI postoji ali se nigde ne prikazuje (`BillingCheckoutPanel.tsx`)
- [x] **`/dashboard#billing` ne postoji** — billing je samo na `/admin#billing`; PayPal success/cancel i katalog linkuju na mrtav anchor (`DashboardClient.tsx`, `marketing-catalog.ts`)
- [x] **Services katalog → samo `/contact`** — fiksne EUR usluge (`setup-*`, `audit`, retainers…) treba da vode na **`/pricing` checkout**, ne samo kontakt formu
- [x] **Kontakt ignoriše `?service=` / `?category=`** — query params se ne prenose u formu ni CRM (`contact/page.tsx`)
- [x] **Kontakt POST ne ide u Atina/CRM** — `pushContactToCrm()` + ingress env; prod fail-closed bez Resend/CRM/Slack

### 11.2 Web / BFF — UI obećava, backend nema put (M1–M4)

- [x] **Nema BFF za CRM** — `/api/atina/crm/*` ne postoji; katalog obećava CRM na `#projects`
- [x] **Nema BFF za:** `titanis`, `outreach`, `deal-offer`, `titan-score`, `digital-signature`, `package-pricing`, `omnitube`, `marketing-growth/status`
- [x] **Operator BFF admin gate** — autonomy-loop mutations, hunting, product-factory zahtevaju admin (`requireAdminSession`)
- [ ] **Revenue allocation BFF postoji, nema admin panela** (`/api/atina/billing/revenue-allocation/`)
- [x] **`AiMemoryPanel` orphan** — komponenta postoji, nije u dashboardu; katalog reklamira AI memory
- [x] **Pokvareni dashboard anchori:** `#sales` (nema sekcije), `#automations` (nema sekcije) — katalog linkuje pogrešno
- [ ] **Admin trend brojevi hardcoded** — "+8.2% vs last month" i spark chart čak i kad je overview live (`platform-metrics.ts`, `AdminClient.tsx`)
- [ ] **Admin module cards → generički `/health`** umesto modul-specifičnog statusa

### 11.3 Seed / DB / migracije (M3–M4)

- [x] **`titan-score` u `001_seed_data.ts`**
- [x] **`deal-offer` u seed** (+ outreach, marketing-growth)
- [ ] **`sistem-naplate`, `atina-system` (Express modul) nisu u seed** — plan gating / admin lista modula nekompletna
- [ ] **`MIGRATION_NOTES.md` zastareo** — dokumentuje ~019, ne 020–033 (fulfillment, shop, hot-clients…)
- [ ] **`apply-migration-*.ps1` samo do 025** — nema helper skripti za 026–033 (koristi `migrate.ts`)

### 11.4 Kod stubovi — lažno „radi“ (Backlog-K)

- [x] **`marketing-growth/` modul** — status orchestrator + CoreEngine + BFF `/api/atina/marketing-growth/status`
- [x] **Task `send_email` / automation email** — wired (treba COMMS/SMTP env)
- [x] **Automation `http_request`** — real HTTP
- [~] **Task `export_data` / `generate_report`** — partial (tasks entity real; ostalo ograničeno)
- [ ] **`digital-signature`** — stub ID `ds_stub_*`, nije pravni potpis
- [ ] **`package-pricing`** — deterministički stub, nije live tržište
- [ ] **Node `sistem-naplate` modul** — simulirana matematika; **ne poziva** Python `sistem_naplate/*.py`
- [ ] **`backup-recovery.restoreBackup`** — vraća `accepted`, nema stvarnog restore job-a
- [ ] **Nema scheduled backup cron** u modulu

### 11.5 Multi-stack integracija (Infra)

- [x] **Upload volume + env** — `docker-compose.prod.yml` `upload_data`; `UPLOAD_*` u web prod example + `prepare-vps-prod.ps1`
- [x] **Forge vault volume** — `forge_data` + `FORGE_VAULT_PATH` u prod compose
- [x] **`PHASE` iz env** — compose `${PHASE:-v6}` (ne hardcode v2)
- [ ] **`atina-system/` Nest** — nije u `docker-compose.prod.yml` (samo dev compose)
- [ ] **Astra Flask** — samo lokalni `docker-compose.yml`; **`MODULE_STACK` reklamira Astra** na sajtu
- [ ] **Dva „Atina System“ koncepta** — Express modul (simulacija) vs Nest app (TypeORM) — nije dokumentovana jedna revenue putanja
- [ ] **`sistem_naplate/` pytest** — isključen iz root CI; nema `pytest.ini` u folderu
- [ ] **`AUTONOMY_ENABLED=true` default u prod compose** — treba `false` do M5 gate-a
- [ ] **CORS** — samo `config.app.url`; nema `CORS_ALLOWED_ORIGINS` za multi-origin
- [ ] **`titan-monitor` API** — nema web BFF / admin widget

### 11.6 Env dokumentacija (Infra / M1)

- [x] **`SLACK_WEBHOOK_URL`** u `atina-platform/atina/.env.example`
- [x] **`DELIVERABLE_FULFILLMENT_*`** (QA, retry, memory) — u `.env.example`
- [x] **`RETAINER_SCHEDULER_*`** — u `.env.example`
- [x] **`OWNER_TAX_RESERVE_RATE`, `REVENUE_*`** — u `.env.example`
- [x] **Web `UPLOAD_DIR`, `UPLOAD_STORAGE`, `UPLOAD_MAX_BYTES`** — u `.env.production.example` + VPS prep
- [x] **Web `CONTACT_CRM_INGRESS_*`, `CONTACT_SLACK_WEBHOOK_URL`** — u `.env.production.example` + `prepare-vps-prod.ps1` / `deploy-from-local-secrets.ps1`
- [ ] **Skripta env parity** — nema automatske provere config ↔ `.env.example`

### 11.7 Marketing katalog → pogrešan flow (M0–M4)

Proizvodi koji vode na **`/contact`** umesto modula/checkout-a:

- [x] contracts → `/dashboard#sales` (`marketing-catalog.ts`)
- [ ] scraper, craftor, ai-rag, white-label, omnitube, omnigame (`marketing-catalog.ts`)
- [ ] digital-signature flow — treba contracts modul, ne kontakt

Usluge sa fiksnom cenom koje **treba checkout** (već u deliverable katalogu):

- [x] setup-quick/full/custom, audit, integration, workflow-design, support-*, landing, growth paketi — uskladiti sa `/pricing` „Buy now“

### 11.8 Testovi i docs drift (Infra)

- [ ] **Web test** — `npm test` = samo `test:atina` normalize; nema component/E2E (OWNER checklist P1-B delimično zastareo)
- [ ] **`DASHBOARD-AUTH-ROADMAP.md`** — auth implementiran, doc kaže „design only“
- [ ] **Module `WIRING.md` (3 fajla)** — checkboxi neusklađeni sa kodom
- [ ] **Prazni .md fajlovi (0-byte)** — vidi `EMPTY-DOCS-RUNBOOK.md`
- [ ] **D.1 restore runbook** — referencira TODO markeri koji više ne postoje u kodu

### 11.9 Mapa: gap → faza paljenja

| Gap grupa | Kada rešavati |
|-----------|----------------|
| §11.1 P0 billing/contact/checkout | **M0** (pre prve ozbiljne prodaje) |
| §11.2 BFF + dashboard paneli | **M1** (CRM, contact) → **M4** (titanis, deal-offer) |
| §11.3 Seeds | **M3–M4** |
| §11.4 Stub wiring | **Backlog-K** (paralelno, ne blokira M0) |
| §11.5 Multi-stack | **Infra** (odluka pre M5) |
| §11.6 Env docs | **Infra** + popuni pri M1 |
| §11.7 Katalog linkovi | **M0–M1** |
| §11.8 Docs/tests | **Infra** |

---

## 10. Povezani dokumenti

| Dokument | Svrha |
|----------|--------|
| **[`MARKETING-REVENUE-PHASED-CHECKLIST.md`](./MARKETING-REVENUE-PHASED-CHECKLIST.md)** | **Fazno paljenje M0–M6 — marketing moduli + revenue loop (štampaj pare)** |
| [`FULFILLMENT-17-PACKAGE-CHECKLIST.md`](./FULFILLMENT-17-PACKAGE-CHECKLIST.md) | 17 paketa × industrija |
| [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) | CEO sekcije A–H |
| [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md) | Šta samo vlasnik može |
| [`OWNER-ACTION-CHECKLIST.md`](./OWNER-ACTION-CHECKLIST.md) | P1/P2 WARN signali |
| [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md) | 10+6 otvorenih CEO stavki |
| [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) | Spoj svih lista |
| `atina-platform/atina/KLJUCEVI-POPUNI.local.txt` | **Popuni ključeve ovde** |

---

*Ažuriraj ovaj fajl kad zatvoriš blok iz sekcija 1–3. Ne commituj `KLJUCEVI-POPUNI.local.txt` ni `deploy-secrets.local/deploy.config.json`.*
