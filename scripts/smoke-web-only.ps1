<#
.SYNOPSIS
  Smoke samo Next.js web — bez Atina API (kada Docker/Postgres nije dostupan).

.EXAMPLE
  .\scripts\smoke-web-only.ps1
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010'
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "== Web /api/health ==" -ForegroundColor Cyan
$wh = Invoke-QuickWebGet -Uri "$web/api/health" -TimeoutSec 15
if ($wh.StatusCode -ne 200) { throw "Web health HTTP $($wh.StatusCode)" }
Write-Host '  OK' -ForegroundColor Green

Write-Host "== Web / (homepage) ==" -ForegroundColor Cyan
$homePage = Invoke-WithRateLimitRetry -Label 'Web homepage' -Action {
  Invoke-WebRequest -Uri "$web/" -UseBasicParsing -TimeoutSec 60
}
if ($homePage.StatusCode -ne 200) { throw "homepage HTTP $($homePage.StatusCode)" }
Write-Host "  OK len=$($homePage.Content.Length)" -ForegroundColor Green

Write-Host "== Web contact stub ==" -ForegroundColor Cyan
$cBody = '{"name":"Smoke","email":"smoke@example.com","message":"web-only integration test"}'
$contact = Invoke-WebRequest -Uri "$web/api/contact" -Method POST -ContentType 'application/json' -Body $cBody -UseBasicParsing
$cj = $contact.Content | ConvertFrom-Json
if (-not $cj.ok) { throw "contact failed: $($contact.Content)" }
Write-Host "  OK message=$($cj.message)" -ForegroundColor Green

Write-Host ''
Write-Host 'smoke-web-only: all checks passed (Atina preskocen).' -ForegroundColor Green
