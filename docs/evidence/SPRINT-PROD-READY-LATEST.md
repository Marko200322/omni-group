# Sprint prod-ready — evidence

**Date:** 2026-08-14 (sprint run)  
**Web:** https://omnigrouptech.com  
**Mode:** warm lean M3 (hunt cron off)

## Results

| Step | Status | Detail |
|------|--------|--------|
| Keep-warm cron (*/5 min) | **PASS** | `/var/log/keep-warm-prod.log` |
| Purge failed outbound | **PASS** | **451** rows deleted; 1 `sent` retained |
| Contact smoke | **PASS** | Resend + CRM ok |
| E2E billing prod | **PASS** | audit → confirm → fulfillment **completed** (2 artifacts) |

## E2E prod (live)

| Field | Value |
|-------|--------|
| User | e2e-prod-1786676721136@test.local |
| Payment ID | 8c7df1a2-eeb8-459a-a26b-ea396ab2fd07 |
| Reference | ATINA-7E5CCC79-1786676722713 |
| Amount | EUR 590 |
| Fulfillment | completed, 2 artifacts |

## Still open (not sprint blockers)

- Legal Terms/Privacy = template (counsel)
- Firma/PIB on invoice (owner)
- Gmail kontakt — proveri spam; Telegram OK
- Cold start mitigated by keep-warm (monitor log)

## Re-run

```powershell
.\scripts\sprint-prod-ready.ps1
.\scripts\e2e-billing-prod.ps1
.\scripts\install-keep-warm-cron.ps1 -RunOnceNow
```

## Scripts added

- `scripts/keep-warm-prod.sh`
- `scripts/install-keep-warm-cron.ps1`
- `scripts/purge-failed-outbound.ps1`
- `scripts/e2e-billing-prod.ps1`
- `scripts/sprint-prod-ready.ps1`
