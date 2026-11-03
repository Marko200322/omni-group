# 04 — Atina Express SaaS (`atina-platform/atina`)

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`03-PYTHON-FORGE-ASTRA.md`](./03-PYTHON-FORGE-ASTRA.md) · Sledeće: [`05-ATINA-SYSTEM-NEST.md`](./05-ATINA-SYSTEM-NEST.md)

Atina je glavni proizvod monorepa: „Scalable SaaS + AI Automation Platform” — Express + TypeScript API sa 61 modulom i 348 ruta, Postgres bazom `atina_saas_db`, Redis/Bull redovima i integracijama za plaćanja, e-mail, AI i lead baze. Sve što klijent plati, ovde se izvršava.

## Tehnologija

| Sloj | Izbor |
|------|-------|
| Runtime | Node `>=20` (`.nvmrc`), TypeScript `^5.9` |
| HTTP | Express `^4.18`, `helmet`, `cors`, `compression`, `express-rate-limit`, `swagger-ui-express` |
| Podaci | `pg`, `redis`, `bull`, `sqlite3` (Forge ledger) |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Plaćanja | `stripe`, `@paypal/checkout-server-sdk`, Wise (REST), Kriptoman (REST + HMAC webhook) |
| Dokumenti | `pdfkit` (PDF isporuke, proforma fakture) |
| Ostalo | `zod` (DTO), `winston` (log), `nodemailer`, `web-push`, `@cursor/sdk` |

## Pokretanje

```bash
cd atina-platform/atina
npm ci
npm run db:up            # docker compose up -d postgres redis
npm run migrate && npm run seed
npm run dev              # ts-node-dev src/index.ts → http://127.0.0.1:3000/health
```

Produkcija: `npm run build && npm start` (`dist/index.js`) ili `docker compose up -d --build` u ovom folderu (`Dockerfile` target `production`). Svi skriptovi su u `package.json`; ključni su `test`, `test:ci`, `test:unit`, `lint`, `smoke:all`, `dev:bootstrap`, `deploy:production`.

## Boot sekvenca

1. `src/index.ts` učitava konfiguraciju (`src/config/index.ts` → `.env`, fallback `config/env-aggregator.json` sekcija `atina`).
2. `CoreEngine` (`src/core/CoreEngine.ts`) podiže Express, globalni rate-limit (svi putevi osim `/health`), montira inženjerske rute `GET /`, `GET /health`, `GET /api/v1`.
3. `ModuleRegistry` (`src/core/ModuleRegistry.ts`) registruje module i montira svaki na `/api/v1/{slug}`. Koji moduli se pale zavisi od `PHASE` i `module-phase-registry.ts` / `phase-boot-manifest.ts`.
4. Bull workeri (`src/queue/register-workers.ts`), autonomy scheduler i retainer scheduler startuju po feature flag-ovima (`AUTONOMY_*`, `ENABLE_*`).

## Struktura modula

Svaki modul je folder `src/modules/{slug}/` sa `{slug}.module.ts` (meta + `routes`), kontrolerom, servisom i DTO fajlom. Pregled svih modula i ruta: [`08-API-REFERENCA.md`](./08-API-REFERENCA.md). Funkcionalno grupisano:

| Grupa | Moduli |
|-------|--------|
| Jezgro | `auth`, `users`, `admin`, `notifications`, `analytics`, `audit-log`, `tasks`, `subscriptions` |
| Komercijala | `billing`, `payments`, `package-pricing`, `contracts`, `digital-signature`, `sistem-naplate`, `deal-offer` |
| CRM i prodaja | `crm`, `client-hunter`, `lead-scoring`, `outreach`, `follow-up`, `follow-up-automation`, `titanis`, `titan-score`, `scraper`, `proxy-rotation` |
| AI i podrška | `ai-rag`, `ai-memory`, `video-meetings` (avatari, Zoom/Meet), `recommendation`, `template-engine` |
| Proizvodnja | `product-factory`, `public-site`, `craftor`, `omnitube`, `omnigame`, `workflow-chain`, `automation`, `integration-hub`, `api-gateway` |
| Autonomija | `autonomy-loop`, `cursor-agent`, `resource-procurement`, `resource-management`, `phase-launch`, `system-updater`, `self-healing` |
| Platforma / ops | `forge`, `atina-system`, `backup-recovery`, `scaling`, `load-balancer`, `titan-master`, `titan-monitor`, `titanix`, `dominus360`, `apex-predator`, `alert-system`, `kpi`, `compliance`, `gdpr`, `validator` |

