# Generiše produkcijske .env fajlove za VPS deploy (HTTPS + Caddy TLS profil)
#Requires -Version 5.1
param(
  [Parameter(Mandatory)]
  [string]$SiteDomain,
  [string]$ApiDomain = '',
  [ValidateSet('v2', 'v3')]
  [string]$Phase = 'v2',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'
$webRoot = Join-Path $repoRoot 'apps\omnigroup-web'

function Read-EnvValue([string]$Path, [string]$Key) {
  if (-not (Test-Path $Path)) { return $null }
  foreach ($line in Get-Content $Path) {
    if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.*)$") {
      return $Matches[1].Trim()
    }
  }
  return $null
}

if (-not $ApiDomain) {
  if ($SiteDomain -match '^api\.') { $ApiDomain = $SiteDomain }
  else { $ApiDomain = "api.$SiteDomain" }
}

function New-RandomSecret([int]$Length = 40) {
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}

$siteUrl = "https://$SiteDomain"
$apiUrl = "https://$ApiDomain"
$dbPass = New-RandomSecret 32
$jwt = New-RandomSecret 48
$jwtRefresh = New-RandomSecret 48
$sessionSecret = New-RandomSecret 48
$adminPass = New-RandomSecret 20

$composeEnv = @"
DB_NAME=atina_saas_db
DB_USER=atina_user
DB_PASSWORD=$dbPass
ATINA_PORT=3000
WEB_PORT=3010
SITE_DOMAIN=$SiteDomain
API_DOMAIN=$ApiDomain
PHASE=$Phase
AUTONOMY_ENABLED=true
AUTONOMY_AUTO_START_SCHEDULER=true
AUTONOMY_ROLLOUT_SEGMENT=freelance
AUTONOMY_EVOLUTION_CODE_EDIT=false
"@

$atinaEnv = @(
  'NODE_ENV=production',
  'PORT=3000',
  "APP_URL=$apiUrl",
  "WEB_APP_URL=$siteUrl",
  'APP_NAME=ATINA',
  "PHASE=$Phase",
  'DB_HOST=postgres',
  'DB_PORT=5432',
  'DB_NAME=atina_saas_db',
  'DB_USER=atina_user',
  "DB_PASSWORD=$dbPass",
  'DB_SSL=false',
  'REDIS_HOST=redis',
  'REDIS_PORT=6379',
  'REDIS_PASSWORD=',
  'REDIS_DB=0',
  "JWT_SECRET=$jwt",
  "JWT_REFRESH_SECRET=$jwtRefresh",
  'JWT_EXPIRES_IN=7d',
  'JWT_REFRESH_EXPIRES_IN=30d',
  'ADMIN_EMAIL=admin@atina.io',
  "ADMIN_PASSWORD=$adminPass",
  'ADMIN_NAME=System Admin',
  'PAYMENTS_MODE=manual',
  'ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION=true',
  'ENABLE_CRM=true',
  'ENABLE_SCRAPER=true',
  'AUTONOMY_ENABLED=true',
  'AUTONOMY_AUTO_START_SCHEDULER=true',
  'AUTONOMY_REAL_ECOSYSTEM_RUNS=true',
  'AUTONOMY_EVOLUTION_CODE_EDIT=false',
  'AUTONOMY_ROLLOUT_SEGMENT=freelance',
  'AUTONOMY_GIT_REPO_PATH=/opt/omni-group',
  'AUTONOMY_INITIAL_BUDGET_USD=40',
  'AUTONOMY_MAX_SPEND_PER_DAY_USD=4',
  'AUTONOMY_MAX_SPEND_PER_TICK_USD=1.5',
  'AUTONOMY_MIN_RESERVE_USD=10',
  'AUTONOMY_MARKETING_ENABLED=false',
  'OUTREACH_DAILY_CAP=20',
  'OUTREACH_WARMUP_MODE=true',
  'OUTREACH_DOMAIN_WARMUP_COMPLETE=false',
  'OUTREACH_DEV_SEND_TO_FALLBACK=false',
  'LEAD_DATABASE_ENABLED=false',
  'LEAD_DATABASE_ROLLOUT_PHASE=F1',
  'LEAD_ENRICH_ON_HUNT=false',
  'CURSOR_EVOLUTION_ENABLED=false',
  'CURSOR_RUNTIME=cloud',
  'SMTP_ENABLED=false'
)

