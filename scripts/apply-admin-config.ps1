# Applies admin-config.local.json to atina .env and omnigroup-web .env.local
# Usage: .\scripts\apply-admin-config.ps1 [-ConfigPath path\to\admin-config.local.json]

param(
  [string]$ConfigPath = (Join-Path (Split-Path $PSScriptRoot -Parent) 'admin-config.local.json')
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$atinaEnv = Join-Path $repoRoot 'atina-platform\atina\.env'
$webEnv = Join-Path $repoRoot 'apps\omnigroup-web\.env.local'

if (-not (Test-Path $ConfigPath)) {
  Write-Host "Missing $ConfigPath"
  Write-Host "Copy admin-config.local.json.example -> admin-config.local.json and fill in your values."
  exit 1
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

function New-Secret([int]$Length = 48) {
  $chars = (48..57) + (65..90) + (97..122)
  -join (1..$Length | ForEach-Object { [char]($chars | Get-Random) })
}

function Set-EnvLine {
  param([string]$Path, [string]$Key, [string]$Value)
  if (-not $Value -or $Value.Trim().Length -eq 0) { return }
  $lines = if (Test-Path $Path) { Get-Content $Path } else { @() }
  $found = $false
  $newLines = foreach ($line in $lines) {
    if ($line -match "^\s*$([regex]::Escape($Key))\s*=") {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) { $newLines += "$Key=$Value" }
  Set-Content -Path $Path -Value $newLines -Encoding UTF8
}

$credentialsPath = Join-Path $repoRoot 'atina-platform\atina\ADMIN-CREDENTIALS.local.txt'
$generated = @()

if ($config.regenerateSecrets) {
  $jwt = New-Secret 48
  $jwtRefresh = New-Secret 48
  $adminPass = "Og!" + (New-Secret 20)
  $sessionSecret = New-Secret 48
  Set-EnvLine $atinaEnv 'JWT_SECRET' $jwt
  Set-EnvLine $atinaEnv 'JWT_REFRESH_SECRET' $jwtRefresh
  Set-EnvLine $atinaEnv 'ADMIN_PASSWORD' $adminPass
  Set-EnvLine $webEnv 'SESSION_SECRET' $sessionSecret
  $generated += "ADMIN_EMAIL=admin@atina.io"
  $generated += "ADMIN_PASSWORD=$adminPass"
  $generated += '(JWT and SESSION secrets updated in .env files)'
}

$map = @{
  'manualPaymentAccountName' = 'MANUAL_PAYMENT_ACCOUNT_NAME'
  'manualPaymentSwift'       = 'MANUAL_PAYMENT_SWIFT'
  'manualPaymentNote'        = 'MANUAL_PAYMENT_NOTE'
  'paymentNotifyEmail'       = 'PAYMENT_NOTIFY_EMAIL'
  'outreachFallbackEmail'    = 'OUTREACH_FALLBACK_EMAIL'
  'supportGoogleMeetUrl'     = 'SUPPORT_GOOGLE_MEET_URL'
  'salesGoogleMeetUrl'       = 'SALES_GOOGLE_MEET_URL'
  'cursorApiKey'             = 'CURSOR_API_KEY'
  'cursorRepoPath'           = 'CURSOR_REPO_PATH'
  'telegramBotToken'         = 'TELEGRAM_BOT_TOKEN'
  'telegramChatId'           = 'TELEGRAM_CHAT_ID'
  'heygenApiKey'             = 'HEYGEN_API_KEY'
  'didApiKey'                = 'DID_API_KEY'
}

foreach ($prop in $map.Keys) {
  $val = $config.$prop
  if ($val) { Set-EnvLine $atinaEnv $map[$prop] $val }
}

if ($config.contactEmailTo) {
  Set-EnvLine $webEnv 'CONTACT_EMAIL_TO' $config.contactEmailTo
}

if ($config.allowManualPaymentsInProduction -eq $true) {
  Set-EnvLine $atinaEnv 'ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION' 'true'
}

# Ensure English manual payment note default
if (-not $config.manualPaymentNote) {
  Set-EnvLine $atinaEnv 'MANUAL_PAYMENT_NOTE' 'Include the payment reference in the transfer description. SEPA (EU) — IBAN only; SWIFT/BIC not required. Activates after you confirm payment in admin.'
}

Set-EnvLine $atinaEnv 'CURSOR_AGENT_ENABLED' 'true'
Set-EnvLine $atinaEnv 'CURSOR_EVOLUTION_ENABLED' 'true'
Set-EnvLine $atinaEnv 'CURSOR_MODEL' 'composer-2.5'
Set-EnvLine $atinaEnv 'CURSOR_RUNTIME' 'local'

if ($generated.Count -gt 0) {
  $header = @(
    '# Omni Group admin login (local). Do NOT commit.'
    "# $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    ''
  )
  Set-Content -Path $credentialsPath -Value ($header + $generated) -Encoding UTF8
  Write-Host "Credentials saved: $credentialsPath"
}

Write-Host 'Admin config applied.'
Write-Host "Atina env: $atinaEnv"
Write-Host "Web env:   $webEnv"
Write-Host ''
Write-Host 'Next: restart services'
Write-Host '  .\scripts\restart-atina-dev.ps1'
Write-Host '  .\scripts\restart-web-dev.ps1'
