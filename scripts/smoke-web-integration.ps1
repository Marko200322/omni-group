<#
.SYNOPSIS
  Smoke: Omni Group web BFF + Atina API (login, ai-memory, contact stub).

.DESCRIPTION
  Pretpostavlja da Atina (:3000) i web (:3010) već rade.
  Ne zahteva Resend — kontakt vraća queued_local_stub bez ključa.

.EXAMPLE
  .\scripts\smoke-web-integration.ps1
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456'
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$atina = $AtinaBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

function Invoke-BffLogin {
  param(
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [string]$LoginBody
  )
  return Invoke-WithRateLimitRetry -Label 'BFF login' -Action {
    $login = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $LoginBody -WebSession $Session -UseBasicParsing
    return ($login.Content | ConvertFrom-Json)
  }
}

Write-Host "== Atina /health ==" -ForegroundColor Cyan
$h = Invoke-WithRateLimitRetry -Label 'Atina /health' -Action {
  Invoke-QuickWebGet -Uri "$atina/health" -TimeoutSec 15
}
if ($h.StatusCode -ne 200) { throw "Atina health HTTP $($h.StatusCode)" }
Write-Host "  OK" -ForegroundColor Green

Write-Host "== Web /api/health ==" -ForegroundColor Cyan
$wh = Invoke-QuickWebGet -Uri "$web/api/health" -TimeoutSec 15
if ($wh.StatusCode -ne 200) { throw "Web health HTTP $($wh.StatusCode)" }
Write-Host "  OK" -ForegroundColor Green

Write-Host "== Web BFF login ==" -ForegroundColor Cyan
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$lj = Invoke-BffLogin -Session $session -LoginBody $body
if (-not $lj.ok) { throw "BFF login failed" }
Write-Host "  OK user=$($lj.user.email) redirect=$($lj.redirectTo)" -ForegroundColor Green

Write-Host "== Web BFF ai-memory ==" -ForegroundColor Cyan
$memBody = '{"key":"smoke","value":{"ts":"' + (Get-Date -Format o) + '"},"namespace":"global"}'
Invoke-WithRateLimitRetry -Label 'ai-memory remember' -Action {
  $rem = Invoke-WebRequest -Uri "$web/api/atina/ai-memory/remember" -Method POST -ContentType 'application/json' -Body $memBody -WebSession $session -UseBasicParsing
  $rj = $rem.Content | ConvertFrom-Json
  if (-not $rj.ok) { throw "remember failed: $($rem.Content)" }
  return $rj
} | Out-Null
$rc = Invoke-WithRateLimitRetry -Label 'ai-memory recall' -Action {
  $rec = Invoke-WebRequest -Uri ($web + '/api/atina/ai-memory/recall?namespace=global&key=smoke') -WebSession $session -UseBasicParsing
  $parsed = $rec.Content | ConvertFrom-Json
  if (-not $parsed.ok -or $parsed.items.Count -lt 1) { throw "recall failed: $($rec.Content)" }
  return $parsed
}
Write-Host "  OK recall items=$($rc.items.Count)" -ForegroundColor Green

Write-Host "== Web contact stub ==" -ForegroundColor Cyan
$cBody = '{"name":"Smoke","email":"smoke@example.com","message":"integration test"}'
$contact = Invoke-WebRequest -Uri "$web/api/contact" -Method POST -ContentType 'application/json' -Body $cBody -UseBasicParsing
$cj = $contact.Content | ConvertFrom-Json
if (-not $cj.ok) { throw "contact failed: $($contact.Content)" }
Write-Host "  OK message=$($cj.message)" -ForegroundColor Green

Write-Host "== Web /dashboard (session) ==" -ForegroundColor Cyan
$dash = Invoke-WebRequest -Uri "$web/dashboard" -WebSession $session -UseBasicParsing
if ($dash.StatusCode -ne 200) { throw "dashboard HTTP $($dash.StatusCode)" }
Write-Host "  OK len=$($dash.Content.Length)" -ForegroundColor Green

Write-Host "== Web BFF billing + payments ==" -ForegroundColor Cyan
$methods = Invoke-WebRequest -Uri "$web/api/atina/payments/methods" -WebSession $session -UseBasicParsing
$mj = $methods.Content | ConvertFrom-Json
if (-not $mj.ok) { throw "payments/methods failed: $($methods.Content)" }
Write-Host "  OK mode=$($mj.data.mode)" -ForegroundColor Green

$bill = Invoke-WebRequest -Uri "$web/api/atina/billing/summary" -WebSession $session -UseBasicParsing
$bj = $bill.Content | ConvertFrom-Json
if (-not $bj.ok) { throw "billing/summary failed: $($bill.Content)" }
Write-Host "  OK billing summary" -ForegroundColor Green

$coBody = '{"planSlug":"starter","billingCycle":"monthly"}'
$co = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/checkout" -Method POST -ContentType 'application/json' -Body $coBody -WebSession $session -UseBasicParsing
$cj2 = $co.Content | ConvertFrom-Json
if (-not $cj2.ok -or -not $cj2.data.paymentId) { throw "manual checkout failed: $($co.Content)" }
Write-Host "  OK checkout paymentId=$($cj2.data.paymentId)" -ForegroundColor Green

Write-Host "== Web BFF admin overview ==" -ForegroundColor Cyan
$adm = Invoke-WebRequest -Uri "$web/api/atina/admin/overview" -WebSession $session -UseBasicParsing
$aj = $adm.Content | ConvertFrom-Json
if (-not $aj.ok) { throw "admin/overview failed: $($adm.Content)" }
Write-Host "  OK users=$($aj.data.users.total)" -ForegroundColor Green

Write-Host "== Web BFF avatar agents ==" -ForegroundColor Cyan
$agents = Invoke-WebRequest -Uri "$web/api/atina/video-meetings/support/agents" -UseBasicParsing
$agj = $agents.Content | ConvertFrom-Json
if (-not $agj.ok) { throw "support/agents failed: $($agents.Content)" }
Write-Host "  OK agents=$($agj.data.agents.Count)" -ForegroundColor Green

Write-Host "== Web BFF avatar session ==" -ForegroundColor Cyan
$agentId = $agj.data.agents[0].id
$sBody = ('{"agentId":"' + $agentId + '"}')
try {
  $av = Invoke-WebRequest -Uri "$web/api/atina/video-meetings/support/avatar/session" -Method POST -ContentType 'application/json' -Body $sBody -WebSession $session -UseBasicParsing -TimeoutSec 60
  $avj = $av.Content | ConvertFrom-Json
  if (-not $avj.ok) { throw "avatar session failed: $($av.Content)" }
  Write-Host "  OK sessionId=$($avj.data.sessionId)" -ForegroundColor Green
} catch {
  Write-Host "  WARN avatar session slow/failed (AI aggregator optional): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "== Web BFF admin payments ==" -ForegroundColor Cyan
$payList = Invoke-WebRequest -Uri "$web/api/atina/admin/payments?status=processing&provider=manual&limit=5" -WebSession $session -UseBasicParsing
$plj = $payList.Content | ConvertFrom-Json
if (-not $plj.ok) { throw "admin/payments failed: $($payList.Content)" }
Write-Host "  OK processing=$($plj.data.Count)" -ForegroundColor Green

Write-Host ''
Write-Host 'smoke-web-integration: all checks passed.' -ForegroundColor Green
