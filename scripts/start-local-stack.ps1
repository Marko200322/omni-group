<#
.SYNOPSIS
  Podigne lokalni Omni Group stack: Docker (Postgres+Redis) → Atina API → opciono web dev.

.DESCRIPTION
  Za Windows / PowerShell. Koristi npm.cmd (radi i kad je npm.ps1 blokiran).
  Infra defaulti: config/env-aggregator.json
  Agregatori (opciono): atina-platform/atina/.env

.EXAMPLE
  .\scripts\start-local-stack.ps1
.EXAMPLE
  .\scripts\start-local-stack.ps1 -SkipWeb
#>
#Requires -Version 5.1
param(
  [switch]$SkipWeb,
  [switch]$SkipBootstrap
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

function Test-DockerReady {
  docker info *> $null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-DockerReady)) {
  $dockerExe = @(
    "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($dockerExe) {
    Write-Host 'Pokrećem Docker Desktop...' -ForegroundColor Yellow
    Start-Process -FilePath $dockerExe
    $ok = $false
    for ($i = 1; $i -le 40; $i++) {
      if (Test-DockerReady) { $ok = $true; break }
      Start-Sleep -Seconds 3
    }
    if (-not $ok) { throw 'Docker Desktop nije spreman posle ~2 min. Uključi ga ručno i ponovi.' }
  } else {
    throw 'Docker Desktop nije instaliran. Instaliraj ga pre Atina API-ja.'
  }
}

Write-Host '== Atina: db + migrate + seed ==' -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'atina-platform\atina')
if (-not $SkipBootstrap) {
  npm.cmd run db:up
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  npm.cmd run docker:migrate
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  npm.cmd run docker:seed
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
}

Write-Host '== Atina: dev server (:3000) ==' -ForegroundColor Cyan
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm.cmd run dev' -WorkingDirectory (Get-Location) -WindowStyle Minimized

for ($i = 1; $i -le 30; $i++) {
  try {
    $h = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/health' -UseBasicParsing -TimeoutSec 5
    if ($h.StatusCode -eq 200) { Write-Host "Atina health OK (attempt $i)" -ForegroundColor Green; break }
  } catch {
    if ($i -eq 30) { throw 'Atina /health nije dostupan posle 30 pokušaja.' }
    Start-Sleep -Seconds 2
  }
}
Pop-Location

if (-not $SkipWeb) {
  $webDir = Join-Path $repoRoot 'apps\omnigroup-web'
  $envLocal = Join-Path $webDir '.env.local'
  if (-not (Test-Path $envLocal)) {
    Copy-Item (Join-Path $webDir '.env.example') $envLocal
    Write-Host 'Kreiran apps/omnigroup-web/.env.local iz .env.example' -ForegroundColor Yellow
  }
  Write-Host '== Web: dev server (:3010) ==' -ForegroundColor Cyan
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm.cmd run dev:clean' -WorkingDirectory $webDir -WindowStyle Minimized
  for ($i = 1; $i -le 30; $i++) {
    try {
      $w = Invoke-WebRequest -Uri 'http://127.0.0.1:3010/api/health' -UseBasicParsing -TimeoutSec 5
      if ($w.StatusCode -eq 200) { Write-Host "Web health OK (attempt $i)" -ForegroundColor Green; break }
    } catch {
      if ($i -eq 30) { Write-Host 'Web još nije spreman — pokreni ručno: cd apps\omnigroup-web; npm.cmd run dev:clean' -ForegroundColor Yellow }
      Start-Sleep -Seconds 2
    }
  }
}

Write-Host ''
Write-Host '=== start-local-stack: gotovo ===' -ForegroundColor Green
Write-Host 'Web:   http://localhost:3010' -ForegroundColor DarkGray
Write-Host 'Atina: http://localhost:3000/health' -ForegroundColor DarkGray
Write-Host 'Login: admin@atina.io / Admin@123456 (config/env-aggregator.json)' -ForegroundColor DarkGray
Write-Host 'Smoke: powershell -ExecutionPolicy Bypass -File .\scripts\smoke-web-integration.ps1' -ForegroundColor DarkGray
Write-Host 'Agregatori: powershell -ExecutionPolicy Bypass -File .\scripts\check-atina-aggregators.ps1' -ForegroundColor DarkGray
