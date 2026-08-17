#Requires -Version 5.1
<#
.SYNOPSIS
  VPS deploy koristeći deploy-secrets.local/deploy.config.json (gitignored).

.EXAMPLE
  .\scripts\deploy-from-local-secrets.ps1 -Bootstrap
  .\scripts\deploy-from-local-secrets.ps1
  .\scripts\deploy-from-local-secrets.ps1 -DryRun
#>
param(
  [switch]$Bootstrap,
  [switch]$SkipBuild,
  [switch]$FreshWipe,
  [switch]$RotateSecrets,
  [switch]$DryRun,
  [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$secretsDir = Join-Path $repoRoot 'deploy-secrets.local'

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $secretsDir 'deploy.config.json'
}

if (-not (Test-Path $ConfigPath)) {
  Write-Host "Nema $ConfigPath" -ForegroundColor Red
  Write-Host "Kopiraj deploy-secrets.local\deploy.config.template.json -> deploy.config.json i popuni." -ForegroundColor Yellow
  exit 1
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

function Require([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "deploy.config.json: obavezno polje '$Name' je prazno"
  }
}

Require 'vpsHost' $config.vpsHost
Require 'vpsUser' $config.vpsUser
Require 'siteDomain' $config.siteDomain

$siteDomain = $config.siteDomain.Trim()
$apiDomain = if ($config.apiDomain -and $config.apiDomain.Trim()) {
  $config.apiDomain.Trim()
} elseif ($siteDomain -match '^api\.') {
  $siteDomain
} else {
  "api.$siteDomain"
}

$phase = if ($config.phase) { $config.phase } else { 'v6' }
$prodMode = if ($config.prodMode -and $config.prodMode.Trim()) { $config.prodMode.Trim().ToLower() } else { 'lean' }
$sshKey = if ($config.sshKeyPath) { $config.sshKeyPath.Trim() } else { '' }
$sshPassword = if ($config.sshPassword) { $config.sshPassword } else { '' }
$remotePath = if ($config.remotePath) { $config.remotePath.Trim() } else { '/opt/omni-group' }

. (Join-Path $scriptsDir 'vps-remote.ps1')
. (Join-Path $scriptsDir 'prod-lean-profile.ps1')
. (Join-Path $scriptsDir 'prod-budget-profile.ps1')
. (Join-Path $scriptsDir 'prod-factory-phase.ps1')
. (Join-Path $scriptsDir 'deploy-config-env.ps1')
. (Join-Path $scriptsDir 'warm-lean-profile.ps1')

$monthlyBudgetEur = Resolve-MonthlyBudgetEur $config.monthlyBudgetEur
$factoryPhaseRaw = if ($config.factoryPhase) { $config.factoryPhase } else { 'M0' }
$factoryAuto = $false
if ($config.factoryPhaseAuto -eq $true) { $factoryAuto = $true }
if ("$($config.factoryPhase)".Trim().ToUpper() -eq 'AUTO') { $factoryAuto = $true; $factoryPhaseRaw = 'M6' }
$factoryPhase = Resolve-FactoryPhase $factoryPhaseRaw
if ($factoryPhase -eq 'AUTO') { $factoryPhase = 'M6'; $factoryAuto = $true }
if (($factoryPhase -eq 'M6' -or $factoryAuto) -and $prodMode -eq 'lean') {
  Write-Host 'M6/AUTO factory: auto-switch prodMode lean -> full (Stripe + premium modules when keys present)' -ForegroundColor Yellow
  $prodMode = 'full'
}

function Set-EnvLine([string]$FilePath, [string]$Key, [string]$Value) {
  if (-not (Test-Path $FilePath)) { return }
  if ([string]::IsNullOrWhiteSpace($Value)) { return }
  $escaped = $Key -replace '([\[\].^$|?*+(){}\\])', '\$1'
  $lines = Get-Content $FilePath
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$escaped\s*=") {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) { $out += "$Key=$Value" }
  Set-Content -Path $FilePath -Value $out -Encoding UTF8
}

function Patch-ProdEnvFiles {
  $rootEnv = Join-Path $repoRoot '.env.vps.prod'
  $atinaEnv = Join-Path $repoRoot 'atina-platform\atina\.env.vps.prod'
  $webEnv = Join-Path $repoRoot 'apps\omnigroup-web\.env.vps.production'

  if ($config.adminEmail) {
    Set-EnvLine $atinaEnv 'ADMIN_EMAIL' $config.adminEmail.Trim()
  }
  if ($config.paymentNotifyEmail) {
    Set-EnvLine $atinaEnv 'PAYMENT_NOTIFY_EMAIL' $config.paymentNotifyEmail.Trim()
  }

  foreach ($entry in (Get-DeployConfigAtinaEnvPatches $config $apiDomain).GetEnumerator()) {
    Set-EnvLine $atinaEnv $entry.Key $entry.Value
  }

  if ($config.manualPayment) {
    $mp = $config.manualPayment
    if ($mp.accountName) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_ACCOUNT_NAME' $mp.accountName }
    if ($mp.iban) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_IBAN' $mp.iban }
    if ($mp.bank) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_BANK' $mp.bank }
    if ($mp.swift) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_SWIFT' $mp.swift }
    if ($mp.currency) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_CURRENCY' $mp.currency }
    if ($mp.note) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_NOTE' $mp.note }
  }

  if ($config.stripeSecretKey) {
    Set-EnvLine $atinaEnv 'STRIPE_SECRET_KEY' $config.stripeSecretKey.Trim()
    Set-EnvLine $atinaEnv 'PAYMENTS_MODE' 'live'
    Set-EnvLine $atinaEnv 'PAYMENTS_MANUAL_ENABLED' 'false'
    if ($config.stripePublishableKey) { Set-EnvLine $atinaEnv 'STRIPE_PUBLISHABLE_KEY' $config.stripePublishableKey.Trim() }
    if ($config.stripeWebhookSecret) { Set-EnvLine $atinaEnv 'STRIPE_WEBHOOK_SECRET' $config.stripeWebhookSecret.Trim() }
    if ($config.starterPriceId) { Set-EnvLine $atinaEnv 'STARTER_PRICE_ID' $config.starterPriceId.Trim() }
    if ($config.proPriceId) { Set-EnvLine $atinaEnv 'PRO_PRICE_ID' $config.proPriceId.Trim() }
    if ($config.enterprisePriceId) { Set-EnvLine $atinaEnv 'ENTERPRISE_PRICE_ID' $config.enterprisePriceId.Trim() }
  }

  if ($config.smtp -and $config.smtp.enabled -eq $true) {
    Set-EnvLine $atinaEnv 'SMTP_ENABLED' 'true'
    if ($config.smtp.host) { Set-EnvLine $atinaEnv 'SMTP_HOST' $config.smtp.host }
    if ($config.smtp.port) { Set-EnvLine $atinaEnv 'SMTP_PORT' "$($config.smtp.port)" }
    if ($null -ne $config.smtp.secure) { Set-EnvLine $atinaEnv 'SMTP_SECURE' ($(if ($config.smtp.secure) { 'true' } else { 'false' })) }
    if ($config.smtp.user) { Set-EnvLine $atinaEnv 'SMTP_USER' $config.smtp.user }
    if ($config.smtp.password) { Set-EnvLine $atinaEnv 'SMTP_PASS' $config.smtp.password }
    if ($config.smtp.from) { Set-EnvLine $atinaEnv 'EMAIL_FROM' $config.smtp.from }
  }

  if ($config.resend) {
    if ($config.resend.apiKey) {
      Set-EnvLine $atinaEnv 'RESEND_API_KEY' $config.resend.apiKey.Trim()
    }
    if ($config.resend.contactFrom) {
      Set-EnvLine $atinaEnv 'CONTACT_EMAIL_FROM' $config.resend.contactFrom.Trim()
    }
    if ($config.resend.contactTo) {
      Set-EnvLine $atinaEnv 'CONTACT_EMAIL_TO' $config.resend.contactTo.Trim()
    }
  }

  if ($config.instantly) {
    if ($config.instantly.apiKey) {
      Set-EnvLine $atinaEnv 'INSTANTLY_API_KEY' $config.instantly.apiKey.Trim()
    }
    if ($config.instantly.campaignId) {
      Set-EnvLine $atinaEnv 'INSTANTLY_CAMPAIGN_ID' $config.instantly.campaignId.Trim()
    }
    if ($config.instantly.apiKey) {
      Set-EnvLine $atinaEnv 'OUTREACH_EMAIL_PROVIDER' 'instantly'
    }
  }

  foreach ($entry in (Get-DeployConfigWebEnvPatches $config $siteDomain).GetEnumerator()) {
    Set-EnvLine $webEnv $entry.Key $entry.Value
  }

  Set-EnvLine $atinaEnv 'PHASE' $phase
  Set-EnvLine $rootEnv 'PHASE' $phase
}

Write-Host '=== deploy-from-local-secrets ===' -ForegroundColor Cyan
Write-Host "  Config: $ConfigPath"
Write-Host "  Host:   $($config.vpsUser)@$($config.vpsHost)"
Write-Host "  Site:   https://$siteDomain"
Write-Host "  API:    https://$apiDomain"
Write-Host "  Mode:   $prodMode$(if (Test-IsLeanProdMode $prodMode) { ' (minimal spend)' } else { '' })"
Write-FactoryPhaseSummary $factoryPhase $monthlyBudgetEur
Write-BudgetPlanSummary $monthlyBudgetEur
if ($FreshWipe) { Write-Host '  Wipe:   FRESH WIPE (brise postojeci stack pre upload-a)' -ForegroundColor Yellow }
Write-Host ''

if ($Bootstrap) {
  Write-Host '== VPS bootstrap (Docker + ufw) ==' -ForegroundColor Cyan
  $bootstrapScript = Join-Path $scriptsDir 'vps-bootstrap.sh'
  if (-not (Test-Path $bootstrapScript)) { throw 'vps-bootstrap.sh missing' }
  $bootstrapContent = Get-Content $bootstrapScript -Raw
  $bootSession = $null
  try {
    $bootSession = Invoke-VpsRemoteBashScript -VpsHost $config.vpsHost.Trim() `
      -VpsUser $config.vpsUser.Trim() -SshKey $sshKey -SshPassword $sshPassword `
      -ScriptContent $bootstrapContent -DryRun:$DryRun -Session $bootSession
  } finally {
    Close-VpsSession -Session $bootSession
  }
  Write-Host 'Bootstrap OK' -ForegroundColor Green
}

Write-Host '== prepare-vps-prod ==' -ForegroundColor Cyan
$prepArgs = @{
  SiteDomain        = $siteDomain
  ApiDomain         = $apiDomain
  Phase             = $phase
  ProdMode          = $prodMode
  FactoryPhase      = $factoryPhase
  MonthlyBudgetEur  = $monthlyBudgetEur
}
if ($DryRun) { $prepArgs.DryRun = $true }
if ($FreshWipe -or $RotateSecrets) { $prepArgs.RotateSecrets = $true }
& (Join-Path $scriptsDir 'prepare-vps-prod.ps1') @prepArgs
if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $DryRun) {
  Patch-ProdEnvFiles
  if (Test-IsLeanProdMode $prodMode) {
    Apply-LeanProdEnvFiles $repoRoot
    Write-Host 'Lean prod env applied (base safety flags)' -ForegroundColor DarkGray
  }
  Apply-BudgetProdEnvFiles $repoRoot $monthlyBudgetEur
  Write-Host "Budget profile EUR $monthlyBudgetEur/mo applied (AI caps + retries)" -ForegroundColor DarkGray
  $deployCfg = Build-DeployConfigHashtable $config
  Apply-FactoryPhaseEnvFiles $repoRoot $factoryPhase $monthlyBudgetEur $prodMode $deployCfg
  Write-Host "Factory phase $factoryPhase module profile applied" -ForegroundColor Green
  if (Test-IsLeanProdMode $prodMode) {
    Apply-WarmLeanInboundEnvFiles $repoRoot $monthlyBudgetEur
    Write-Host 'Warm lean inbound env applied' -ForegroundColor DarkGray
  }
  Sync-RootDockerNextPublicFromWeb $repoRoot
  Write-Host 'Prod env patched from deploy.config.json' -ForegroundColor DarkGray
}

$deployArgs = @{
  VpsHost     = $config.vpsHost.Trim()
  SiteDomain  = $siteDomain
  VpsUser     = $config.vpsUser.Trim()
  ApiDomain   = $apiDomain
  RemotePath  = $remotePath
  SkipPrepare = $true
}
if ($sshKey) { $deployArgs.SshKey = $sshKey }
if ($sshPassword) { $deployArgs.SshPassword = $sshPassword }
if ($SkipBuild) { $deployArgs.SkipBuild = $true }
if ($FreshWipe) { $deployArgs.FreshWipe = $true }
if ($DryRun) { $deployArgs.DryRun = $true }

& (Join-Path $scriptsDir 'deploy-to-vps.ps1') @deployArgs
if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($config.runPhaseBootAfterDeploy -eq $true -and -not $DryRun) {
  Write-Host '== phase-boot-deploy (remote) ==' -ForegroundColor Cyan
  Write-Host 'Napomena: pokreni lokalno posle DNS propagacije:' -ForegroundColor Yellow
  Write-Host "  `$env:ATINA_API_BASE='https://$apiDomain'; .\scripts\phase-boot-deploy.ps1" -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Deploy pipeline zavrsen.' -ForegroundColor Green
Write-Host "  Web:   https://$siteDomain"
Write-Host "  Admin: https://$siteDomain/admin"
Write-Host "  Login: https://$siteDomain/login"
