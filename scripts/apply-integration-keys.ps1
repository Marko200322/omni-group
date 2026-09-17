#Requires -Version 5.1
<#
.SYNOPSIS
  Kopira integracione kljuceve iz KLJUCEVI-POPUNI.local.txt u Atina .env,
  omnigroup-web .env.local i deploy.config.json.

  KLJUCEVI-POPUNI.local.txt je JEDINI izvor za API kljuceve.
  deploy.config.json je JEDINI izvor za VPS/domen/fazu/manual payment.
  Sve ostalo (.env, .env.local, *.vps.*) se generise — ne edituj rucno.

.EXAMPLE
  .\scripts\apply-integration-keys.ps1
  .\scripts\apply-integration-keys.ps1 -DeployConfigOnly
#>
param([switch]$DeployConfigOnly)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'deploy-config-env.ps1')

$keysFile = Join-Path $repoRoot 'atina-platform\atina\KLJUCEVI-POPUNI.local.txt'
$atinaEnv = Join-Path $repoRoot 'atina-platform\atina\.env'
$webEnv = Join-Path $repoRoot 'apps\omnigroup-web\.env.local'
$deployConfig = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'

if (-not (Test-Path $keysFile)) { throw "Nema $keysFile" }

function Read-KeyMap([string]$Path) {
  $map = @{}
  Get-Content $Path | ForEach-Object {
    $t = $_.Trim()
    if (-not $t -or $t.StartsWith('#')) { return }
    if ($t -match '^([A-Z0-9_]+)=(.*)$') { $map[$Matches[1]] = $Matches[2].Trim() }
  }
  return $map
}

function Set-EnvLine([string]$FilePath, [string]$Key, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return }
  if (-not (Test-Path $FilePath)) { return }
  $escaped = [regex]::Escape($Key)
  $lines = Get-Content $FilePath
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$escaped\s*=") { $found = $true; "$Key=$Value" } else { $line }
  }
  if (-not $found) { $out += "$Key=$Value" }
  Set-Content -Path $FilePath -Value $out -Encoding UTF8
}

$keys = Read-KeyMap $keysFile

# Keys that belong to the Next.js app only, never to the Atina backend .env.
$webOnlyKeys = @(
  'SESSION_SECRET',
  'CONTACT_EMAIL_FROM', 'CONTACT_EMAIL_TO',
  'CONTACT_CRM_INGRESS_EMAIL', 'CONTACT_CRM_INGRESS_PASSWORD',
  'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_ATINA_API_BASE'
)

# Keys the web app needs in addition to the web-only ones above.
$webSharedKeys = @('RESEND_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID')

if (-not $DeployConfigOnly) {
  # Every filled key goes to the backend .env; an allowlist here only silently
  # drops keys the owner filled in and makes the admin UI look empty.
  foreach ($k in $keys.Keys) {
    if ($webOnlyKeys -contains $k) { continue }
    if ($keys[$k]) { Set-EnvLine $atinaEnv $k $keys[$k] }
  }
  if ($keys.STRIPE_SECRET_KEY -and -not $keys.FINANCE_KEY) {
    Set-EnvLine $atinaEnv 'FINANCE_KEY' $keys.STRIPE_SECRET_KEY
  }
  if ($keys.OPENROUTER_API_KEY -and -not $keys.AI_KEY) {
    Set-EnvLine $atinaEnv 'AI_KEY' $keys.OPENROUTER_API_KEY
  }
  Write-Host "Atina .env updated from KLJUCEVI-POPUNI.local.txt" -ForegroundColor Green

  foreach ($k in ($webOnlyKeys + $webSharedKeys)) {
    if ($keys.ContainsKey($k) -and $keys[$k]) { Set-EnvLine $webEnv $k $keys[$k] }
  }
  Write-Host 'omnigroup-web .env.local updated from KLJUCEVI-POPUNI.local.txt' -ForegroundColor Green
}

if (Test-Path $deployConfig) {
  $cfg = Get-Content $deployConfig -Raw | ConvertFrom-Json
  $cfg = Merge-KljuceviIntoDeployConfig $cfg $keys
  $cfg | ConvertTo-Json -Depth 6 | Set-Content $deployConfig -Encoding UTF8
  Write-Host 'deploy.config.json updated' -ForegroundColor Green

  if (-not $DeployConfigOnly) {
    # Owner/billing settings live in deploy.config.json only; mirror them into the
    # dev env files so local admin shows the same data as prod.
    if ($cfg.adminEmail) { Set-EnvLine $atinaEnv 'ADMIN_EMAIL' "$($cfg.adminEmail)".Trim() }
    if ($cfg.paymentNotifyEmail) { Set-EnvLine $atinaEnv 'PAYMENT_NOTIFY_EMAIL' "$($cfg.paymentNotifyEmail)".Trim() }
    if ($cfg.companyLegalName) { Set-EnvLine $atinaEnv 'COMPANY_LEGAL_NAME' "$($cfg.companyLegalName)".Trim() }
    if ($cfg.companyTaxId) { Set-EnvLine $atinaEnv 'COMPANY_TAX_ID' "$($cfg.companyTaxId)".Trim() }
    if ($cfg.companyAddress) { Set-EnvLine $atinaEnv 'COMPANY_ADDRESS' "$($cfg.companyAddress)".Trim() }

    if ($cfg.manualPayment) {
      $mp = $cfg.manualPayment
      if ($mp.accountName) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_ACCOUNT_NAME' $mp.accountName }
      if ($mp.iban) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_IBAN' $mp.iban }
      if ($mp.bank) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_BANK' $mp.bank }
      if ($mp.swift) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_SWIFT' $mp.swift }
      if ($mp.currency) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_CURRENCY' $mp.currency }
      if ($mp.note) { Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_NOTE' $mp.note }
    }

    if ($cfg.siteDomain) {
      $siteUrl = "https://$("$($cfg.siteDomain)".Trim())"
      Set-EnvLine $webEnv 'NEXT_PUBLIC_SITE_URL' $siteUrl
    }

    Set-EnvLine $atinaEnv 'CURSOR_AGENT_ENABLED' 'true'
    Set-EnvLine $atinaEnv 'CURSOR_EVOLUTION_ENABLED' 'true'
    Set-EnvLine $atinaEnv 'CURSOR_MODEL' 'composer-2.5'
    Set-EnvLine $atinaEnv 'CURSOR_RUNTIME' 'local'
    Write-Host 'Owner settings (manual payment / company / admin) mirrored to dev env' -ForegroundColor Green
  }
}

Write-Host ''
Write-Host 'Vlasnik edituje SAMO:' -ForegroundColor Cyan
Write-Host '  1) atina-platform\atina\KLJUCEVI-POPUNI.local.txt   (API kljucevi)'
Write-Host '  2) deploy-secrets.local\deploy.config.json          (VPS/domen/faza/racun)'
Write-Host 'Sve ostalo se generise. Detalji: docs\KLJUCEVI-JEDAN-IZVOR.md' -ForegroundColor DarkGray
