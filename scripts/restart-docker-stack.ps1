<#
.SYNOPSIS
  Pokrece Docker Desktop i Atina dev stack (postgres + redis + app).

.EXAMPLE
  .\scripts\restart-docker-stack.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$atina = Join-Path $root 'atina-platform\atina'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

function Wait-DockerDaemon([int]$MaxSeconds = 180) {
  $deadline = (Get-Date).AddSeconds($MaxSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      docker info 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) { return $true }
    } catch { }
    Start-Sleep -Seconds 5
  }
  return $false
}

Write-Host '=== restart-docker-stack ===' -ForegroundColor Cyan

if (-not (Wait-DockerDaemon 8)) {
  Write-Host 'Docker engine nije aktivan - pokrecem Docker Desktop...' -ForegroundColor Yellow
  Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -ErrorAction SilentlyContinue
  if (-not (Wait-DockerDaemon 180)) {
    Write-Host 'Docker Desktop nije spreman. Otvori ga rucno iz system tray-a i pokreni skriptu ponovo.' -ForegroundColor Red
    exit 1
  }
}

Push-Location $atina
docker compose up -d postgres redis
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'postgres/redis start failed' }

$deadline = (Get-Date).AddMinutes(2)
do {
  Start-Sleep -Seconds 3
  $pg = docker compose ps postgres --format '{{.Health}}' 2>$null
  if ($pg -eq 'healthy') { break }
} while ((Get-Date) -lt $deadline)

docker compose up -d app
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'atina app start failed' }
Pop-Location

$deadline = (Get-Date).AddMinutes(2)
while ((Get-Date) -lt $deadline) {
  try {
    $uri = 'http://127.0.0.1:3000/health'
    $r = Invoke-QuickWebGet -Uri $uri -TimeoutSec 4
    if ($r.StatusCode -eq 200) {
      Write-Host 'Atina API OK -> http://127.0.0.1:3000/health' -ForegroundColor Green
      & (Join-Path $scriptsDir 'restart-web-dev.ps1') | Out-Null
      Write-Host 'Web dev -> http://localhost:3010' -ForegroundColor Green
      exit 0
    }
  } catch {
    Start-Sleep -Seconds 3
  }
}

Write-Host 'Stack pokrenut ali /health jos nije OK - proveri: docker compose -f atina-platform/atina/docker-compose.yml logs app' -ForegroundColor Yellow
exit 1
