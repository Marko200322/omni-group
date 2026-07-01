# Fulfillment — 17 paketa × industrija (master checklist)

**Cilj:** Klijent plati → sistem automatski isporuči **sve iz kataloga** → checklist 100% → auto-release.  
**Jedini ručni korak pre firme:** admin confirm manual uplate.  
**Pricing:** industry market index + dynamic quote (već u kodu).

Status legenda: `[ ]` todo · `[~]` u toku · `[x]` done · `[!]` blokirano (spoljni API)

---

## Faza 0 — Contract (acceptance criteria)

Izvor istine: `deliverable-acceptance-contract.ts` + `deliverable-catalog.ts` description.

| # | Paket | Obavezno posle plaćanja |
|---|-------|-------------------------|
| 1 | setup-quick | PDF, project, portal moduli (notifications, billing) |
| 2 | setup-full | + CRM seed, migration CSV, training outline, automations |
| 3 | setup-custom | + production deploy manifest, deploy prep |
| 4 | audit | PDF audit report |
| 5 | workflow-design | PDF workflow/SOP pack |
| 6 | integration | PDF guide + integration-config.json + webhooks |
| 7 | support-priority | PDF, SLA 24h, support moduli, triage task |
| 8 | support-dedicated | PDF, SLA 8h, + video meetings, health check, Slack notify |
| 9 | landing | Live published URL |
| 10 | website-business | Live URL, ≥5 stranica ili project |
| 11 | website-ecommerce | Live URL, katalog ≥4 proizvoda, shop orders (Stripe + manual) |
| 12 | white-label-setup | PDF + branding landing live |
| 13 | sales-enablement | PDF demo/FAQ/onboarding pack |
| 14 | vertical-package | PDF, CRM seed, moduli (crm, automation, avatar, billing) |
| 15 | lead-gen-retainer | PDF, Titanis kickoff, CRM, lead report, **mesečni cron** |
| 16 | ai-support-retainer | PDF, avatar+RAG+meetings, HeyGen/D-ID provision artifact |
| 17 | custom-software | Greenfield project, handoff PDF, test gate metadata |

---

## Faza 1 — Handleri

- [x] 1a–1e. Svih 17 handlera — E2E PASS lokalno

---

## Faza 2 — Automated checklist + retry + memory

- [x] `runFulfillmentQualityChecklist` po paketu
- [x] Block release until checklist passes
- [x] Auto retry do 3× sa memory hints
- [x] QA gate off by default
- [x] Unit tests 20/20

---

## Faza 3 — E2E test po paketu

- [x] Lokalno 17/17 (`scripts/e2e-fulfillment-all-packages.ps1`)
- [x] CI unit tests 20/20
- [x] Produkcija smoke 32/32

---

## Faza 4 — Deploy + operativa

- [x] Fresh deploy (FreshWipe)
- [x] Incremental deploy fix — `prepare-vps-prod.ps1` čuva DB_PASSWORD
- [x] Retainer scheduler — mesečni lead-gen cron (`retainer-scheduler.service.ts`)
- [x] Shop Stripe checkout — `createShopCheckoutSession` + webhook
- [x] Avatar provisioning — HeyGen/D-ID memory artifact
- [x] Slack webhook — dedicated support + shop/fulfillment notify
- [~] DNS `api.omnigrouptech.com` — Caddy spreman; dodaj A zapis (`scripts/verify-production-dns.ps1`)
- [~] Stripe live — kod spreman; aktivira se kad firma + `STRIPE_SECRET_KEY` live

---

## Napomene

- **Industrija:** svaki quote koristi `industryCategory` + `CATEGORY_MARKET_INDEX`.
- **99.9%:** manual payment confirm only (do firme).
- **Incremental deploy:** bez `-FreshWipe` — ne rotiraj secrets; koristi `-RotateSecrets` samo namerno.

Ažurirano: 2026-06-30
