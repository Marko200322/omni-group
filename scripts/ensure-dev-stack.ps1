<#
.SYNOPSIS
  Proveri i pokrene ceo lokalni stack: Atina API (:3000) + web (:3010).

.DESCRIPTION
  Koristi ensure-atina-api i ensure-web-dev. Na kraju pokreće smoke-platform-full
  ako su oba servisa dostupna.

.EXAMPLE
  .\scripts\ensure-dev-stack.ps1
.EXAMPLE
  .\scripts\ensure-dev-stack.ps1 -SkipSmoke
#>
#Requires -Version 5.1
param(
  [switch]$SkipSmoke,
  [int]$AtinaPort = 0
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '=== ensure-dev-stack ===' -ForegroundColor Cyan
Write-Host 'Platform (browser): http://localhost:3010' -ForegroundColor DarkGray
Write-Host 'API backend only:   http://localhost:3000/health' -ForegroundColor DarkGray
Write-Host ''

$atinaArgs = @()
if ($AtinaPort) { $atinaArgs += '-Port', $AtinaPort }
& (Join-Path $scriptsDir 'ensure-atina-api.ps1') @atinaArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipSmoke) {
  Write-Host ''
  Write-Host '== smoke-platform-full ==' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'smoke-platform-full.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ''
Write-Host 'Stack ready:' -ForegroundColor Green
Write-Host '  Web / dashboard: http://localhost:3010/dashboard' -ForegroundColor Green
Write-Host '  Admin console:   http://localhost:3010/admin' -ForegroundColor Green
Write-Host '  Mobile ops:      http://localhost:3010/admin/mobile' -ForegroundColor Green
Write-Host '  Login:           http://localhost:3010/login' -ForegroundColor Green
