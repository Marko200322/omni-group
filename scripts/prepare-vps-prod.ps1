# Generiše produkcijske .env fajlove za VPS deploy (HTTPS + Caddy TLS profil)
#Requires -Version 5.1
param(
  [Parameter(Mandatory)]
  [string]$SiteDomain,
  [string]$ApiDomain = '',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'
$webRoot = Join-Path $repoRoot 'apps\omnigroup-web'

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
  'PHASE=v2',
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
  'AUTONOMY_ENABLED=true',
  'AUTONOMY_AUTO_START_SCHEDULER=true',
  'AUTONOMY_EVOLUTION_CODE_EDIT=false',
  'AUTONOMY_ROLLOUT_SEGMENT=freelance',
  'SMTP_ENABLED=false',
  '# Popuni agregatore pre go-live:',
  '# AI_URL= AI_KEY= AI_MODEL=',
  '# SCRAPER_URL= SCRAPER_KEY=',
  '# COMMS_URL= COMMS_KEY=',
  '# RESEND_API_KEY= (Atina notifikacije)',
  '# MANUAL_PAYMENT_IBAN= MANUAL_PAYMENT_ACCOUNT_NAME='
) -join "`n"

$webEnv = @(
  "NEXT_PUBLIC_ATINA_API_BASE=$apiUrl",
  "NEXT_PUBLIC_SITE_URL=$siteUrl",
  'ATINA_API_BASE=http://atina-api:3000',
  'COOKIE_SECURE=true',
  "SESSION_SECRET=$sessionSecret",
  '# RESEND_API_KEY=',
  "CONTACT_EMAIL_FROM=noreply@$SiteDomain",
  "CONTACT_EMAIL_TO=admin@$SiteDomain"
) -join "`n"

$outCompose = Join-Path $repoRoot '.env.vps.prod'
$outAtina = Join-Path $atinaRoot '.env.vps.prod'
$outWeb = Join-Path $webRoot '.env.vps.production'

Write-Host '=== VPS produkcija — env šabloni ===' -ForegroundColor Cyan
Write-Host "  Site: $siteUrl"
Write-Host "  API:  $apiUrl"
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
Write-Host '  git clone https://github.com/Marko200322/omni-group.git /opt/omni-group'
Write-Host '  cd /opt/omni-group && cp .env.vps.prod .env.docker.prod'
Write-Host '  cp atina-platform/atina/.env.vps.prod atina-platform/atina/.env.docker.prod'
Write-Host '  cp apps/omnigroup-web/.env.vps.production apps/omnigroup-web/.env.production'
Write-Host '  docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile setup run --rm migrate'
Write-Host '  docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile setup run --rm seed'
Write-Host '  docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d'
Write-Host '  docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile tls up -d caddy'
