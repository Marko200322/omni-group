#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke: live-call-avatar status + optional authenticated stub session.

.EXAMPLE
  .\scripts\smoke-live-call-avatar.ps1
  .\scripts\smoke-live-call-avatar.ps1 -WebBase https://omnigrouptech.com -AtinaBase https://api.omnigrouptech.com
#>
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [string]$Email = '',
  [string]$Password = '',
  [switch]$SkipSession
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$atina = $AtinaBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path $scriptsDir -Parent
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')
. (Join-Path $scriptsDir 'bff-smoke-headers.ps1')

if (-not $Password) {
  $useProd = Test-ProdWebBase $web
  $creds = Get-AdminCredentials -RepoRoot $repoRoot -Prod:$useProd
  $Email = $creds.Email
  $Password = $creds.Password
}

Write-Host '== Live call avatar /status (Atina public) ==' -ForegroundColor Cyan
$statusRes = Invoke-WebRequest -Uri "$atina/api/v1/live-call-avatar/status" -UseBasicParsing -TimeoutSec 20
if ($statusRes.StatusCode -ne 200) { throw "status HTTP $($statusRes.StatusCode)" }
$statusJson = $statusRes.Content | ConvertFrom-Json
if (-not $statusJson.success) { throw "status failed: $($statusRes.Content)" }
Write-Host "  OK enabled=$($statusJson.data.enabled) recall=$($statusJson.data.recallConfigured)" -ForegroundColor Green

Write-Host '== Live call avatar /status (Web BFF) ==' -ForegroundColor Cyan
$bffStatus = Invoke-WebRequest -Uri "$web/api/atina/live-call-avatar/status" -UseBasicParsing -TimeoutSec 30
$bffJson = $bffStatus.Content | ConvertFrom-Json
if (-not $bffJson.ok) { throw "BFF status failed: $($bffStatus.Content)" }
Write-Host '  OK' -ForegroundColor Green

if ($SkipSession) {
  Write-Host 'smoke-live-call-avatar: passed (session skipped).' -ForegroundColor Green
  exit 0
}

Write-Host '== Live call avatar stub session ==' -ForegroundColor Cyan
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = (@{ email = $Email; password = $Password } | ConvertTo-Json -Compress)
$login = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing -TimeoutSec 45
$loginJson = $login.Content | ConvertFrom-Json
if (-not $loginJson.ok) { throw "login failed: $($login.Content)" }

$postHeaders = Get-BffSmokePostHeaders
$body = '{"agentId":"mila","agentType":"support","platform":"browser","liveProvider":"stub"}'
try {
  $start = Invoke-WebRequest -Uri "$web/api/atina/live-call-avatar/session" -Method POST -ContentType 'application/json' -Body $body -WebSession $session -Headers $postHeaders -UseBasicParsing -TimeoutSec 60
  $startJson = $start.Content | ConvertFrom-Json
  if (-not $startJson.ok) { throw "session failed: $($start.Content)" }
  $sid = $startJson.data.sessionId
  Write-Host "  OK sessionId=$sid provider=$($startJson.data.provider)" -ForegroundColor Green

  $turnBody = '{"message":"Hello Mila, smoke test."}'
  $turn = Invoke-WebRequest -Uri "$web/api/atina/live-call-avatar/session/$sid/turn" -Method POST -ContentType 'application/json' -Body $turnBody -WebSession $session -Headers $postHeaders -UseBasicParsing -TimeoutSec 90
  $turnJson = $turn.Content | ConvertFrom-Json
  if (-not $turnJson.ok -or -not $turnJson.data.message.text) { throw "turn failed: $($turn.Content)" }
  Write-Host "  OK turn reply=$($turnJson.data.message.text.Substring(0, [Math]::Min(60, $turnJson.data.message.text.Length)))..." -ForegroundColor Green

  Invoke-WebRequest -Uri "$web/api/atina/live-call-avatar/session/$sid/end" -Method POST -WebSession $session -Headers $postHeaders -UseBasicParsing -TimeoutSec 30 | Out-Null
  Write-Host '  OK session ended' -ForegroundColor Green
} catch {
  if ($statusJson.data.enabled -eq $false) {
    Write-Host "  SKIP session (LIVE_CALL_AVATAR_ENABLED=false): $($_.Exception.Message)" -ForegroundColor Yellow
  } else {
    throw
  }
}

Write-Host 'smoke-live-call-avatar: all checks passed.' -ForegroundColor Green
