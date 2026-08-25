#Requires -Version 5.1
<#
.SYNOPSIS
  Verifies factory phase module env on local VPS prod templates + lists missing owner keys.

.EXAMPLE
  .\scripts\verify-factory-phase.ps1
  .\scripts\verify-factory-phase.ps1 -FactoryPhase M6 -Regenerate
#>
param(
  [ValidateSet('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6')]
  [string]$FactoryPhase = 'M0',
  [int]$MonthlyBudgetEur = 200,
  [switch]$Regenerate
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir

. (Join-Path $scriptsDir 'deploy-config-env.ps1')
. (Join-Path $scriptsDir 'prod-lean-profile.ps1')
. (Join-Path $scriptsDir 'prod-budget-profile.ps1')
. (Join-Path $scriptsDir 'prod-factory-phase.ps1')

Write-Host '=== verify-factory-phase ===' -ForegroundColor Cyan

if ($Regenerate) {
  $prodMode = if ($FactoryPhase -eq 'M6') { 'full' } else { 'lean' }
  & (Join-Path $scriptsDir 'prepare-vps-prod.ps1') `
    -SiteDomain 'omnigrouptech.com' `
    -ApiDomain 'api.omnigrouptech.com' `
    -ProdMode $prodMode `
    -FactoryPhase $FactoryPhase `
    -MonthlyBudgetEur $MonthlyBudgetEur | Out-Host
}

$deployCfg = @{}
$configPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
$cfg = $null
$auto = $false
if (Test-Path $configPath) {
  $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
  $deployCfg = Build-DeployConfigHashtable $cfg
  if ($cfg.factoryPhaseAuto -eq $true -or "$($cfg.factoryPhase)".Trim().ToUpper() -eq 'AUTO') {
    $auto = $true
  }
}

# With AUTO, deploy writes M6 module profile; env file checks use that profile.
$envCheckPhase = if ($auto) { 'M6' } else { $FactoryPhase }
if ($auto) {
  Write-Host '  factoryPhaseAuto=true - env profile expected M6 (runtime effective still gated)' -ForegroundColor DarkGray
}

$result = Test-FactoryPhaseEnvFiles $repoRoot $envCheckPhase $MonthlyBudgetEur $deployCfg $cfg
Write-Host "Phase $($result.phase): env checks pass=$($result.pass) fail=$($result.fail)" -ForegroundColor $(if ($result.fail -eq 0) { 'Green' } else { 'Red' })

if ($result.missingKeys.Count -gt 0) {
  Write-Host 'Missing keys for this phase (add to deploy.config / KLJUCEVI):' -ForegroundColor Yellow
  foreach ($k in $result.missingKeys) { Write-Host "  - $k" }
} else {
  Write-Host 'Required API keys present in env files or deploy.config' -ForegroundColor Green
}

$order = @('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6')
$map = Get-FactoryPhaseAtinaEnvMap $FactoryPhase $MonthlyBudgetEur
$idx = [array]::IndexOf($order, $FactoryPhase)

if ($idx -lt 2 -and $map.ENABLE_SCRAPER -ne 'false') {
  Write-Host 'LOGIC FAIL: M0/M1 must have ENABLE_SCRAPER=false' -ForegroundColor Red
  exit 1
}
if ($idx -ge 2 -and $map.ENABLE_SCRAPER -ne 'true') {
  Write-Host 'LOGIC FAIL: M2+ must have ENABLE_SCRAPER=true' -ForegroundColor Red
  exit 1
}
if ($idx -ge 4 -and $map.LEAD_DATABASE_ENABLED -ne 'true') {
  Write-Host 'LOGIC FAIL: M4+ must have LEAD_DATABASE_ENABLED=true' -ForegroundColor Red
  exit 1
}
if ($idx -ge 5 -and $map.AUTONOMY_ENABLED -ne 'true') {
  Write-Host 'LOGIC FAIL: M5+ must have AUTONOMY_ENABLED=true' -ForegroundColor Red
  exit 1
}
if ($idx -ge 6) {
  if ($map.LEAD_DATABASE_ROLLOUT_PHASE -ne 'F5') {
    Write-Host 'LOGIC FAIL: M6 must have LEAD_DATABASE_ROLLOUT_PHASE=F5' -ForegroundColor Red
    exit 1
  }
  if ($map.SUPPORT_AVATAR_ENABLED -ne 'true' -or $map.SALES_AVATAR_ENABLED -ne 'true') {
    Write-Host 'LOGIC FAIL: M6 must enable avatar modules' -ForegroundColor Red
    exit 1
  }
  $webMap = Get-FactoryPhaseWebEnvMap $FactoryPhase $MonthlyBudgetEur 'lean'
  if ($webMap.NEXT_PUBLIC_PROD_MODE -ne 'full') {
    Write-Host 'LOGIC FAIL: M6 web must be NEXT_PUBLIC_PROD_MODE=full' -ForegroundColor Red
    exit 1
  }
  if ($deployCfg.stripeSecretKey) {
    Write-Host 'M6 Stripe keys in deploy.config - PAYMENTS_MODE=live on deploy' -ForegroundColor DarkGray
  } else {
    Write-Host 'M6 note: add stripe* + price IDs to deploy.config for live checkout' -ForegroundColor Yellow
  }
  if (-not $deployCfg.heygenApiKey -and -not $deployCfg.didApiKey) {
    Write-Host 'M6 optional: HEYGEN_API_KEY or DID_API_KEY for premium avatar' -ForegroundColor Yellow
  }
}

Write-Host 'Phase logic checks OK' -ForegroundColor Green
if ($result.fail -gt 0) { exit 1 }
exit 0
