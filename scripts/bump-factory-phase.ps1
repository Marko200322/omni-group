#Requires -Version 5.1
<#
.SYNOPSIS
  Bump factoryPhase in deploy.config.json with key gap report (M0-M6).

.EXAMPLE
  .\scripts\bump-factory-phase.ps1 -TargetPhase M1
  .\scripts\bump-factory-phase.ps1 -TargetPhase M6 -DryRun
  .\scripts\bump-factory-phase.ps1 -TargetPhase M6 -Apply
#>
param(
  [ValidateSet('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6')]
  [string]$TargetPhase,
  [switch]$Apply,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$configPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'

. (Join-Path $scriptsDir 'prod-factory-phase.ps1')
. (Join-Path $scriptsDir 'deploy-config-env.ps1')

if (-not (Test-Path $configPath)) { throw "Nema $configPath" }

$cfg = Get-Content $configPath -Raw | ConvertFrom-Json
$current = Resolve-FactoryPhase $(if ($cfg.factoryPhase) { $cfg.factoryPhase } else { 'M0' })
$target = Resolve-FactoryPhase $TargetPhase
$budget = if ($cfg.monthlyBudgetEur) { [int]$cfg.monthlyBudgetEur } else { 200 }

Write-Host "=== bump-factory-phase ===" -ForegroundColor Cyan
Write-Host "  Current: $current -> Target: $target ($((Get-FactoryPhaseLabel $target)))"

$deployCfg = Build-DeployConfigHashtable $cfg
$missing = @()
foreach ($key in (Get-FactoryPhaseRequiredKeys $target)) {
  $lookup = Build-DeployConfigKeyLookup $cfg
  $val = if ($lookup.ContainsKey($key)) { $lookup[$key] } else { '' }
  if ([string]::IsNullOrWhiteSpace($val)) { $missing += $key }
}

if ($missing.Count -gt 0) {
  Write-Host 'Missing keys for target phase (popuni pre deploy-a):' -ForegroundColor Yellow
  foreach ($k in $missing) { Write-Host "  - $k" }
} else {
  Write-Host 'All required keys present in deploy.config' -ForegroundColor Green
}

if ($target -eq 'M6') {
  Write-Host 'M6 deploy will: prodMode=full, PAYMENTS_MODE=live (if Stripe set), lead F5, avatar ON' -ForegroundColor DarkGray
}

if (-not $Apply) {
  Write-Host ''
  Write-Host 'Dry run. Add -Apply to write factoryPhase to deploy.config.json' -ForegroundColor Yellow
  Write-Host "  .\scripts\bump-factory-phase.ps1 -TargetPhase $target -Apply"
  exit 0
}

if ($DryRun) {
  Write-Host '[dry-run] Would set factoryPhase=$target' -ForegroundColor Yellow
  exit 0
}

$cfg | Add-Member -NotePropertyName factoryPhase -NotePropertyValue $target -Force
if ($target -eq 'M6') {
  $cfg | Add-Member -NotePropertyName prodMode -NotePropertyValue 'full' -Force
}
$cfg | ConvertTo-Json -Depth 6 | Set-Content $configPath -Encoding UTF8
Write-Host "Updated deploy.config.json: factoryPhase=$target" -ForegroundColor Green

& (Join-Path $scriptsDir 'sync-kljucevi-from-deploy.ps1')
& (Join-Path $scriptsDir 'verify-factory-phase.ps1') -FactoryPhase $target -MonthlyBudgetEur $budget -Regenerate

Write-Host ''
Write-Host 'Next: .\scripts\deploy-from-local-secrets.ps1' -ForegroundColor Cyan
