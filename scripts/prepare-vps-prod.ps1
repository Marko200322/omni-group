# Generiše produkcijske .env fajlove za VPS deploy (HTTPS + Caddy TLS profil)
#Requires -Version 5.1
param(
  [Parameter(Mandatory)]
  [string]$SiteDomain,
  [string]$ApiDomain = '',
  [ValidateSet('v2', 'v3', 'v4', 'v5', 'v6')]
  [string]$Phase = 'v6',
  [ValidateSet('lean', 'full')]
  [string]$ProdMode = 'lean',
  [ValidateSet('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6')]
  [string]$FactoryPhase = 'M0',
  [int]$MonthlyBudgetEur = 0,
  [switch]$DryRun,
  [switch]$RotateSecrets
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'prod-lean-profile.ps1')
. (Join-Path $PSScriptRoot 'prod-budget-profile.ps1')
. (Join-Path $PSScriptRoot 'prod-factory-phase.ps1')
$isLeanProd = Test-IsLeanProdMode $ProdMode
if ($MonthlyBudgetEur -le 0) { $MonthlyBudgetEur = Get-DefaultMonthlyBudgetEur }
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

function Test-PublicDnsA([string]$HostName) {
  if ([string]::IsNullOrWhiteSpace($HostName)) { return $false }
  try {
    $records = @(Resolve-DnsName -Name $HostName -Type A -ErrorAction Stop)
    return ($records | Where-Object { $_.Type -eq 'A' -and $_.IPAddress }).Count -gt 0
  } catch {
    return $false
  }
}

$siteUrl = "https://$SiteDomain"
$apiUrl = "https://$ApiDomain"

if (-not (Test-PublicDnsA $ApiDomain)) {
  Write-Host "  API DNS '$ApiDomain' nije spreman - API preko https://$SiteDomain/api/v1" -ForegroundColor Yellow
  $ApiDomain = $SiteDomain
  $apiUrl = $siteUrl
}

function New-RandomSecret([int]$Length = 40) {
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}

$outCompose = Join-Path $repoRoot '.env.vps.prod'
$outAtina = Join-Path $atinaRoot '.env.vps.prod'
$outWeb = Join-Path $webRoot '.env.vps.production'

function Resolve-Secret([string]$Key, [int]$Length, [string[]]$Sources) {
  if (-not $RotateSecrets) {
    foreach ($src in $Sources) {
      $existing = Read-EnvValue $src $Key
      if ($existing) { return $existing }
    }
  }
  return New-RandomSecret $Length
}

$dbPass = Resolve-Secret 'DB_PASSWORD' 32 @($outCompose, $outAtina)
$jwt = Resolve-Secret 'JWT_SECRET' 48 @($outAtina)
$jwtRefresh = Resolve-Secret 'JWT_REFRESH_SECRET' 48 @($outAtina)
$sessionSecret = Resolve-Secret 'SESSION_SECRET' 48 @($outWeb)
$adminPass = Resolve-Secret 'ADMIN_PASSWORD' 20 @($outAtina)

$composeAutonomy = if ($isLeanProd) {
  (Get-ProdLeanComposeEnvLines) -join "`n"
} else {
@'
AUTONOMY_ENABLED=true
AUTONOMY_AUTO_START_SCHEDULER=true
AUTONOMY_ROLLOUT_SEGMENT=freelance
AUTONOMY_EVOLUTION_CODE_EDIT=false
'@
}

$composeEnv = @"
DB_NAME=atina_saas_db
DB_USER=atina_user
DB_PASSWORD=$dbPass
ATINA_PORT=3000
WEB_PORT=3010
SITE_DOMAIN=$SiteDomain
API_DOMAIN=$ApiDomain
PHASE=$Phase
$composeAutonomy
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
  'AUTONOMY_GIT_REPO_PATH=/opt/omni-group',
  'CURSOR_RUNTIME=cloud',
  'FORGE_VAULT_PATH=/var/omni/forge/vault.db',
  'AUTH_RATE_LIMIT_MAX=40',
  'AUTH_RATE_LIMIT_WINDOW_MS=600000',
  'AUTH_SESSION_RATE_LIMIT_MAX=400',
  'AUTH_SESSION_RATE_LIMIT_WINDOW_MS=60000'
)

if ($isLeanProd) {
  $atinaEnv += Get-ProdLeanAtinaEnvLines
} else {
  $atinaEnv += @(
    'ENABLE_SCRAPER=true',
    'ENABLE_AUTOMATION=true',
    'AUTONOMY_ENABLED=true',
    'AUTONOMY_AUTO_START_SCHEDULER=true',
    'AUTONOMY_REAL_ECOSYSTEM_RUNS=true',
    'AUTONOMY_EVOLUTION_CODE_EDIT=false',
    'AUTONOMY_ROLLOUT_SEGMENT=freelance',
    'AUTONOMY_CATEGORY_ROLLOUT_ENABLED=true',
    'RETAINER_SCHEDULER_ENABLED=true',
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
    'PRODUCT_FACTORY_ENABLED=true',
    'PRODUCT_FACTORY_INTERNAL_LANE=true',
    'SMTP_ENABLED=false',
    'SALES_MEETINGS_ENABLED=true',
    'SUPPORT_AVATAR_ENABLED=true',
    'SALES_AVATAR_ENABLED=true'
  )
}

