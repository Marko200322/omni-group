<#
.SYNOPSIS
  Pokusaj automatskog pokretanja Docker Desktop engine-a (Windows).

.DESCRIPTION
  Ne menja vhdx — za oslobadjanje diska vidi docker-disk-help.ps1.
  Zahteva Docker Desktop instaliran; Start-Service moze zahtevati admin.

.EXAMPLE
  .\scripts\docker-repair.ps1
#>
#Requires -Version 5.1
param(
  [int]$WaitSec = 120
)

$ErrorActionPreference = 'Continue'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-DockerEngine {
  docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

Write-Host '=== docker-repair ===' -ForegroundColor Cyan
Write-Host ''

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)
if ($freeGb -lt 3) {
  Write-Host ("UPOZORENJE: C: ima ${freeGb} GB - Docker/WSL retko startuje ispod 3 GB.") -ForegroundColor Red
  Write-Host '  Preporuka: Purge u Docker Desktop (Troubleshoot) ili deploy na staging serveru.' -ForegroundColor Yellow
  Write-Host '  Detalji: .\scripts\docker-disk-help.ps1' -ForegroundColor DarkGray
  Write-Host ''
}

& (Join-Path $scriptsDir 'docker-disk-help.ps1')
Write-Host ''

if (Test-DockerEngine) {
  Write-Host 'docker-repair: engine vec radi.' -ForegroundColor Green
  exit 0
}

Write-Host '== Korak 1: wsl --shutdown ==' -ForegroundColor Cyan
wsl --shutdown 2>$null
Start-Sleep -Seconds 3

Write-Host '== Korak 2: com.docker.service ==' -ForegroundColor Cyan
$svc = Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue
if ($svc) {
  if ($svc.Status -ne 'Running') {
    try {
      Start-Service com.docker.service -ErrorAction Stop
      Write-Host '  Start-Service: OK' -ForegroundColor Green
    } catch {
      Write-Host "  Start-Service: $($_.Exception.Message)" -ForegroundColor Yellow
      Write-Host '  (probaj PowerShell kao Administrator)' -ForegroundColor DarkGray
    }
  } else {
    Write-Host '  servis vec Running' -ForegroundColor Green
  }
} else {
  Write-Host '  com.docker.service nije pronadjen' -ForegroundColor Yellow
}

Write-Host '== Korak 3: Docker Desktop UI ==' -ForegroundColor Cyan
$dockerExe = @(
  "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
  "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($dockerExe) {
  Start-Process -FilePath $dockerExe
  Write-Host "  Pokrenuto: $dockerExe" -ForegroundColor DarkGray
} else {
  Write-Host '  Docker Desktop.exe nije pronadjen' -ForegroundColor Red
}

if ($freeGb -lt 3) {
  Write-Host 'docker-repair: preskoceno cekanje (disk < 3 GB).' -ForegroundColor Yellow
  Write-Host 'Vlasnik: oslobodi disk ili Purge Docker data, pa restart PC.' -ForegroundColor Yellow
  exit 1
}

Write-Host ("== Korak 4: cekam engine ({0}s) ==" -f $WaitSec) -ForegroundColor Cyan
$ok = $false
$steps = [math]::Max(1, [math]::Floor($WaitSec / 5))
for ($i = 1; $i -le $steps; $i++) {
  if (Test-DockerEngine) {
    $ok = $true
    Write-Host "  engine OK (pokusaj $i)" -ForegroundColor Green
    break
  }
  Start-Sleep -Seconds 5
}

Write-Host ''
if ($ok) {
  Write-Host 'docker-repair: PASS - pokreni .\scripts\start-local-stack.ps1' -ForegroundColor Green
  exit 0
}

Write-Host 'docker-repair: FAIL - engine i dalje down.' -ForegroundColor Red
Write-Host 'Vlasnik: restart PC, Docker Desktop -> Troubleshoot -> Restart / Clean / Purge data' -ForegroundColor Yellow
Write-Host 'Detalji: .\scripts\docker-disk-help.ps1' -ForegroundColor DarkGray
exit 1
