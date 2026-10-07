# Admin — jedna lista (kratko)

**Kanonski status (puna lista):** [`STATUS-KANON.md`](./STATUS-KANON.md)  
**Live snapshot:** [`REPO-STATUS-NOW.md`](./REPO-STATUS-NOW.md)  
**Gap audit:** [`evidence/PROJECT-GAP-AUDIT-20261007.md`](./evidence/PROJECT-GAP-AUDIT-20261007.md)  
**Prazni ključevi:** [`generated/EMPTY-KEYS.md`](./generated/EMPTY-KEYS.md) · `.\scripts\audit-empty-keys.ps1`

**Pravilo:** firma · Stripe live · PayPal/Wise/Kriptoman = **P2 NA KRAJU**.

**Live:** https://omnigrouptech.com · API · **M6** · budget €250 · fulfillment **1000/1000 HARD** (`checklistScore=100`) · GTM **CONDITIONAL** · Stripe **TEST** (ne LIVE) · lead analysis→hunt shipped (`LEAD_LIVE_HARVEST_ON_KICKOFF` još OFF)

Dokaz: [`HARD-FINAL`](./evidence/fulfillment-matrix-prod-20x50-HARD-FINAL-20261006.md) · [`FULL-REPO-PASS-VERDICT`](./evidence/FULL-REPO-PASS-VERDICT-20261007.md) · [`PROJECT-GAP-AUDIT`](./evidence/PROJECT-GAP-AUDIT-20261007.md)

---

## P0 — ti pre kraja (7 stavki)

Vidi tabelu **P0** u [`STATUS-KANON.md`](./STATUS-KANON.md#p0--pre-sve-spremno-ti-dns--ui--e2e):

1. DMARC · 2. Resend Verify · 3. Instantly warmup · 4–5. Slack ×2 · 6. Mystery shopper + PDF · 7. Legal counsel

---

## P1 — reci „commit“ / „deploy“

Billing paketi · maintenance · invoice history · Problem Hunter · migracija 037 — vidi [`STATUS-KANON.md#p1`](./STATUS-KANON.md#p1--kod-spreman-čeka-commit--deploy--migraciju). (**P1 8/8 DONE.**)

---

## P2 — NA KRAJU (GTM CONDITIONAL)

Firma / VAT · Stripe **LIVE** (+ kartica smoke) · PayPal · Wise · Kriptoman — vidi [`STATUS-KANON.md#p2`](./STATUS-KANON.md#p2--na-kraju-posle-p0--p1).  
**Stripe LIVE nije urađen** — prod je još TEST.

**Lead:** analysis→hot hunt shipped; live harvest = uključi `LEAD_LIVE_HARVEST_ON_KICKOFF` (+ `LEAD_DATABASE_ENABLED`).

---

## JA — gotovo

Vidi **LIVE** sekciju u [`STATUS-KANON.md`](./STATUS-KANON.md#live--potvrđeno-ne-diraj) — uključujući LIVE-02 **1000/1000 HARD** (ne zastareli 850/850).

---

## Gde lepiš tajne

`deploy-secrets.local/deploy.config.json` + `atina-platform/atina/KLJUCEVI-POPUNI.local.txt` → reci **deploy**
