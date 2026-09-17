# Repo status — NOW (verified snapshot)

**Datum:** 2026-09-17  
**Kanonska lista (P0–P3):** [`STATUS-KANON.md`](./STATUS-KANON.md)  
**Pravilo vlasnika:** firma + Stripe live + payment API (**PayPal/Wise/Kriptoman**) = **P2 NA KRAJU**.

**Izvori:** `deploy.config.json` · `KLJUCEVI-POPUNI.local.txt` · live VPS · DNS

---

## SPREMNO (ne diraj)

| Sloj | Status |
|------|--------|
| Site + API · M6 · full · €250 · lead **F3** (F5 ne forsirati) | LIVE |
| Fulfillment **850/850** | PASS |
| Stripe **TEST** + prices + webhook | SET |
| Instantly + Resend + Hunter + OpenRouter + scraper/Apify | SET |
| Apollo · NeverBounce · ZeroBounce · Snov · D-ID · HeyGen · Cartesia | SET |
| SMTP `ENABLED=true` · invoice PDF path (Resend attach + SMTP fallback) | READY |
| Portal: invoice history · buyer VAT fields · select polish | READY (P1 commit pending) |
| Zoom **join linkovi** (support/sales/marketing) | SET |
| GitHub `main` protection · VPS backup · rollback owner | DONE |
| n8n outreach stub guide + fixture + guardrails PASS | READY (nije live send) |
| Email DNS: Resend DKIM + SPF na `send.` | SET |
| `FINANCE_URL` | namerno prazan (nema aggregatora) |

---

## Otvoreno — vidi STATUS-KANON

| Nivo | Šta |
|------|-----|
| **P0** | DMARC, Resend verify, Instantly warmup, Slack ×2, mystery shopper, legal |
| **P1** | Commit/deploy billing + Problem Hunter + migracija 037 |
| **P2** | Firma, Stripe live, PayPal/Wise/Kriptoman |
| **P3** | Opciono — [`generated/EMPTY-KEYS.md`](./generated/EMPTY-KEYS.md) |

---

## Posle P0 Slack ključeva

Reci **deploy**. Tek **onda** P2 (firma → Stripe live → payment API).
