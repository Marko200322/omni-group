# 02 — Arhitektura

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`01-PREGLED-PROJEKTA.md`](./01-PREGLED-PROJEKTA.md) · Sledeće: [`03-PYTHON-FORGE-ASTRA.md`](./03-PYTHON-FORGE-ASTRA.md)

## Dijagram komunikacije

```text
┌──────────────────────────────┐    SQLite putanja (ops poravnanje)     ┌──────────────────────────────┐
│ Python forge / atina / astra │◄──── VAULT_PATH / FORGE_VAULT_PATH ───►│ Express modul `forge`         │
│ docker-compose.yml  :8080    │      (ŠEME SE RAZLIKUJU — vidi 09)      │ FORGE_VAULT_PATH              │
└──────────────────────────────┘                                        └──────────────▲───────────────┘
                                                                                       │ HTTP /api/v1/*
┌──────────────────────────────┐   NEXT_PUBLIC_ATINA_API_BASE / ATINA_API_BASE         │
│ apps/omnigroup-web   :3010   │───────────────────────────────────────────────────────┘
│ BFF + og_session kolačić     │
└──────────────────────────────┘

┌──────────────────────────────┐   YOUTUBE_PIPELINE_URL (:8090)         ┌──────────────────────────────┐
│ Express `omnitube` i dr.     │───────────────────────────────────────►│ tools/youtube-pipeline        │
└──────────────────────────────┘                                        └──────────────────────────────┘

┌──────────────────────────────┐
│ Nest atina-system    :3001   │  ← sopstveni Postgres `atina` + opcioni Redis BullMQ
│ (nema deljeni vault)         │  ← omnigroup-web ga podrazumevano NE zove
└──────────────────────────────┘
```

## Tokovi podataka

### 1. Klijent kupuje isporuku

1. `/pricing` (Next) učitava katalog i računa indikativnu cenu lokalno (`apps/omnigroup-web/src/lib/dynamic-pricing.ts`), zatim osvežava preko BFF `GET /api/atina/billing/quotes` → Express `GET /api/v1/billing/quotes`.
2. Checkout: Next `POST /api/atina/payments/manual/deliverable-checkout` → Express `payments.service.createDeliverableManualCheckout` (quote se **ponovo računa na serveru**, klijentska cena je samo prikaz).
3. Express kreira `payments` red (status `pending`), proforma PDF (`invoice-pdf.service.ts`) i vraća IBAN instrukcije; Stripe/Kriptoman varijante vraćaju redirect URL.
4. Admin potvrđuje (`POST /api/v1/payments/manual/confirm/:paymentId`) ili stiže webhook → `DeliverableFulfillmentService` upisuje job u `deliverable_fulfillment_jobs`.
5. Handler registry (`deliverable-handlers/index.ts`) bira handler po `deliverableId`; handler generiše PDF, aktivira module, seed-uje CRM, pokreće Titanis/Product Factory, objavljuje `/sites/{slug}`.
6. `runFulfillmentQualityChecklist` proverava artefakte prema `deliverable-acceptance-contract.ts`; do 3 pokušaja; admin `approve`/`reject`.
7. Za mesečne retainere `RetainerSchedulerService` ponavlja isporuku (~30 dana).

### 2. Kontakt forma → CRM

`POST /api/contact` (Next) → Resend e-mail (ako je `RESEND_API_KEY`) + Express `POST /api/v1/crm/contacts` kroz tehnički nalog (`CONTACT_CRM_INGRESS_EMAIL/PASSWORD`) + opcioni Slack webhook. Ako CRM prođe a e-mail padne, odgovor je `crm_ok_email_failed` (delimičan uspeh), ne greška.

### 3. Sesija na sajtu

Next middleware štiti `/dashboard/*` i `/admin/*`. Login šalje kredencijale Express-u (`/api/v1/auth/login`), a JWT par se čuva u potpisanom HttpOnly kolačiću `og_session` (`SESSION_SECRET`). Demo režim (`POST /api/auth/demo`) radi bez Atine. BFF rute prosleđuju Bearer token iz kolačića ka Express-u.

### 4. Autonomy loop (interni pogon)

