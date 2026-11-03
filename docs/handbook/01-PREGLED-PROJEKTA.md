# 01 — Pregled projekta

**Deo priručnika:** [`README.md`](./README.md) · Sledeće: [`02-ARHITEKTURA.md`](./02-ARHITEKTURA.md)

## Šta je Omni Group

Omni Group je monorepo jedne firme koja prodaje **gotove isporuke** (sajtove, automatizacije, AI podršku, lead generisanje, softver po meri) malim i srednjim firmama u Srbiji, regionu i DACH tržištu, a te isporuke proizvodi na **sopstvenoj platformi Atina**. Klijent ne kupuje „pristup platformi” — kupuje rezultat (PDF, live sajt, podešen CRM, mesečni izveštaj), a platforma je interni proizvodni pogon koji taj rezultat automatizovano pravi, meri i naplaćuje.

Tri rečenice koje treba zapamtiti:

1. **Prodaje se isporuka, ne licenca.** Katalog isporuka (`DELIVERABLE_CATALOG`) je jedini komercijalni izvor istine; planovi `starter/pro/enterprise` postoje u bazi, ali se tretiraju kao interni/bundlovani (vidi [`13-POSLOVNI-MODEL-I-PAKETI.md`](./13-POSLOVNI-MODEL-I-PAKETI.md)).
2. **Plaćanje pokreće fulfillment.** Potvrda uplate (ručna IBAN uplata, Stripe, Kriptoman…) kreira job koji handler automatski izvršava, QA checklista proverava, admin odobrava.
3. **Postoje tri različite „Atine”.** To je najčešći izvor zabune — rečnik je ispod.

## Komponente monorepa

| Sloj | Putanja | Tehnologija | Uloga | Port |
|------|---------|-------------|-------|------|
| Python Forge / Atina worker / Astra | `src/forge`, `src/atina`, `src/astra` | Python 3.12, Flask, SQLite | Petlja koja simulira nabavku cloud resursa i troši RSD budžet; worker pravi „supply” zapise; Flask status UI | Astra **8080** |
| Atina Express SaaS | `atina-platform/atina/` | Express + TypeScript, Postgres, Redis/Bull | **Glavni proizvod:** 61 modul, 348 ruta, auth, billing, plaćanja, CRM, fulfillment, autonomy loop, product factory | **3000** |
| Atina System (Nest) | `atina-system/` | NestJS 10, TypeORM, Postgres | Manji API za PDF/Titan scenarije (auth, leads, contracts, invoices, supply cron). Zaseban DB i port | **3001** |
| Omnigroup web | `apps/omnigroup-web/` | Next.js 14, Tailwind | Javni sajt (`/`, `/pricing`, `/services`…) + klijentski/admin dashboard; BFF proxy ka Express Atini | **3010** |
| YouTube pipeline | `tools/youtube-pipeline/` | Celery, Redis, moviepy | Scout → voice → assets → beast → manager lanac koji proizvodi MP4; HTTP `/run` | **8090** |
| Sistem naplate | `sistem_naplate/` | Python, fpdf2 | Samostalne skripte za PDF fakture i simulaciju provere uplate (FAZA 1) | — |
| Infra | `infra/caddy`, `infra/k8s`, `infra/observability` | Caddy, Kustomize | TLS reverse proxy, K8s baza + overlay-i, beleške za observability | 80/443 |
| Deljena konfiguracija | `config/env-aggregator.json`, `data/` | JSON | Podrazumevane env vrednosti za više stackova; podrazumevani folder Python vault-a | — |

Detaljna mapa fajlova: [`../../SYSTEM-MAP.md`](../../SYSTEM-MAP.md). Kako komponente razgovaraju: [`02-ARHITEKTURA.md`](./02-ARHITEKTURA.md).

## Rečnik pojmova (obavezno)