Na disku postoje i `dominus-swarm/`, `marketing-growth/`, `shared/` — bez `*.module.ts`, dakle nisu HTTP-montirani.

## Autentikacija i autorizacija

- `POST /api/v1/auth/login` vraća access + refresh JWT (`JWT_SECRET`, `JWT_REFRESH_SECRET`, rokovi `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`).
- Middleware `authenticate` prihvata `Authorization: Bearer …` ili `X-API-Key` (ključevi iz `users` modula, tabela `api_keys`).
- Uloge `admin | user | moderator` (`001_initial_schema.sql`); `requireAdmin` / `requireRole`.
- Seed admin iz `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`.
- Per-ruta limiteri: `authLimiter`, `passwordResetLimiter`, `authSessionLimiter`, `adminMutationLimiter`, `paymentsLimiter`, `webhookLimiter`.

## Billing i katalog isporuka

Folder `src/modules/billing/`:

| Fajl | Uloga |
|------|-------|
| `lib/deliverable-catalog.ts` | **25 isporuka** (`id`, `name`, `nameSr`, `description`, `billing`, `category`, `anchorEur`, `resources`, `modules`) |
| `lib/market-pricing.ts` | `MarketRegion` (`balkan`/`eu`/`dach`/`global`) i multiplikatori 0.8 / 1 / 1.8 / 1, plus industrijski indeksi |
| `lib/category-pricing.ts` | Tier multiplikatori (budget 0.75 … regulated 1.65), `CATEGORY_MARKET_INDEX`, `BASE_PLAN_PRICES` (49/129/299) |
| `lib/dynamic-pricing.engine.ts` | `quoteDeliverable` / `quoteCatalog` / `quoteVerticalPackage` — formula ispod |
| `lib/plan-deliverable-map.ts` | plan → implicitna isporuka (`starter→setup-quick`, `pro→setup-full`, `enterprise→setup-custom`) |
| `lib/deliverable-acceptance-contract.ts` | Šta svaka isporuka mora da proizvede da bi bila prihvaćena |
| `lib/fulfillment-quality-checklist.ts` | QA evaluatori po tipu artefakta |
| `lib/deliverable-handlers/registry.ts` | Mapiranje `deliverableId` → handler (`setup`, `consulting-doc`, `retainer`, `website`, `vertical-growth`, `custom-software`) |
| `service/deliverable-fulfillment.service.ts` | Kreira i izvršava job posle potvrde uplate |
| `service/client-deliverable-bootstrap.service.ts` | Aktivacija modula, CRM seed, SLA podešavanje, lead-gen kickoff |
| `service/deliverable-document-generator.service.ts` | AI-generisani sadržaj PDF-ova sa determinističkim fallback-om |
| `service/retainer-scheduler.service.ts` | Mesečno ponavljanje retainera |
| `service/revenue-allocation.service.ts` | Raspodela prihoda (naknada, rezerva za porez, rezerva za resurse, reinvest 20 %, neto vlasnika) |

Formula ponude (`computeMarketValueEur`):

```text
marketValue = anchorEur × tierMultiplier × categoryMarketIndex × marketRegionFactor × tamFactor × competitionFactor × intensityFactor
tamFactor         = clamp(log10(max(TAM, 5000) / 10000) + 1.15, 0.75, 2.2)
competitionFactor = 1 − (competition/100) × competitionDiscountMax
intensityFactor   = 0.82 + intensity/250
```

Zatim: donja granica troška (resource profil × cene resursa), donja granica sidra `anchorEur × tier × region × 0.65`, pa naknada provajdera plaćanja (Stripe 2.9 % + 0.25 €, Kriptoman 1.5 %, manual 0). Godišnja isporuka ima zaseban pod `anchor × 10 × tier × region × 0.6`. Poslovno tumačenje i tabele cena: [`13-POSLOVNI-MODEL-I-PAKETI.md`](./13-POSLOVNI-MODEL-I-PAKETI.md).

## Plaćanja (`src/modules/payments`)

| Provajder | Status | Ključne rute |
|-----------|--------|--------------|
| Ručna uplata (IBAN) | **Produkcioni put M0** (`PAYMENTS_MODE=manual`, `ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION`) | `POST /manual/checkout`, `POST /manual/deliverable-checkout`, `POST /manual/mark-sent/:id`, admin `POST /manual/confirm/:id` |
| Stripe | Kodirano, aktivira se ključevima; placeholder price ID-jevi `STARTER_PRICE_ID` itd. | `POST /stripe/checkout`, `POST /stripe/webhook`, `POST /stripe/cancel`, `GET /stripe/portal` |
| Kriptoman | Opciono; `KRIPTOMAN_ENABLED`, `KRIPTOMAN_DEV_MOCK` | `POST /kriptoman/checkout`, `/webhook`, `/sync/:id`, admin `/confirm/:id` |
| PayPal | Kad je `PAYPAL_CLIENT_ID` | `POST /paypal/order`, `POST /paypal/capture/:orderId` |
| Wise | Transfer endpoint | `POST /wise/transfer`, admin `POST /wise/confirm/:id` |

