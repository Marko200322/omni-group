<#
.SYNOPSIS
  Jedan prolaz — web+Atina integracija, kontakt, upload spike, register E2E, Atina smoke:all.

.EXAMPLE
  .\scripts\owner-smoke-all.ps1
  .\scripts\owner-smoke-all.ps1 -SkipRegisterE2e
  .\scripts\owner-smoke-all.ps1 -SkipAtinaSmoke
#>
#Requires -Version 5.1
param(
  [switch]$SkipRegisterE2e,
  [switch]$SkipAtinaSmoke
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '=== owner-smoke-all ===' -ForegroundColor Cyan

if ($SkipAtinaSmoke) {
  Write-Host 'Atina smoke preskocen (-SkipAtinaSmoke)' -ForegroundColor Yellow
  & (Join-Path $scriptsDir 'smoke-web-only.ps1')
  & (Join-Path $scriptsDir 'test-contact-resend.ps1')
  & (Join-Path $scriptsDir 'test-upload-spike.ps1')
  Write-Host ''
  Write-Host 'owner-smoke-all: web-only checks passed (Atina preskocen).' -ForegroundColor Green
  exit 0
}

& (Join-Path $scriptsDir 'smoke-web-integration.ps1')
& (Join-Path $scriptsDir 'test-contact-resend.ps1')
& (Join-Path $scriptsDir 'test-upload-spike.ps1')

if (-not $SkipRegisterE2e) {
  & (Join-Path $scriptsDir 'e2e-register-plan-payment.ps1')
}

Push-Location (Join-Path $repoRoot 'atina-platform\atina')
npm.cmd run smoke:all
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host ''
Write-Host 'owner-smoke-all: all checks passed.' -ForegroundColor Green
