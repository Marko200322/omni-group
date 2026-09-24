#Requires -Version 5.1
<#
  Tracks two matrix CSVs (canonical 20260922 + optional fresh run). Writes MATRIX-WATCH-DUAL.md
.EXAMPLE
  .\scripts\watch-fulfillment-matrix-dual.ps1 -Once
  .\scripts\watch-fulfillment-matrix-dual.ps1 -IntervalSec 90
#>
param(
  [string]$CanonicalCsv = '',
  [string]$ActiveCsv = '',
  [int]$IntervalSec = 90,
  [int]$TotalCells = 1000,
  [switch]$Once
)

$ErrorActionPreference = 'SilentlyContinue'
$repo = Split-Path -Parent $PSScriptRoot
$evidence = Join-Path $repo 'docs\evidence'
if (-not $CanonicalCsv) {
  $CanonicalCsv = Join-Path $evidence 'fulfillment-matrix-prod-20260922_082458.csv'
}
if (-not $ActiveCsv) {
  $ActiveCsv = Join-Path $evidence 'fulfillment-matrix-prod-20260923_040427.csv'
}
$out = Join-Path $evidence 'MATRIX-WATCH-DUAL.md'

function Get-MatrixStats {
  param([string]$Path, [string]$Label)
  if (-not (Test-Path $Path)) {
    return [pscustomobject]@{ Label = $Label; Path = $Path; Missing = $true }
  }
  $rows = @(Import-Csv $Path)
  $groups = $rows | Group-Object deliverableId, industryCategory
  $latest = $groups | ForEach-Object { $_.Group[-1] }
  $pass = ($latest | Where-Object { $_.status -eq 'PASS' }).Count
  $fail = ($latest | Where-Object { $_.status -eq 'FAIL' }).Count
  $skip = ($latest | Where-Object { $_.status -eq 'SKIP' }).Count
  $log = "$Path.run.log"
  $done = $null
  if (Test-Path $log) {
    $done = Get-Content $log | Select-String 'MATRIX DONE:' | Select-Object -Last 1
  }
  $pct = if ($TotalCells -gt 0) { [math]::Round(100 * $latest.Count / $TotalCells, 1) } else { 0 }
  [pscustomobject]@{
    Label     = $Label
    Path      = $Path.Replace($repo + '\', '').Replace($repo + '/', '')
    Missing   = $false
    Unique    = $latest.Count
    RawRows   = $rows.Count
    Pass      = $pass
    Fail      = $fail
    Skip      = $skip
    Pct       = $pct
    DoneLine  = if ($done) { $done.Line.Trim() } else { '' }
    LogTail   = if (Test-Path $log) { (Get-Content $log -Tail 6) -join "`n" } else { '' }
  }
}

function Write-DualStatus {
  $proc = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'e2e-fulfillment-matrix-prod' } | Select-Object -First 1
  $canon = Get-MatrixStats -Path $CanonicalCsv -Label 'Canonical (2026-09-22)'
  $active = Get-MatrixStats -Path $ActiveCsv -Label 'Active run (2026-09-23)'

  $md = @(
    '# Fulfillment matrix — dual watch',
    '',
    "**Updated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "**Process:** $(if ($proc) { "running PID $($proc.ProcessId)" } else { 'not running' })",
    '',
    '| Run | Unique | PASS | FAIL | Raw rows | % |',
    '|-----|--------|------|------|----------|---|'
  )
  foreach ($s in @($canon, $active)) {
    if ($s.Missing) {
      $md += "| $($s.Label) | — | — | — | missing | — |"
    } else {
      $md += "| $($s.Label) | $($s.Unique)/$TotalCells | $($s.Pass) | $($s.Fail) | $($s.RawRows) | $($s.Pct)% |"
    }
  }
  $md += ''
  $md += '**Canonical proof for go-live:** 2026-09-22 CSV (1000 unique PASS). 2026-09-23 = optional re-run.'
  $md += ''
  foreach ($s in @($canon, $active)) {
    if ($s.Missing) { continue }
    $md += "## $($s.Label)"
    $md += ''
    $md += "- CSV: ``$($s.Path)``"
    if ($s.DoneLine) { $md += "- Log: ``$($s.DoneLine)``" }
    $md += ''
    $md += '```'
    $md += $s.LogTail
    $md += '```'
    $md += ''
  }
  Set-Content -Path $out -Value ($md -join "`n") -Encoding UTF8

  Write-Host ("[{0}] canon={1}/{2} active={3}/{4} proc={5}" -f `
    (Get-Date -Format 'HH:mm:ss'), $canon.Unique, $TotalCells, $active.Unique, $TotalCells, $(if ($proc) { 'Y' } else { 'N' }))
}

if ($Once) {
  Write-DualStatus
  exit 0
}

Write-Host "Dual watch -> $out every ${IntervalSec}s" -ForegroundColor Cyan
while ($true) {
  Write-DualStatus
  Start-Sleep -Seconds $IntervalSec
}