`setInterval` scheduler u Express-u (`AUTONOMY_TICK_INTERVAL_MS`, podrazumevano 5 min) prolazi kroz vertikale (`industry_verticals`): research → generate → outbound → deploy, troši budžet iz `autonomy_budget_state`, piše `outbound_messages`, a evolucioni tick kreira `platform_evolution_tasks` i opcione Cursor agent run-ove (`cursor_agent_runs`). Product Factory ima interni lane za `internal_saas` projekte.

## Portovi i baze

| Komponenta | Host port | Baza / skladište |
|------------|-----------|------------------|
| Astra (Flask/Gunicorn) | 8080 | SQLite `VAULT_PATH` (podrazumevano `data/vault.db`) |
| Python forge / atina worker | — | isti SQLite |
| Atina Express | 3000 (prod primer `ATINA_PORT=3002`) | Postgres `atina_saas_db` :5432, Redis :6379, SQLite `FORGE_VAULT_PATH` |
| Nest atina-system | 3001 (kontejner 3000) | Postgres `atina` :5433, Redis :6380 (opciono) |
| Omnigroup web | 3010 (`WEB_PORT`; kontejner 3000) | nema bazu; kolačić sesije |
| YouTube pipeline HTTP | 8090 | Redis broker; fajl sistem `./data` |
| Caddy | 80/443 | — |

## Produkciona topologija (`docker-compose.prod.yml`)

```text
postgres ──┐
redis ─────┼──► atina-api (Express, migrate + seed job pre starta) ──► web (Next, BFF) ──► caddy (profil `tls`)
           └──► (Nest i Python stack su odvojeni compose fajlovi)
```

- `infra/caddy/Caddyfile`: `{$SITE_DOMAIN}` → `web:3000`, `{$API_DOMAIN}` → `atina-api:3000`.
- Kubernetes varijanta: `infra/k8s` (base: namespace, atina-saas + migrate-job, nest-api, omnigroup-web, postgres StatefulSet, redis; overlay-i `staging`/`prod`). Python workeri su backlog CronJob-ovi.

## Granice i principi

| Princip | Posledica u kodu |
|---------|------------------|
| Katalog isporuka postoji u dva primerka (server + web) | Svaka izmena ide u **oba** fajla; web koristi svoj primerak samo za instant prikaz, server je autoritet za naplatu |
| Server uvek ponovo računa cenu | `payments.service.ts` zove `quoteDeliverable` sa istim ulazima (tier, kategorija, provider, intenzitet, `marketRegion`) |
| Moduli se montiraju konvencijom | `ModuleRegistry.mountRoutes` → `/api/v1/{slug}`; novi modul = folder + `*.module.ts` sa `routes` |
| Nest i Express nisu zamenljivi | Različite baze, različiti auth modeli (Nest nema role), različite namene |
| Vault Python ↔ Node je ops poravnanje putanje, ne deljena šema | Ne pisati SQL preko granice bez adaptera |
| Web nema bazu | Sve persistentno ide kroz Express API; `og_session` nosi samo tokene |

## Pozadinski poslovi (ko šta pokreće)

| Mehanizam | Gde | Šta |
|-----------|-----|-----|
| Bull redovi `tasks`, `emails`, `scraper`, `automation` | Express `src/queue/queue.ts`, `register-workers.ts` | Asinhroni zadaci; in-memory fallback kad Redis nije dostupan |
| Autonomy scheduler (`setInterval`) | Express `modules/autonomy-loop` | Tick, evolucija, rollout kategorija |
| Retainer scheduler | Express `modules/billing/service/retainer-scheduler.service.ts` | Mesečno ponavljanje retainera |
| `@Cron(EVERY_30_SECONDS)` Supply Agent | Nest `supply-agent.service.ts` | Heartbeat + `vault_resources` |
| `while True` petlje | Python `master_forge.py`, `atina/worker.py` | Forge trošak i supply zapisi |
| Celery lanac | `tools/youtube-pipeline/app/pipeline_tasks.py` | Video proizvodnja |

Sledeća poglavlja opisuju svaku komponentu pojedinačno; kompletna lista ruta je u [`08-API-REFERENCA.md`](./08-API-REFERENCA.md).