$copyKeys = @(
  'AI_URL', 'AI_KEY', 'AI_MODEL', 'SCRAPER_URL', 'SCRAPER_KEY', 'COMMS_URL', 'COMMS_KEY',
  'BUSINESS_AND_DEV_URL', 'BUSINESS_AND_DEV_KEY', 'PAYMENT_NOTIFY_EMAIL', 'OUTREACH_FALLBACK_EMAIL',
  'MANUAL_PAYMENT_ACCOUNT_NAME', 'MANUAL_PAYMENT_IBAN', 'MANUAL_PAYMENT_BANK', 'MANUAL_PAYMENT_SWIFT',
  'MANUAL_PAYMENT_CURRENCY', 'MANUAL_PAYMENT_NOTE', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
  'ELEVENLABS_API_KEY', 'HEYGEN_API_KEY', 'DID_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PUBLISHABLE_KEY', 'SLACK_WEBHOOK_URL', 'HUNTER_API_KEY', 'NEVERBOUNCE_API_KEY', 'ZEROBOUNCE_API_KEY',
  'STARTER_PRICE_ID', 'PRO_PRICE_ID', 'ENTERPRISE_PRICE_ID',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT',
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
$crmIngressEmail = Read-EnvValue $localWebEnv 'CONTACT_CRM_INGRESS_EMAIL'
$crmIngressPassword = Read-EnvValue $localWebEnv 'CONTACT_CRM_INGRESS_PASSWORD'
$contactSlack = Read-EnvValue $localWebEnv 'CONTACT_SLACK_WEBHOOK_URL'
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
  'UPLOAD_STORAGE=local',
  'UPLOAD_DIR=/var/omni/uploads',
  "SESSION_SECRET=$sessionSecret",
  "RESEND_API_KEY=$resendKey",
  "CONTACT_EMAIL_FROM=$resendFrom",
  "CONTACT_EMAIL_TO=$resendTo",
  'BFF_AUTH_RATE_LIMIT_MAX=120'
)
if ($isLeanProd) {
  $webEnv += Get-BudgetWebEnvLines $MonthlyBudgetEur
} else {
  $webEnv += 'NEXT_PUBLIC_PROD_MODE=full'
  $webEnv += "NEXT_PUBLIC_MONTHLY_BUDGET_EUR=$MonthlyBudgetEur"
}
if ($crmIngressEmail) { $webEnv += "CONTACT_CRM_INGRESS_EMAIL=$crmIngressEmail" }
if ($crmIngressPassword) { $webEnv += "CONTACT_CRM_INGRESS_PASSWORD=$crmIngressPassword" }
if ($contactSlack) { $webEnv += "CONTACT_SLACK_WEBHOOK_URL=$contactSlack" }
$tgToken = Read-EnvValue $localAtinaEnv 'TELEGRAM_BOT_TOKEN'
$tgChat = Read-EnvValue $localAtinaEnv 'TELEGRAM_CHAT_ID'
if ($tgToken) { $webEnv += "TELEGRAM_BOT_TOKEN=$tgToken" }
if ($tgChat) { $webEnv += "TELEGRAM_CHAT_ID=$tgChat" }
$webEnv += 'ADMIN_TELEGRAM_NOTIFY=true'
$webEnv = $webEnv -join "`n"

Write-Host '=== VPS produkcija - env sabloni ===' -ForegroundColor Cyan
if ($RotateSecrets) {
  Write-Host '  Secrets: ROTATE (nova lozinka za DB/admin/JWT)' -ForegroundColor Yellow
} else {
  Write-Host '  Secrets: reuse postojecih (incremental deploy safe)' -ForegroundColor DarkGray
}
Write-Host "  Site: $siteUrl"
Write-Host "  API:  $apiUrl"
Write-Host "  Phase: $Phase"
Write-Host "  Prod mode: $ProdMode$(if ($isLeanProd) { ' (lean - minimal API spend)' } else { ' (full ops)' })"
Write-FactoryPhaseSummary $FactoryPhase $MonthlyBudgetEur
Write-BudgetPlanSummary $MonthlyBudgetEur
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

if ($isLeanProd) { Apply-LeanProdEnvFiles $repoRoot }
Apply-BudgetProdEnvFiles $repoRoot $MonthlyBudgetEur
Apply-FactoryPhaseEnvFiles $repoRoot $FactoryPhase $MonthlyBudgetEur $ProdMode @{}

Write-Host 'Kreirano (gitignored - kopiraj na VPS):' -ForegroundColor Green
Write-Host "  .env.vps.prod              -> .env.docker.prod na VPS"
Write-Host "  atina/.env.vps.prod        -> atina/.env.docker.prod"
Write-Host "  web/.env.vps.production    -> web/.env.production"
Write-Host ''
Write-Host "Admin login: admin@atina.io / $adminPass" -ForegroundColor Yellow
Write-Host '(Sacuvaj lozinku - nije u gitu.)'
Write-Host ''
Write-Host 'Deploy na VPS:' -ForegroundColor Cyan
Write-Host '  .\scripts\deploy-to-vps.ps1 -VpsHost YOUR_IP -SiteDomain omnigrouptech.com'
