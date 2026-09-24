#Requires -Version 5.1
<#
  Resume the latest (or given) prod fulfillment matrix with rate-limit-safe pacing.
.EXAMPLE
  .\scripts\run-fulfillment-matrix-prod-resume.ps1
  .\scripts\run-fulfillment-matrix-prod-resume.ps1 -Watch
#>
param(
  [string]$ReportCsv = '',
  [switch]$Fresh,
  [switch]$Watch,
  [int]$SleepBetweenSec = 25,
  [int]$PollSec = 180
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$scripts = $PSScriptRoot

if ($Fresh) {
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $ReportCsv = Join-Path $repo "docs\evidence\fulfillment-matrix-prod-$stamp.csv"
} elseif (-not $ReportCsv) {
  $ReportCsv = Join-Path $repo 'docs\evidence\fulfillment-matrix-prod-20260922_082458.csv'
  if (-not (Test-Path $ReportCsv)) {
    $ReportCsv = Get-ChildItem (Join-Path $repo 'docs\evidence\fulfillment-matrix-prod-*.csv') |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1 -ExpandProperty FullName
  }
}
if (-not $ReportCsv) { throw 'No matrix CSV found. Pass -ReportCsv or -Fresh' }

$log = "$ReportCsv.run.log"
Write-Host "$(if ($Fresh) { 'Fresh matrix' } else { 'Resume matrix' }) -> $ReportCsv" -ForegroundColor Cyan
Write-Host "  Log: $log" -ForegroundColor DarkGray
Write-Host "  SleepBetweenSec=$SleepBetweenSec PollSec=$PollSec" -ForegroundColor DarkGray

Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'e2e-fulfillment-matrix-prod' } | ForEach-Object {
  Write-Host "Stopping stale matrix PID $($_.ProcessId)" -ForegroundColor Yellow
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

$e2e = Join-Path $scripts 'e2e-fulfillment-matrix-prod.ps1'
$resumeArg = if ($Fresh) { '' } else { ' -Resume' }
# Single argument string — paths under "omni group" break Start-Process -ArgumentList @('-File', $pathWithSpaces).
$psArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$e2e`" -ReportCsv `"$ReportCsv`" -PollSec $PollSec -SleepBetweenSec $SleepBetweenSec$resumeArg"
Start-Process -FilePath 'powershell.exe' -ArgumentList $psArgs -WorkingDirectory $repo `
  -RedirectStandardOutput $log -RedirectStandardError ($log + '.err') -WindowStyle Hidden
Write-Host 'Matrix started in background.' -ForegroundColor Green

if ($Watch) {
  Start-Sleep -Seconds 3
  & (Join-Path $scripts 'watch-fulfillment-matrix.ps1') -Csv $ReportCsv -IntervalSec 120
}
