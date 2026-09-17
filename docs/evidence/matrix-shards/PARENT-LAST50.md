# Parent last ~50 cells (reserved)

Industries reserved for parent agent (do not run in shards 0–7):
- `home_services`
- `pets`
- `industrial`

Cell list: `parent-last50-cells.json`

After agents finish, parent runs:
```powershell
Set-Location 'C:\dev\omni group'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\e2e-fulfillment-matrix-prod.ps1 `
  -SkipUnavailable -Resume `
  -IndustryCategories home_services,pets,industrial `
  -ReportCsv 'docs\evidence\matrix-shards\parent-last50.csv' `
  -PollSec 180 -SleepBetweenSec 60 -RateLimitMaxAttempts 10
```

Then merge all shard CSVs into `docs/evidence/fulfillment-matrix-prod-full.csv`.
