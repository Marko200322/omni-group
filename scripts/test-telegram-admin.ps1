#Requires -Version 5.1
<#
.SYNOPSIS
  Test Telegram admin notifications (Atina .env or deploy.config).

.EXAMPLE
  .\scripts\test-telegram-admin.ps1
#>
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'deploy-config-env.ps1')

function Read-DotEnv([string]$Path) {
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  Get-Content $Path | ForEach-Object {
    $t = $_.Trim()
    if (-not $t -or $t.StartsWith('#')) { return }
    if ($t -match '^([A-Z0-9_]+)=(.*)$') { $map[$Matches[1]] = $Matches[2].Trim() }
  }
  return $map
}

$token = ''
$chatId = ''
$cfgPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
if (Test-Path $cfgPath) {
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  if ($cfg.telegramBotToken) { $token = "$($cfg.telegramBotToken)".Trim() }
  if ($cfg.telegramChatId) { $chatId = "$($cfg.telegramChatId)".Trim() }
}
$atinaEnv = Read-DotEnv (Join-Path $repoRoot 'atina-platform\atina\.env')
if (-not $token) { $token = $atinaEnv['TELEGRAM_BOT_TOKEN'] }
if (-not $chatId) { $chatId = $atinaEnv['TELEGRAM_CHAT_ID'] }

if (-not $token -or -not $chatId) {
  Write-Host 'FAIL: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID nisu set' -ForegroundColor Red
  Write-Host 'Popuni KLJUCEVI-POPUNI.local.txt ili deploy.config (telegramBotToken, telegramChatId)' -ForegroundColor Yellow
  exit 1
}

$text = @(
  'Test — Omni Group admin Telegram',
  "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
  'If you see this, admin notifications work.',
  '',
  'Events: payment pending, fulfillment fail, contact form.'
) -join "`n"

$uri = "https://api.telegram.org/bot$token/sendMessage"
$payload = @{ chat_id = $chatId; text = $text; disable_web_page_preview = $true } | ConvertTo-Json -Compress
$res = Invoke-RestMethod -Uri $uri -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -ContentType 'application/json; charset=utf-8'
if ($res.ok) {
  Write-Host 'PASS: Telegram poruka poslata' -ForegroundColor Green
} else {
  Write-Host 'FAIL: Telegram API rejected' -ForegroundColor Red
  exit 1
}
