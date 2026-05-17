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

Write-Host "== Atina /health ==" -ForegroundColor Cyan
$h = Invoke-WebRequest -Uri "$atina/health" -UseBasicParsing -TimeoutSec 15
if ($h.StatusCode -ne 200) { throw "Atina health HTTP $($h.StatusCode)" }
Write-Host "  OK" -ForegroundColor Green

Write-Host "== Web /api/health ==" -ForegroundColor Cyan
$wh = Invoke-WebRequest -Uri "$web/api/health" -UseBasicParsing -TimeoutSec 15
if ($wh.StatusCode -ne 200) { throw "Web health HTTP $($wh.StatusCode)" }
Write-Host "  OK" -ForegroundColor Green

Write-Host "== Web BFF login ==" -ForegroundColor Cyan
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing
$lj = $login.Content | ConvertFrom-Json
if (-not $lj.ok) { throw "BFF login failed: $($login.Content)" }
Write-Host "  OK user=$($lj.user.email) redirect=$($lj.redirectTo)" -ForegroundColor Green

Write-Host "== Web BFF ai-memory ==" -ForegroundColor Cyan
$memBody = '{"key":"smoke","value":{"ts":"' + (Get-Date -Format o) + '"},"namespace":"global"}'
$rem = Invoke-WebRequest -Uri "$web/api/atina/ai-memory/remember" -Method POST -ContentType 'application/json' -Body $memBody -WebSession $session -UseBasicParsing
$rj = $rem.Content | ConvertFrom-Json
if (-not $rj.ok) { throw "remember failed: $($rem.Content)" }
$rec = Invoke-WebRequest -Uri "$web/api/atina/ai-memory/recall?namespace=global&key=smoke" -WebSession $session -UseBasicParsing
$rc = $rec.Content | ConvertFrom-Json
if (-not $rc.ok -or $rc.items.Count -lt 1) { throw "recall failed: $($rec.Content)" }
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

Write-Host ''
Write-Host 'smoke-web-integration: all checks passed.' -ForegroundColor Green
