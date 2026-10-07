# Repo status — NOW (verified snapshot)

**Datum:** 2026-10-07  
**Kanonska lista (P0–P3):** [`STATUS-KANON.md`](./STATUS-KANON.md)  
**Gap audit:** [`evidence/PROJECT-GAP-AUDIT-20261007.md`](./evidence/PROJECT-GAP-AUDIT-20261007.md)  
**Pravilo vlasnika:** firma + Stripe live + payment API (**PayPal/Wise/Kriptoman**) = **P2 NA KRAJU**.

**Izvori:** `deploy.config.json` · live VPS · HARD matrix · FULL-REPO verdict · gap audit

---

## SPREMNO (ne diraj)

| Sloj | Status |
|------|--------|
| Site + API · M6 · full · €250 · lead **F3** (F5 ne forsirati) | LIVE |
| Fulfillment **1000/1000 HARD PASS** (20×50, all `checklistScore=100`) | PASS — [`HARD-FINAL`](./evidence/fulfillment-matrix-prod-20x50-HARD-FINAL-20261006.md) |
| Full-repo live audit / verdict | CONDITIONAL GTM — [`FULL-REPO-PASS-VERDICT`](./evidence/FULL-REPO-PASS-VERDICT-20261007.md) |
| Stripe **TEST** + prices + webhook (**ne LIVE**) | SET |
| Lead machine analysis → gate → hot-only hunt | SHIPPED; live harvest **OFF** (`LEAD_LIVE_HARVEST_ON_KICKOFF`) |
| Instantly + Resend + Hunter + OpenRouter + scraper/Apify | SET |
| Apollo · NeverBounce · ZeroBounce · Snov · D-ID · HeyGen · Cartesia | SET |
| SMTP `ENABLED=true` · invoice PDF path (Resend attach + SMTP fallback) | READY |
| Zoom **join linkovi** (support/sales/marketing) | SET |
| GitHub `main` protection · VPS backup · rollback owner | DONE |
| n8n outreach stub guide + fixture + guardrails PASS | READY (nije live send) |
| Email DNS: Resend DKIM + SPF na `send.` | SET |
| `FINANCE_URL` | namerno prazan (nema aggregatora) |

---

## Otvoreno — vidi STATUS-KANON + gap audit

| Nivo | Šta |
|------|-----|
| **GTM** | **CONDITIONAL** — Stripe LIVE + firma/VAT = Marko (P2); ne tretirati fulfillment PASS kao „ready for live cards“ |
| **Lead** | Live harvest: uključi `LEAD_LIVE_HARVEST_ON_KICKOFF` (analysis path već proven) |
| **P0** | Legal counsel (ostalo P0 DONE) |
| **P2** | Firma, Stripe live, PayPal/Wise/Kriptoman |
| **P3** | Opciono — [`generated/EMPTY-KEYS.md`](./generated/EMPTY-KEYS.md) |

---

## Posle Marko GTM koraka

Firma/VAT → Stripe **LIVE** + kartica smoke → (opciono) harvest flag ON. Tek onda real-card go-to-market.
