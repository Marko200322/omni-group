# Generiše .env fajlove za lokalni docker-compose.prod test
#Requires -Version 5.1
param(
  [int]$AtinaPort = 3002,
  [int]$WebPort = 3012
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'
$webRoot = Join-Path $repoRoot 'apps\omnigroup-web'

function New-RandomSecret([int]$Length = 40) {
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}

function Read-EnvValue([string]$Path, [string]$Key) {
  if (-not (Test-Path $Path)) { return $null }
  foreach ($line in Get-Content $Path) {
    if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.*)$") {
      return $Matches[1].Trim()
    }
  }
  return $null
}

$localAtinaEnv = Join-Path $atinaRoot '.env'
$localWebEnv = Join-Path $webRoot '.env.local'
$dbPass = New-RandomSecret 24
$jwt = New-RandomSecret 48
$jwtRefresh = New-RandomSecret 48
$sessionSecret = New-RandomSecret 48
$adminPass = New-RandomSecret 16

$composeEnv = @"
DB_NAME=atina_saas_db
DB_USER=atina_user
DB_PASSWORD=$dbPass
ATINA_PORT=$AtinaPort
WEB_PORT=$WebPort
AUTONOMY_ENABLED=false
AUTONOMY_AUTO_START_SCHEDULER=false
"@
Set-Content -Path (Join-Path $repoRoot '.env.docker.prod') -Value $composeEnv -Encoding UTF8

$copyKeys = @(
  'AI_URL','AI_KEY','AI_MODEL','SCRAPER_URL','SCRAPER_KEY','COMMS_URL','COMMS_KEY',
  'BUSINESS_AND_DEV_URL','BUSINESS_AND_DEV_KEY','PAYMENT_NOTIFY_EMAIL',
  'MANUAL_PAYMENT_ACCOUNT_NAME','MANUAL_PAYMENT_IBAN','MANUAL_PAYMENT_BANK','MANUAL_PAYMENT_SWIFT',
  'MANUAL_PAYMENT_CURRENCY','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT',
  'RESEND_API_KEY','CONTACT_EMAIL_FROM','CONTACT_EMAIL_TO'
)

$atinaLines = @(
  'NODE_ENV=production',
  'PORT=3000',
  "APP_URL=http://127.0.0.1:$AtinaPort",
  "WEB_APP_URL=http://127.0.0.1:$WebPort",
  'APP_NAME=ATINA',
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
  'AUTONOMY_ENABLED=false',
  'AUTONOMY_AUTO_START_SCHEDULER=false',
  'AUTONOMY_EVOLUTION_CODE_EDIT=false',
  'SMTP_ENABLED=false'
)

foreach ($key in $copyKeys) {
  $val = Read-EnvValue $localAtinaEnv $key
  if (-not $val) { $val = Read-EnvValue $localWebEnv $key }
  if ($val) { $atinaLines += "$key=$val" }
}

Set-Content -Path (Join-Path $atinaRoot '.env.docker.prod') -Value ($atinaLines -join "`n") -Encoding UTF8

$resendKey = Read-EnvValue $localWebEnv 'RESEND_API_KEY'
$resendFrom = Read-EnvValue $localWebEnv 'CONTACT_EMAIL_FROM'
$resendTo = Read-EnvValue $localWebEnv 'CONTACT_EMAIL_TO'

$webEnv = @(
  "NEXT_PUBLIC_ATINA_API_BASE=http://127.0.0.1:$AtinaPort",
  "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:$WebPort",
  'ATINA_API_BASE=http://atina-api:3000',
  "SESSION_SECRET=$sessionSecret",
  "RESEND_API_KEY=$resendKey",
  "CONTACT_EMAIL_FROM=$resendFrom",
  "CONTACT_EMAIL_TO=$resendTo"
) -join "`n"
Set-Content -Path (Join-Path $webRoot '.env.production') -Value $webEnv -Encoding UTF8

Write-Host 'Docker prod env pripremljen:' -ForegroundColor Green
Write-Host "  API  -> http://127.0.0.1:$AtinaPort"
Write-Host "  Web  -> http://127.0.0.1:$WebPort"
Write-Host "  Admin login: admin@atina.io / (vidi atina-platform/atina/.env.docker.prod ADMIN_PASSWORD)"
Write-Host ''
Write-Host 'Sledece: .\scripts\docker-prod-test.ps1' -ForegroundColor Cyan
