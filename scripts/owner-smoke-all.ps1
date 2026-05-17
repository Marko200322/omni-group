<#
.SYNOPSIS
  Jedan prolaz — web+Atina integracija, kontakt, Atina smoke:all.

.EXAMPLE
  .\scripts\owner-smoke-all.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '=== owner-smoke-all ===' -ForegroundColor Cyan

& (Join-Path $scriptsDir 'smoke-web-integration.ps1')
& (Join-Path $scriptsDir 'test-contact-resend.ps1')

Push-Location (Join-Path $repoRoot 'atina-platform\atina')
npm.cmd run smoke:all
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host ''
Write-Host 'owner-smoke-all: all checks passed.' -ForegroundColor Green
