<#
.SYNOPSIS
  Pomoc kad AppData\Local\Docker drzi desetine GB (Windows Docker Desktop).

.DESCRIPTION
  docker system/volume prune cesto vraca 0B jer WSL vhdx ne smanjuje sam.
  Ovaj skript pokazuje velicine i korake koje vlasnik radi u Docker Desktop UI.

.EXAMPLE
  .\scripts\docker-disk-help.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Continue'

Write-Host '=== docker-disk-help ===' -ForegroundColor Cyan
Write-Host ''

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)
$color = if ($freeGb -lt 1) { 'Red' } elseif ($freeGb -lt 5) { 'Yellow' } else { 'Green' }
Write-Host ("C: free {0} GB" -f $freeGb) -ForegroundColor $color
Write-Host ''

$dockerRoot = Join-Path $env:LOCALAPPDATA 'Docker'
if (Test-Path $dockerRoot) {
  $mb = [math]::Round((Get-ChildItem -LiteralPath $dockerRoot -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object Length -Sum).Sum / 1MB, 0)
  Write-Host ("AppData Docker: {0} MB" -f $mb) -ForegroundColor $(if ($mb -gt 5000) { 'Red' } else { 'DarkGray' })
  Write-Host "  $dockerRoot" -ForegroundColor DarkGray
  Get-ChildItem -LiteralPath $dockerRoot -Recurse -Filter '*.vhdx' -ErrorAction SilentlyContinue |
    ForEach-Object {
      Write-Host ("  vhdx: {0} ({1:N1} GB)" -f $_.Name, ($_.Length / 1GB)) -ForegroundColor DarkGray
    }
} else {
  Write-Host 'AppData\Local\Docker: nije pronadjen' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Brzi CLI (cesto 0B ako su svi resursi aktivni):' -ForegroundColor Yellow
Write-Host '  docker system prune -af' -ForegroundColor DarkGray
Write-Host '  docker volume prune -f' -ForegroundColor DarkGray
Write-Host ''

Write-Host 'Oslobodi WSL vhdx (vlasnik, preporuceno):' -ForegroundColor Cyan
Write-Host '  1. Zaustavi containere koje ne koristis (Atina stack ako ne dev-ujes sada)' -ForegroundColor DarkGray
Write-Host '  2. Docker Desktop -> Settings -> Troubleshoot -> Clean / Purge data' -ForegroundColor DarkGray
Write-Host '     ili: Remove unused images u Docker Desktop -> Images' -ForegroundColor DarkGray
Write-Host '  3. Posle purge: wsl --shutdown (PowerShell admin opciono)' -ForegroundColor DarkGray
Write-Host '  4. Proveri: .\scripts\disk-report.ps1 (cilj >= 2 GB free)' -ForegroundColor DarkGray
Write-Host ''

Write-Host 'Repo cleanup (ne dira Docker vhdx):' -ForegroundColor Cyan
Write-Host '  .\scripts\free-disk-space.ps1 -CleanTemp' -ForegroundColor DarkGray
Write-Host '  Low disk preflight: .\scripts\staging-preflight.ps1 -SkipAtinaTestCi -SkipDiskCheck -SkipAtinaSmoke' -ForegroundColor DarkGray
Write-Host ''

Write-Host 'Docker servis / engine:' -ForegroundColor Cyan
$svc = Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue
if ($svc) {
  $svcColor = if ($svc.Status -eq 'Running') { 'Green' } else { 'Red' }
  Write-Host ("  com.docker.service: {0} (StartType: {1})" -f $svc.Status, $svc.StartType) -ForegroundColor $svcColor
} else {
  Write-Host '  com.docker.service: nije instaliran' -ForegroundColor DarkGray
}

$engineOk = $false
try {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { $engineOk = $true }
} catch { }

if ($engineOk) {
  Write-Host '  docker engine: OK' -ForegroundColor Green
} else {
  Write-Host '  docker engine: DOWN (npr. "Docker Desktop is unable to start")' -ForegroundColor Red
  Write-Host ''
  Write-Host 'Popravka (vlasnik, redom):' -ForegroundColor Yellow
  Write-Host '  1. Restart racunara (posle oslobadjanja diska)' -ForegroundColor DarkGray
  Write-Host '  2. Pokreni Docker Desktop iz Start menija (ne samo CLI)' -ForegroundColor DarkGray
  Write-Host '  3. Ako i dalje pada: Docker Desktop -> Troubleshoot -> Restart / Clean / Purge data' -ForegroundColor DarkGray
  Write-Host '  4. Admin PowerShell: wsl --shutdown ; Start-Service com.docker.service' -ForegroundColor DarkGray
  Write-Host '  5. Posle engine OK: .\scripts\start-local-stack.ps1' -ForegroundColor DarkGray
  Write-Host '  Auto-pokusaj: .\scripts\docker-repair.ps1' -ForegroundColor DarkGray
  if ($freeGb -lt 5) {
    Write-Host ''
    Write-Host 'NAPOMENA: disk ispod 5 GB cesto sprecava WSL/Docker start.' -ForegroundColor Yellow
  }
}

Write-Host ''
Write-Host 'docker-disk-help: done' -ForegroundColor Green
