# Package premium quality probe — 2026-10-12

## Verdict

**PASS (local generators + raised floors).** Prod VPS HTTP timed out — live mystery-shopper E2E deferred until host is reachable.

## What was tightened

| Gate | Before | After |
|------|--------|-------|
| Audit body | 4500 chars | **5000** |
| Workflow / integration / setup-full | 2000–2400 | **2800** |
| Setup-quick | 3200 | **3500** |
| Sales / white-label | 1800 | **2500** |
| Website-business / ecommerce / landing | 3200–3600 | **3600–4000** |
| AI doc accept floor | 1200 / 4 sec | **2000 / 5 sec** |
| Site home min | 280 / 420 | **400 / 480** |
| Site secondary min | 160 | **200** |

Also: thicker website home/about/contact fallbacks; healthcare awkward “digital presence —” copy fixed; per-order `ORD-…` binding already required.

## Local evidence

```text
npx jest src/tests/unit/package-premium-quality.test.ts ...
→ 8/8 PASS (audit 8285 chars, setup-full 6292, website-business home ~1114, order-bound)
```

Related green: order-variety, fulfillment-quality-checklist, setup-handler.acceptance, deliverable-content-generator.

## Live next (when VPS up)

```powershell
.\scripts\e2e-billing-prod.ps1 -DeliverableId audit
.\scripts\e2e-billing-prod.ps1 -DeliverableId website-business
# Compare contentOrderRef + fingerprints across two ClientEmail runs
```
