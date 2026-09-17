$ErrorActionPreference = 'Continue'
Set-Location 'C:\dev\omni group'
$csv = 'docs\evidence\matrix-shards\agent-7.csv'
$log = 'docs\evidence\matrix-shards\agent-7-resume-loop.log'
$expected = 68
function Get-DoneCount {
  if (-not (Test-Path $csv)) { return 0 }
  return @((Import-Csv $csv | Where-Object { $_.status -in @('PASS','SKIP','FAIL') })).Count
}
while ($true) {
  $done = Get-DoneCount
  Add-Content -Path $log -Value ('{0} resume-loop done={1}/{2}' -f (Get-Date -Format o), $done, $expected)
  if ($done -ge $expected) { break }
  $outLog = 'docs\evidence\matrix-shards\agent-7-run.log'
  $errLog = 'docs\evidence\matrix-shards\agent-7-run.err.log'
  $argList = @(
    '-NoProfile','-ExecutionPolicy','Bypass','-File','scripts\e2e-fulfillment-matrix-prod.ps1',
    '-SkipUnavailable','-Resume',
    '-IndustryCategories','sales,construction,real-estate,professional',
    '-ReportCsv', $csv,
    '-PollSec','180','-SleepBetweenSec','105','-RateLimitMaxAttempts','10'
  )
  $p = Start-Process -FilePath powershell.exe -WorkingDirectory 'C:\dev\omni group' -WindowStyle Hidden -ArgumentList $argList -PassThru -Wait -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  Add-Content -Path $log -Value ('{0} run exit {1}' -f (Get-Date -Format o), $p.ExitCode)
  Start-Sleep -Seconds 45
}
Add-Content -Path $log -Value ('{0} resume-loop complete done={1}' -f (Get-Date -Format o), (Get-DoneCount))
