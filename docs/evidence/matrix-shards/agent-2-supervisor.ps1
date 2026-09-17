$csv = "C:\dev\omni group\docs\evidence\matrix-shards\agent-2.csv"
$argList = '-NoProfile -ExecutionPolicy Bypass -File "C:\dev\omni group\scripts\e2e-fulfillment-matrix-prod.ps1" -SkipUnavailable -Resume -IndustryCategories legal_services,writing_translation,logistics,media -ReportCsv "' + $csv + '" -PollSec 180 -SleepBetweenSec 80 -RateLimitMaxAttempts 10'
$log = "C:\dev\omni group\docs\evidence\matrix-shards\agent-2-supervisor.log"
while ($true) {
  $rows = @(Import-Csv $csv -ErrorAction SilentlyContinue)
  $done = @($rows | Where-Object { $_.status -in @('PASS','SKIP') }).Count
  if ($done -ge 68) { Add-Content $log "$(Get-Date -Format o) complete done=$done"; break }
  Add-Content $log "$(Get-Date -Format o) starting run done=$done/68"
  $p = Start-Process powershell.exe -ArgumentList $argList -WorkingDirectory "C:\dev\omni group" -Wait -PassThru -WindowStyle Hidden
  $done2 = @((Import-Csv $csv) | Where-Object { $_.status -in @('PASS','SKIP') }).Count
  Add-Content $log "$(Get-Date -Format o) run exit=$($p.ExitCode) done=$done2/68"
  if ($done2 -ge 68) { break }
  Start-Sleep -Seconds 60
}
