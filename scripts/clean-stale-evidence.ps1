#Requires -Version 5.1
<#
  Removes superseded / empty evidence artifacts (keeps latest dated runs).
  Dry-run by default: .\scripts\clean-stale-evidence.ps1 -Apply
#>
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$evidence = Join-Path $repo 'docs\evidence'

$toRemove = @(
  'fulfillment-matrix-prod-20260804_164012.csv',
  'fulfillment-matrix-prod-20260804_164014.csv',
  'fulfillment-matrix-prod-20260804_164020.csv',
  'fulfillment-matrix-prod-20260804_164252.csv',
  'fulfillment-matrix-prod-20260902_131856.csv',
  'fulfillment-matrix-m6-spot.csv',
  'm4-fulfillment-smoke-20260804_232846.csv',
  'm4-full-test-20260804_232651.csv',
  'm4-full-test-batch2-20260804_232824.csv',
  'm4-full-test-batch3.csv',
  'm4-full-test-SCORECARD-20260804_233011.csv',
  'm4-packages-only-20260805_010632.csv',
  'm4-slow-packages-20260805_011904.csv',
  'm4-launch-gate-20260805_010632.md'
)

foreach ($name in $toRemove) {
  $path = Join-Path $evidence $name
  if (-not (Test-Path $path)) { continue }
  $len = (Get-Item $path).Length
  if ($Apply) {
    Remove-Item -LiteralPath $path -Force
    Write-Host "Removed $name ($len bytes)" -ForegroundColor Yellow
  } else {
    Write-Host "Would remove $name ($len bytes)" -ForegroundColor DarkYellow
  }
}

if (-not $Apply) {
  Write-Host 'Dry run — pass -Apply to delete.' -ForegroundColor Cyan
}
