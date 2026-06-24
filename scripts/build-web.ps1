<#
.SYNOPSIS
  Production build za omnigroup-web sa povecanom Node memorijom.

.EXAMPLE
  .\scripts\build-web.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$webDir = Join-Path (Split-Path -Parent $scriptsDir) 'apps\omnigroup-web'

Write-Host 'Za build zatvori dev servere na :3010 ako build padne na OOM.' -ForegroundColor Yellow
$env:NODE_OPTIONS = '--max-old-space-size=8192'
Push-Location $webDir
try {
  npm.cmd run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
Write-Host 'build-web: OK' -ForegroundColor Green
