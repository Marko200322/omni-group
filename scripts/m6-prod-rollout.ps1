#Requires -Version 5.1
<#
  Bump prod to hard M6 ceiling + full module profile, deploy, verify.
.EXAMPLE
  .\scripts\m6-prod-rollout.ps1 -SkipDeploy
  .\scripts\m6-prod-rollout.ps1 -RunFinishRepoOnProdPath
#>
param(
  [switch]$SkipDeploy,
  [switch]$RunFinishRepoOnProdPath,
  [switch]$SkipPackagesMatrix
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$configPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
if (-not (Test-Path $configPath)) { throw "Missing $configPath" }

$cfg = Get-Content $configPath -Raw | ConvertFrom-Json
$cfg.factoryPhase = 'M6'
$cfg.prodMode = 'full'
if (-not $cfg.monthlyBudgetEur -or [int]$cfg.monthlyBudgetEur -lt 200) {
  $cfg.monthlyBudgetEur = 250
}
$cfg | ConvertTo-Json -Depth 20 | Set-Content -Path $configPath -Encoding UTF8
Write-Host 'deploy.config.json -> factoryPhase=M6 prodMode=full' -ForegroundColor Cyan

$budget = [int]$cfg.monthlyBudgetEur
& (Join-Path $scriptsDir 'prepare-vps-prod.ps1') `
  -SiteDomain 'omnigrouptech.com' `
  -ApiDomain 'api.omnigrouptech.com' `
  -ProdMode full `
  -FactoryPhase M6 `
  -MonthlyBudgetEur $budget

& (Join-Path $scriptsDir 'verify-factory-phase.ps1') -FactoryPhase M6 -MonthlyBudgetEur $budget
if ($LASTEXITCODE -ne 0) { throw 'verify-factory-phase M6 failed' }

if (-not $SkipDeploy) {
  & (Join-Path $scriptsDir 'deploy-from-local-secrets.ps1') -SafeDeploy
  if ($LASTEXITCODE -ne 0) { throw 'SafeDeploy failed' }
}

& (Join-Path $scriptsDir 'verify-industry-package-matrix-prod.ps1')
if ($LASTEXITCODE -ne 0) { throw '50x20 matrix verify failed' }

$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
$loginJson = (@{ email = $email; password = $pass } | ConvertTo-Json -Compress)
$login = Invoke-RestMethod -Method POST -Uri 'https://api.omnigrouptech.com/api/v1/auth/login' -ContentType 'application/json' -Body $loginJson
$hdr = @{ Authorization = "Bearer $($login.data.accessToken)" }
$fp = (Invoke-RestMethod -Uri 'https://api.omnigrouptech.com/api/v1/billing/factory-phase/status' -Headers $hdr).data
Write-Host "Prod factory-phase: configured=$($fp.phase) effective=$($fp.effective) ready=$($fp.ready)" -ForegroundColor $(if ($fp.phase -eq 'M6') { 'Green' } else { 'Yellow' })
if ($fp.phase -ne 'M6') { throw "Expected FACTORY_PHASE M6 on prod, got $($fp.phase)" }

if (-not $SkipPackagesMatrix) {
  $gateArgs = @('-File', (Join-Path $scriptsDir 'm4-launch-gate.ps1'), '-FullPackagesMatrix', '-SkipSlowPackages')
  & powershell @gateArgs
  if ($LASTEXITCODE -ne 0) { Write-Warning 'Launch gate reported failures — review docs/evidence/m4-launch-gate-*.md' }
}

if ($RunFinishRepoOnProdPath) {
  & (Join-Path $scriptsDir 'run-vps-finish-repo.ps1') -UseProdDeployPath
}

Write-Host 'M6 rollout complete.' -ForegroundColor Green
