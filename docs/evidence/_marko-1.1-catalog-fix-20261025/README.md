# Marko email “test omni 1.1” — catalog honesty fix

**Date:** 2026-10-25  
**Verdict:** `MARKO_1_1_CATALOG_COPY_PASS` (see `VERDICT.json`)  
**Probe:** soft web `http://164.68.127.15:3010` after `deploy-soft.ps1`  
**Note:** `:8080` nginx was down during probe; container `:3010` healthy. Domain HTTPS timed out from this runner — not used as gate for this copy pass.

## Email items

| # | Claim | Result |
|---|--------|--------|
| P0 | 17+3 vs 20+3 / 23 drift | **FIXED** — live `/pricing` FAQ: `20 expert services + 3 bundles × 50`; `/solutions`: `20 expert + 3 bundles = 23; 23 × 50 ≈ 1,150`. Zero `17 expert`. |
| P0 | Custom deploy vs Production runbook | **FIXED** — `setup-custom` name = Production runbook; `Custom deploy` = 0 on `/pricing` + `/services`. |
| P1 | Mojibake `�` in PDF descriptions | **FIXED** — U+FFFD = 0 on `/pricing`, `/solutions`, `/services`, `/`. Synced UTF-8 from Atina → web catalogs. |
| P1 | Industry niche genericity | **OPEN** — not claimed fixed; still template-aware niches (separate pass). |
| Status honesty | Stripe/email not auto-green | **KEPT** — no change. |

## Files

- `probe-summary.json` / `.txt` — page byte counts + phrase counters  
- `phrase-scan.json` — deep needle scan  
- `VERDICT.json` — machine verdict  
- `soft_*.html` — raw HTML snapshots  

## Code touchpoints

- Atina → web UTF-8 sync (`deliverable-catalog`, `package-delivery-spec`)  
- `setup-custom` → Production runbook (marketing catalog / plans / acceptance)  
- `PricingClarityFaq` + `/solutions` copy: 23 = 20+3; 1,150 = 23×50 clarification  
- `audit-public-catalog-live.mjs` expected name/price for setup-custom  
