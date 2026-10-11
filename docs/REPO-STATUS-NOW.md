# Repo status — NOW (verified snapshot)

**Datum:** 2026-10-09  
**Kanonska lista (P0–P3):** [`STATUS-KANON.md`](./STATUS-KANON.md)  
**Finish doc:** [`evidence/DONE-EXCEPT-MARKO-P2-20261009.md`](./evidence/DONE-EXCEPT-MARKO-P2-20261009.md)  
**Pravilo vlasnika:** firma + Stripe live + payment API (**PayPal/Wise/Kriptoman**) = **P2 NA KRAJU**.

**Izvori:** Ultimatrix hashed · live VPS (honesty SafeDeploy EXIT 0) · HARD matrix · prod audit 13 PASS / 0 FAIL / 2 TI · empty keys 67 SET / 32 EMPTY

---

## SPREMNO (ne diraj)

| Sloj | Status |
|------|--------|
| Site + API · M6 · full · €250 · lead **F3** | LIVE |
| **Ultimatrix** hashed gate | **PASS** — [`ultimatrix-LATEST.txt`](./evidence/ultimatrix-LATEST.txt) |
| Fulfillment **1000/1000 HARD PASS** (20×50, all `checklistScore=100`) | PASS — [`HARD-FINAL`](./evidence/fulfillment-matrix-prod-20x50-HARD-FINAL-20261006.md) |
| Intro −15% first 50 → full list | **ACTIVE** 50/50 on VPS |
| Commercial companion + support AI solver | **DEPLOYED** (dist OK) |
| Public honesty **SERVICE + DOCS** | **LIVE** `/pricing` — SafeDeploy EXIT 0 [`honesty log`](./evidence/_tmp-safedeploy-honesty-labels-20261009.txt) |
| Prod autonomous audit | **13 PASS · 0 FAIL · 2 TI** — [`PROD-AUDIT`](./generated/PROD-AUDIT.md) |
| Stripe **TEST** + prices + webhook (**ne LIVE**) | SET |
| Lead machine analysis → gate → hot-only hunt | SHIPPED; live harvest **OFF** |
| Instantly + Resend + Hunter + OpenRouter + scraper/Apify | SET |
| Apollo · NeverBounce · ZeroBounce · Snov · D-ID · HeyGen · Cartesia | SET |
| SMTP · invoice PDF path | READY |
| Zoom join linkovi | SET |
| GitHub `main` protection · VPS backup · rollback owner | DONE |

---

## Otvoreno — samo Marko / TI

| Nivo | Šta |
|------|-----|
| **P2 (NA KRAJU)** | Firma/VAT → Stripe **LIVE** → (opciono) PayPal/Wise/Kriptoman |
| **GTM** | CONDITIONAL dok Stripe nije LIVE |
| **Lead** | `LEAD_LIVE_HARVEST_ON_KICKOFF` kad hoćeš live harvest |
| **P0 TI** | Legal counsel sign-off; optional fresh mystery-shopper PDF |
| **P3** | Opciono — [`generated/EMPTY-KEYS.md`](./generated/EMPTY-KEYS.md) |

---

## Posle Marko GTM koraka

Firma/VAT → Stripe **LIVE** + kartica smoke → (opciono) harvest flag ON. Tek onda real-card go-to-market.

Agenti: pre „PASS“ uvek `node scripts/test-ultimatrix.mjs` + citirati `ultimatrix-LATEST.txt` sha256.