$copyKeys = @(
  'AI_URL', 'AI_KEY', 'AI_MODEL', 'SCRAPER_URL', 'SCRAPER_KEY', 'COMMS_URL', 'COMMS_KEY',
  'BUSINESS_AND_DEV_URL', 'BUSINESS_AND_DEV_KEY', 'PAYMENT_NOTIFY_EMAIL', 'OUTREACH_FALLBACK_EMAIL',
  'MANUAL_PAYMENT_ACCOUNT_NAME', 'MANUAL_PAYMENT_IBAN', 'MANUAL_PAYMENT_BANK', 'MANUAL_PAYMENT_SWIFT',
  'MANUAL_PAYMENT_CURRENCY', 'MANUAL_PAYMENT_NOTE', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
  'ELEVENLABS_API_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT',
  'SALES_MEETINGS_ENABLED', 'CURSOR_API_KEY', 'CURSOR_MODEL'
)

$localAtinaEnv = Join-Path $atinaRoot '.env'
$localWebEnv = Join-Path $webRoot '.env.local'
foreach ($key in $copyKeys) {
  $val = Read-EnvValue $localAtinaEnv $key
  if (-not $val) { $val = Read-EnvValue $localWebEnv $key }
  if ($val) { $atinaEnv += "$key=$val" }
}

$atinaEnv = $atinaEnv -join "`n"

$resendKey = Read-EnvValue $localWebEnv 'RESEND_API_KEY'
$resendFrom = Read-EnvValue $localWebEnv 'CONTACT_EMAIL_FROM'
$resendTo = Read-EnvValue $localWebEnv 'CONTACT_EMAIL_TO'
if (-not $resendFrom) { $resendFrom = "noreply@$SiteDomain" }
if (-not $resendTo) {
  $resendTo = Read-EnvValue $localAtinaEnv 'PAYMENT_NOTIFY_EMAIL'
  if (-not $resendTo) { $resendTo = "admin@$SiteDomain" }
}

$webEnv = @(
  "NEXT_PUBLIC_ATINA_API_BASE=$apiUrl",
  "NEXT_PUBLIC_SITE_URL=$siteUrl",
  'ATINA_API_BASE=http://atina-api:3000',
  'COOKIE_SECURE=true',
  "SESSION_SECRET=$sessionSecret",
  "RESEND_API_KEY=$resendKey",
  "CONTACT_EMAIL_FROM=$resendFrom",
  "CONTACT_EMAIL_TO=$resendTo"
) -join "`n"

$outCompose = Join-Path $repoRoot '.env.vps.prod'
$outAtina = Join-Path $atinaRoot '.env.vps.prod'
$outWeb = Join-Path $webRoot '.env.vps.production'

Write-Host '=== VPS produkcija — env šabloni ===' -ForegroundColor Cyan
Write-Host "  Site: $siteUrl"
Write-Host "  API:  $apiUrl"
Write-Host "  Phase: $Phase"
Write-Host ''

if ($DryRun) {
  Write-Host '[dry-run] Fajlovi koji bi bili kreirani:' -ForegroundColor Yellow
  Write-Host "  $outCompose"
  Write-Host "  $outAtina"
  Write-Host "  $outWeb"
  exit 0
}

Set-Content -Path $outCompose -Value $composeEnv -Encoding UTF8
Set-Content -Path $outAtina -Value $atinaEnv -Encoding UTF8
Set-Content -Path $outWeb -Value $webEnv -Encoding UTF8

Write-Host 'Kreirano (gitignored — kopiraj na VPS):' -ForegroundColor Green
Write-Host "  .env.vps.prod              -> .env.docker.prod na VPS"
Write-Host "  atina/.env.vps.prod        -> atina/.env.docker.prod"
Write-Host "  web/.env.vps.production    -> web/.env.production"
Write-Host ''
Write-Host "Admin login: admin@atina.io / $adminPass" -ForegroundColor Yellow
Write-Host '(Sačuvaj lozinku — nije u gitu.)'
Write-Host ''
Write-Host 'Deploy na VPS:' -ForegroundColor Cyan
Write-Host '  .\scripts\deploy-to-vps.ps1 -VpsHost <IP> -SiteDomain omnigrouptech.com'
