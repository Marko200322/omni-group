<#
.SYNOPSIS
  Provera Autonomy Loop budžeta i Telegram env (atina-platform/atina/.env) — bez ispisa tajni.

.EXAMPLE
  .\scripts\check-autonomy-env.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$envPath = Join-Path $repoRoot 'atina-platform\atina\.env'

if (-not (Test-Path $envPath)) {
  Write-Host "FAIL: Nema fajla $envPath (kopiraj iz .env.example)" -ForegroundColor Red
  exit 1
}

function Read-DotEnv {
  param([string]$Path)
  $map = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    $idx = $t.IndexOf('=')
    if ($idx -lt 1) { continue }
    $key = $t.Substring(0, $idx).Trim()
    $val = $t.Substring($idx + 1).Trim()
    $map[$key] = $val
  }
  return $map
}

function Has-Value {
  param([string]$Value)
  -not [string]::IsNullOrWhiteSpace($Value)
}

$e = Read-DotEnv $envPath
$fail = 0

Write-Host '=== check-autonomy-env ===' -ForegroundColor Cyan

$enabled = ($e['AUTONOMY_ENABLED'] -eq 'true')
Write-Host ("AUTONOMY_ENABLED: " + $(if ($enabled) { 'true' } else { 'false' }))

if (-not $enabled) {
  Write-Host 'INFO: Autonomy iskljucen — preskacem budzet/Telegram gate.' -ForegroundColor Yellow
  exit 0
}

$budgetKeys = @(
  'AUTONOMY_INITIAL_BUDGET_USD',
  'AUTONOMY_MAX_SPEND_PER_TICK_USD',
  'AUTONOMY_MAX_SPEND_PER_DAY_USD',
  'AUTONOMY_MIN_RESERVE_USD'
)
foreach ($k in $budgetKeys) {
  if (-not (Has-Value $e[$k])) {
    Write-Host "WARN: $k nije set (koristi se default iz koda)" -ForegroundColor Yellow
  } else {
    Write-Host "OK: $k=$($e[$k])"
  }
}

$telegramDirect = (Has-Value $e['TELEGRAM_BOT_TOKEN']) -and (Has-Value $e['TELEGRAM_CHAT_ID'])
$commsAgg = (Has-Value $e['COMMS_URL']) -and (Has-Value $e['COMMS_KEY'])
$notify = ($e['AUTONOMY_TELEGRAM_NOTIFY'] -ne 'false')

if ($notify -and -not $telegramDirect -and -not $commsAgg) {
  Write-Host 'WARN: Telegram notify ukljucen ali nema TELEGRAM_* ni COMMS agregatora' -ForegroundColor Yellow
  $fail = 1
} elseif ($telegramDirect) {
  Write-Host 'OK: Telegram direktno (bot + chat id)'
} elseif ($commsAgg) {
  Write-Host 'OK: Telegram preko COMMS agregatora'
} else {
  Write-Host 'INFO: Telegram notify iskljucen ili nije konfigurisan'
}

if ($e['AUTONOMY_MARKETING_ENABLED'] -eq 'true') {
  if (-not ((Has-Value $e['BUSINESS_AND_DEV_URL']) -and (Has-Value $e['BUSINESS_AND_DEV_KEY']))) {
    Write-Host 'WARN: AUTONOMY_MARKETING_ENABLED=true ali BUSINESS_AND_DEV_* nije popunjen' -ForegroundColor Yellow
    $fail = 1
  } else {
    Write-Host 'OK: marketing spend preko BUSINESS_AND_DEV agregatora'
  }
} else {
  Write-Host 'OK: marketing spend iskljucen (preporuceno na startu)'
}

if ($fail -gt 0) {
  Write-Host 'check-autonomy-env: WARN (vidi gore)' -ForegroundColor Yellow
  exit 1
}

Write-Host 'check-autonomy-env: PASS' -ForegroundColor Green
exit 0
