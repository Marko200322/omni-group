# Plan rada — implementacija Titan audita

**Datum:** 2026-05-21  
**Izvor:** revizija Vrhovnog arhitekte (workspace `omni group`)  
**Cilj:** zatvoriti strukturalne rupe (moduli #23, #31), pooštriti PHASE gating, C-S-R refaktor CRM-a, Apex Content Tier.

---

## Faza 1 — Struktura i registry (ova sesija)

| # | Zadatak | Status |
|---|---------|--------|
| 1.1 | Modul **alert-system** (#23): migracija `011_system_alerts.sql`, C-S-R, rute, CoreEngine | **Gotovo** |
| 1.2 | Modul **scaling** (#31): C-S-R nad `system_nodes`, policy/evaluate, CoreEngine | **Gotovo** |
| 1.3 | **MODULE_MIN_PHASE** — mapa za sve slug-ove (`module-phase-registry.ts`) | **Gotovo** |
| 1.4 | **CRM** refaktor: controller → service → repository | **Gotovo** |
| 1.5 | **Apex Predator** — Content Tier System (10€–1000€) | **Gotovo** |
| 1.6 | Unit testovi: alert-system, scaling, phase, apex tier, CRM rute | **Gotovo** |

---

## Faza 2 — Monolitni moduli → C-S-R (**Gotovo** 2026-05-21)

| Modul | Putanja | Status |
|-------|---------|--------|
| Scraper | `modules/scraper/` | **Gotovo** — dto, repository, service, controller, `scraper-engine.ts` |
| Contracts | `modules/contracts/` | **Gotovo** — dto izdvojen; re-export iz modula za testove |
| Subscriptions | `modules/subscriptions/` | **Gotovo** |
| Notifications | `modules/notifications/` | **Gotovo** — `createNotification` delegira na service |
| Admin | `modules/admin/` | **Gotovo** — helpers, repository, service, controller (~210 linija modul) |
| Analytics | `modules/analytics/` | **Gotovo** |
| Automation | `modules/automation/` | **Gotovo** — `automation-workflow.runner.ts`; re-export DTO tipova |

### Faza 2b — Platform / SaaS C-S-R (**Gotovo** 2026-05-21)

| Modul | Putanja | Status |
|-------|---------|--------|
| Billing | `modules/billing/repository/` | **Gotovo** — sav SQL u repozitorijumu |
| Payments | `modules/payments/repository/` | **Gotovo** — `execute` + `runInTransaction`; Stripe/PayPal/Wise u service |
| Resource management | `modules/resource-management/repository/` | **Gotovo** |
| Phase launch | `modules/phase-launch/repository/` | **Gotovo** — audit insert u repo; service bez `query()` |

---

## Faza 3 — Stvarna isporuka proizvoda (**Struktura gotova** 2026-05-21)

| Proizvodna linija | Šta | Status |
|-------------------|-----|--------|
| Craftor | `craftor-run.executor.ts` — scraper/storage/local deploy; `MODE_YIELDS` samo fallback | **Gotovo** (live: `CRAFTOR_*`, `SCRAPER_*`) |
| OmniTube | `tools/youtube-pipeline/app/youtube_upload.py` u `manager_task` | **Gotovo** (live: `YOUTUBE_*`) |
| OmniGame | `steamworks.provider.ts` — eksplicitno N/A + `STEAM_WEB_API_KEY` signal | **Gotovo** |
| Apex | `providers/flux-provider.ts`, `live-portrait-provider.ts` | **Gotovo** (live: `APEX_FLUX_*`, `APEX_LIVE_PORTRAIT_*`) |
| Dominus v3–v6 | `dominus360-submodules.ts` + `GET /dominus360/submodules` | **Gotovo** (v3 swarm = N/A) |

**Testovi:** `craftor-run.executor.test.ts`, `apex-media-providers.test.ts`, `dominus360-submodules.test.ts`, prošireni `task-executors.test.ts`.

---

## Faza 4 — Agent-deo (**Gotovo** 2026-05-21) + vlasnik

| Stavka | Status |
|--------|--------|
| **tasks** modul — pun C-S-R + `tasks.worker.ts` | **Gotovo** |
| **workflow-chain** — `WorkflowChainPersistence` (bez `query` u service) | **Gotovo** |
| **omnigroup-web F4-2** — live `/auth/me`, `/tasks`, `/notifications`, workflow stats | **Gotovo** |
| **`.env`** kreiran za popunu | `atina-platform/atina/.env` (gitignore) |

**Vlasnik:** popuniti agregatore u `.env`, staging/prod smoke + CEO evidencije — [`VLASNIK-ENV-POPUNI.md`](./VLASNIK-ENV-POPUNI.md)

---

## Gate pre merge-a

```powershell
cd atina-platform\atina
npm run build
npm run test:ci
```
