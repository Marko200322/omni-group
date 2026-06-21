<#
.SYNOPSIS
  Proveri Atina /health; ako ne odgovara, pokrene restart-atina-dev.ps1.

.EXAMPLE
  .\scripts\ensure-atina-api.ps1
  .\scripts\ensure-atina-api.ps1 -Port 3001
#>
#Requires -Version 5.1
param(
  [int]$Port = 0,
  [int]$TimeoutSec = 5
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

if (-not $Port) {
  $Port = if ($env:ATINA_DEV_PORT) { [int]$env:ATINA_DEV_PORT } else { 3000 }
}

$url = 'http://127.0.0.1:' + $Port + '/health'
$healthy = $false
try {
  $r = Invoke-QuickWebGet -Uri $url -TimeoutSec $TimeoutSec
  if ($r.StatusCode -eq 200) { $healthy = $true }
} catch {
  $healthy = $false
}

if ($healthy) {
  Write-Host ('Atina API: OK (' + $url + ')') -ForegroundColor Green
  exit 0
}

Write-Host ('Atina API: nije dostupan na portu ' + $Port + ' - pokrecem restart...') -ForegroundColor Yellow
& (Join-Path $scriptsDir 'restart-atina-dev.ps1') -Port $Port
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$deadline = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-QuickWebGet -Uri $url -TimeoutSec 4
    if ($r.StatusCode -eq 200) {
      Write-Host ('Atina API: OK posle restarta (' + $url + ')') -ForegroundColor Green
      exit 0
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

Write-Host 'Atina API i dalje ne odgovara. Restartuj Docker Desktop ili proveri atina-platform/atina/.env' -ForegroundColor Red
exit 1
