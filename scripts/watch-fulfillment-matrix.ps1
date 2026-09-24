#Requires -Version 5.1
<#
  Live progress for prod fulfillment matrix (reads CSV + optional .run.log).
.EXAMPLE
  .\scripts\watch-fulfillment-matrix.ps1
  .\scripts\watch-fulfillment-matrix.ps1 -Csv docs\evidence\fulfillment-matrix-prod-20260922_082458.csv -IntervalSec 60
#>
param(
  [string]$Csv = '',
  [int]$IntervalSec = 60,
  [int]$TotalCells = 1000,
  [switch]$Once
)

$ErrorActionPreference = 'SilentlyContinue'
$repo = Split-Path -Parent $PSScriptRoot
if (-not $Csv) {
  $Csv = Get-ChildItem (Join-Path $repo 'docs\evidence\fulfillment-matrix-prod-*.csv') |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}
$log = "$Csv.run.log"
$out = Join-Path $repo 'docs\evidence\MATRIX-WATCH-LATEST.md'

function Write-Status {
  $rows = @(Import-Csv $Csv)
  $pass = ($rows | Where-Object { $_.status -eq 'PASS' }).Count
  $fail = ($rows | Where-Object { $_.status -eq 'FAIL' }).Count
  $skip = ($rows | Where-Object { $_.status -eq 'SKIP' }).Count
  $proc = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'e2e-fulfillment-matrix-prod' } | Select-Object -First 1
  $pct = if ($TotalCells -gt 0) { [math]::Round(100 * $rows.Count / $TotalCells, 1) } else { 0 }
  $tail = if (Test-Path $log) { Get-Content $log -Tail 12 } else { @() }

  $md = @(
    "# Fulfillment matrix watch",
    "",
    "**Updated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "**CSV:** $Csv",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    "| Completed rows | $($rows.Count) / $TotalCells ($pct%) |",
    "| PASS | $pass |",
    "| FAIL | $fail |",
    "| SKIP | $skip |",
    "| Process running | $(if ($proc) { "yes (PID $($proc.ProcessId))" } else { 'no' }) |",
    "",
    "## Log tail",
    "",
    '```',
    ($tail -join "`n"),
    '```',
    ""
  ) -join "`n"
  Set-Content -Path $out -Value $md -Encoding UTF8
  Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $($rows.Count)/$TotalCells pass=$pass failed=$fail running=$(if($proc){'Y'}else{'N'})"
}

if ($Once) {
  Write-Status
  exit 0
}

Write-Host "Watching $Csv every ${IntervalSec}s -> $out" -ForegroundColor Cyan
$lastRows = -1
$staleTicks = 0
while ($true) {
  Write-Status
  $rowsNow = @(Import-Csv $Csv).Count
  if ($rowsNow -eq $lastRows) { $staleTicks++ } else { $staleTicks = 0; $lastRows = $rowsNow }
  if ($staleTicks -ge 5) {
    Write-Host "WARN: no CSV progress for $($staleTicks * $IntervalSec)s - likely rate limit; check .run.log" -ForegroundColor Yellow
  }
  $running = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'e2e-fulfillment-matrix-prod' }
  if (-not $running) {
    $rowsEnd = @(Import-Csv $Csv).Count
    $doneLine = if (Test-Path $log) {
      Get-Content $log | Select-String 'MATRIX DONE:' | Select-Object -Last 1
    } else { $null }
    if ($doneLine -or $rowsEnd -ge $TotalCells) {
      Write-Host 'Matrix process ended (complete).' -ForegroundColor Green
    } else {
      Write-Host "Matrix process ended early ($rowsEnd/$TotalCells) - run run-fulfillment-matrix-prod-resume.ps1" -ForegroundColor Yellow
    }
    Write-Status
    if (-not $doneLine -and $rowsEnd -lt $TotalCells) { break }
    $final = Join-Path $repo 'docs\evidence\MATRIX-RUN-FINAL.md'
    $finalText = @(
      '# Fulfillment matrix - finished',
      '',
      "**At:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
      "**CSV:** $Csv",
      '',
      $(if ($doneLine) { "**Log:** $($doneLine.Line)" } else { '**Log:** (no MATRIX DONE line - check .run.log)' }),
      '',
      'See docs/evidence/MATRIX-WATCH-LATEST.md for last counts.',
      ''
    ) -join "`n"
    Set-Content -Path $final -Value $finalText -Encoding UTF8
    break
  }
  Start-Sleep -Seconds $IntervalSec
}
