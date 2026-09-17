Set-Location "C:\dev\omni group"
Start-Sleep -Seconds 300
& ".\scripts\e2e-fulfillment-matrix-prod.ps1" -SkipUnavailable -Resume -IndustryCategories real_estate_services,hospitality,automotive,travel -ReportCsv "docs\evidence\matrix-shards\agent-6.csv" -PollSec 180 -SleepBetweenSec 100 -RateLimitMaxAttempts 10
exit $LASTEXITCODE
