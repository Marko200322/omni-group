# Export 907 verticals CSV with dynamic pricing (Atina engine).
param(
  [string]$OutDir = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent (Split-Path -Parent $root)

if (-not $OutDir) {
  $OutDir = Join-Path $repoRoot 'data\exports'
}

Push-Location $root
try {
  $args = @('scripts/export-verticals-market-csv.ts', '--out-dir', $OutDir)
  npx tsx @args
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "CSV files in: $OutDir"
} finally {
  Pop-Location
}