Potvrda uplate (bilo koji provajder) → `DeliverableFulfillmentService.enqueueForPayment` → `revenue-allocation` → notifikacije (`payment-notifications.service.ts`: e-mail, Telegram, web-push).

## Fulfillment lanac (šta se dešava posle uplate)

```text
payments.status = confirmed
  → deliverable_fulfillment_jobs (031)        status: queued
  → handler (registry.ts)                     generiše artefakte u artifact store
  → acceptance contract + QA checklist        do 3 pokušaja; QA gate opciono (ENABLE flag)
  → review_status pending_review → approved | rejected   (admin, 032)
  → retainer_schedule (033) za mesečne pakete → RetainerSchedulerService
```

Artefakti se preuzimaju preko `GET /api/v1/billing/fulfillment/jobs/:paymentId/artifacts/:filename`. E2E skripta koja prolazi svih 25 paketa: `scripts/e2e-fulfillment-all-packages.ps1`.

## Pozadinski poslovi

| Mehanizam | Konfiguracija |
|-----------|---------------|
| Bull redovi `tasks`, `emails`, `scraper`, `automation` | `REDIS_*`; ako Redis nije dostupan, in-memory fallback |
| Autonomy scheduler | `AUTONOMY_ENABLED`, `AUTONOMY_TICK_INTERVAL_MS` (300000), budžet `autonomy_budget_state` |
| Evolution tick / Cursor agent | `CURSOR_*`, tabela `cursor_agent_runs` |
| Product Factory interni lane | `PRODUCT_FACTORY_*`, `data/product-factory` |
| Retainer scheduler | automatski uz billing modul |

## Integracije (10 agregatora + direktne)

`AI_*` (OpenRouter i sl.), `BUSINESS_AND_DEV_*`, `SCRAPER_*`, `FINANCE_*`, `COMMS_*`, `INFRASTRUCTURE_*`, `STORAGE_*`, `CAPTCHA_*`, `DOMAIN_*`, `WEB3_STORAGE_*`; direktno: SMTP, VAPID push, YouTube (`YOUTUBE_PIPELINE_URL`), ElevenLabs/HeyGen/D-ID/Cartesia (avatari), Zoom/Google Meet, Apollo/Hunter/Lusha/Snov/ZoomInfo + NeverBounce/ZeroBounce (lead baze), Telegram, Steam, Apex. Puni spisak promenljivih: [`10-KONFIGURACIJA-I-ENV.md`](./10-KONFIGURACIJA-I-ENV.md).

## Testovi

| Komanda | Šta |
|---------|-----|
| `npm test` | Jest + Supertest, ~364 `*.test.ts` fajla (**3449 testova / 350 suita** na 2026-11-03) |
| `npm run test:ci` | build + eslint + jest sa coverage, bez integracionih |
| `npm run test:unit` / `test:integration` | podskupovi (`src/tests/unit`, `src/tests/integration`) |
| `npm run smoke:all` | PowerShell HTTP smoke protiv živog servera (health, auth, forge, admin bundle) — formalni release gate u `docs/operations/release-gate-checklist.md` |

Testovi koji čuvaju katalog: `src/tests/unit/deliverable-handlers.registry.test.ts` (svaka isporuka ima handler), `fulfillment-quality-checklist.test.ts` (svaka prolazi QA sa mock artefaktima), `modules/billing/dynamic-pricing.test.ts` (formula, regioni, godišnje).

## Migracije

33 SQL fajla u `src/database/migrations/`, pokreće ih `src/database/migrate.ts` (sortira po imenu, beleži u `schema_migrations`). Dupli prefiksi `012_*` i `013_*` su namerni — verzija je ceo naziv fajla. Pregled po tabelama: [`09-MODEL-PODATAKA.md`](./09-MODEL-PODATAKA.md).

## Operativni dokumenti modula

`atina-platform/atina/docs/operations/`: `release-gate-checklist.md`, `deploy-rollback-checklist.md`, `production-config-matrix.md`, `db-backup-restore-runbook.md`, `db-rollback-drill-runbook.md`, `LEAD-DATABASES-PHASED.md`, `ai-aggregator-avatars-api.md`.