| Pojam | Znači | Ne znači |
|-------|-------|----------|
| **Atina** / „Atina Node” / `atina-saas` | Express SaaS u `atina-platform/atina` na :3000 | Nest, Python |
| **`atina`** (Dockerfile target, compose servis, `src/atina`) | Python Supply Core worker koji čita Forge vault | HTTP API |
| **`atina-system`** (folder) | NestJS API na :3001 sa sopstvenim Postgresom `atina` | Express modul |
| `modules/atina-system` (unutar Express-a) | SaaS feature modul „Atina System” (CRUD ekosistem sistema) | Nest paket |
| **Forge (Python)** | `src/forge/master_forge.py` — petlja koja piše u SQLite vault | Node Forge |
| **Forge (Node)** | `atina-platform/atina/src/modules/forge` — SQLite ledger API sa drugačijom šemom | Python vault |
| **Astra** | Flask UI/API na :8080 koji čita Python vault | Deo Nest/Express |
| **Titan*** moduli (Titanis, Titanix, Titan Score…) | Prodajni/izvršni moduli unutar Express Atine | Posebni servisi |
| **Isporuka (deliverable)** | Jedinica koja se prodaje; id iz `DELIVERABLE_CATALOG` (npr. `audit`, `ai-receptionist`) | Plan pretplate |
| **Plan** (`starter/pro/enterprise`) | Red u tabeli `plans`; nakon plaćanja mapira se na implicitnu isporuku (`setup-quick/full/custom`) | Ono što se marketinški prodaje |
| **Fulfillment job** | Red u `deliverable_fulfillment_jobs` koji handler izvršava posle potvrde plaćanja | Task u Bull redu (to je niži nivo) |
| **Talas N / Val NNN** | Interni brojači agentskih talasa rada i verzija evidencije (vidi `scripts/README.md`) | Verzija softvera |
| **M0–M6** | Go-to-market faze (M0 „novac odmah” ručnom uplatom, M1 inbound…), ne ciklusi naplate | Billing period |
| **Nivo 1/2/3** | Faze zrelosti monorepa (N1 CI zelen + smoke, N2 Master Spec, N3 K8s/multi-tenant vizija) | Prioriteti bagova |

## Ko šta koristi

| Uloga | Ulazna tačka | Šta radi |
|-------|--------------|----------|
| Vlasnik | `/admin` na sajtu, Telegram/Slack obaveštenja | Potvrđuje ručne uplate, odobrava fulfillment, prati budžet autonomy loop-a |
| Klijent | `/pricing` → checkout → `/dashboard` | Bira isporuku, plaća, preuzima artefakte (PDF, URL sajta), zakazuje sastanke |
| Inženjer | ovaj priručnik, `NIVO-*` checkliste, `scripts/` | Razvija module, drži CI zelen, održava kataloge sinhronizovanim |
| Agent (AI) | `AGENT-RADNI-PLAN.md`, `docs/MASTER-WORK-LIST.md`, Cloud Agent okruženje | Izvršava Talas zadatke, piše evidenciju, ne dira produkcione tajne |

## Status i zrelost (2026-11-03)

- **CI (monorepo)** zelen na `main`: doc-gate + pytest, Atina build/lint/jest (3449 testova u 350 suita), web build, Nest `verify:ci`, compose config.
- **Produkcija:** M0 model — ručna IBAN uplata → fulfillment; Stripe/PayPal/Wise/Kriptoman kodirani, aktiviraju se kad se unesu ključevi (vidi [`10-KONFIGURACIJA-I-ENV.md`](./10-KONFIGURACIJA-I-ENV.md) i [`12-DEPLOY-I-OPERACIJE.md`](./12-DEPLOY-I-OPERACIJE.md)).
- **Katalog isporuka v2:** 25 paketa (17 iz v1 + 8 novih prema analizi tržišta) i nova dimenzija `marketRegion` u motoru cena — opis u [`15-PREDLOG-NOVIH-PAKETA.md`](./15-PREDLOG-NOVIH-PAKETA.md).
- **Poznata odstupanja** (namerno nisu „popravljena” bez odluke vlasnika): cene planova 39/99/249 € u bazi naspram 49/129/299 € u `BASE_PLAN_PRICES`; dve različite SQLite šeme vault-a (Python vs Node). Oba su dokumentovana u 09 i 13.

## Gde su stvari koje ćeš najčešće tražiti

| Tražiš | Fajl |
|--------|------|
| Spisak paketa i cena | `atina-platform/atina/src/modules/billing/lib/deliverable-catalog.ts` (+ ogledalo `apps/omnigroup-web/src/lib/deliverable-catalog.ts`) |
| Kako se računa cena na `/pricing` | `atina-platform/atina/src/modules/billing/lib/dynamic-pricing.engine.ts` |
| Šta se dešava posle uplate | `atina-platform/atina/src/modules/billing/service/deliverable-fulfillment.service.ts` + `deliverable-handlers/` |
| Sve HTTP rute | [`08-API-REFERENCA.md`](./08-API-REFERENCA.md) |
| Sve env promenljive | [`10-KONFIGURACIJA-I-ENV.md`](./10-KONFIGURACIJA-I-ENV.md) |
| Kako pokrenuti lokalno / u Cloud Agentu | [`11-RAZVOJ-I-TESTIRANJE.md`](./11-RAZVOJ-I-TESTIRANJE.md) |
