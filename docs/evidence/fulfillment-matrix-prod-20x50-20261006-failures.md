# Prod fulfillment matrix failures — 2026-10-06

**Run:** full 20 packages × 50 industries on https://omnigrouptech.com  
**Script:** `.\scripts\e2e-fulfillment-matrix-prod.ps1 -PollSec 210 -SleepBetweenSec 22`  
**CSV:** `docs/evidence/fulfillment-matrix-prod-20x50-20261006.csv`  
**Totals:** PASS=998 · FAIL=2 · SKIP=0 · cells=1000  
**Exit code:** 1

## Failures

| deliverableId | industryCategory | error | elapsedSec | paymentId |
|---|---|---|---|---|
| custom-software | admin_support | The remote server returned an error: (502) Bad Gateway. | 6 | 58ff49ca-3d13-48fe-83f5-d10605b4650f |
| setup-quick | ai_data | The remote server returned an error: (502) Bad Gateway. | 3 | *(empty — failed before payment id captured)* |

## Notes

- Both failures are HTTP **502 Bad Gateway** (transient infra), not checklist/quality failures.
- Script does not treat 502 as a cell-level transient retry (unlike 429 / connection closed / timeout).
- Remaining 998 cells completed successfully; no SKIP cells.
- Do not treat these as PASS without a re-run of the two cells.
