<#
.SYNOPSIS
  Agresivno čišćenje diska — keš, temp, Docker WSL vhdx (repurposes ~37 GB).

  Briše: .tmp, TMP~1, build keš, npm cache, Docker docker_data.vhdx (sve slike/volumeni).
  NE briše: izvorni kod, .env, node_modules (osim .cache), git.

.EXAMPLE
  .\scripts\aggressive-disk-cleanup.ps1
  .\scripts\aggressive-disk-cleanup.ps1 -SkipDockerPurge
#>
#Requires -Version 5.1
param(
  [switch]$SkipDockerPurge
)

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot

function Show-Free([string]$label) {
  $d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  $gb = [math]::Round($d.FreeSpace / 1GB, 2)
  Write-Host "$label C: free ${gb} GB" -ForegroundColor $(if ($gb -lt 1) { 'Red' } elseif ($gb -lt 5) { 'Yellow' } else { 'Green' })
}

function Remove-Tree([string]$path, [string]$label) {
  if (-not (Test-Path $path)) { return 0 }
  $mb = 0
  try {
    $mb = [math]::Round((Get-ChildItem -LiteralPath $path -Recurse -File -ErrorAction SilentlyContinue |
      Measure-Object Length -Sum).Sum / 1MB, 1)
  } catch { }
  try {
    Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
  } catch {
    cmd /c "rd /s /q `"$path`"" 2>$null
  }
  Write-Host "  removed $label (${mb} MB)" -ForegroundColor DarkGray
  return $mb
}

Write-Host '=== aggressive-disk-cleanup ===' -ForegroundColor Cyan
Show-Free 'Before:'

Write-Host 'Repo temp + keš:' -ForegroundColor Yellow
$repoPaths = @(
  '.tmp', 'TMP~1', '.npm-cache',
  'apps\omnigroup-web\.next',
  'apps\omnigroup-web\node_modules\.cache',
  'atina-platform\atina\node_modules\.cache',
  'atina-platform\atina\dist',
  'atina-platform\atina\coverage',
  'atina-platform\atina\jest-results.json',
  'atina-system\dist',
  'atina-system\node_modules\.cache',
  'node_modules\.cache',
  '.pytest_cache'
)
foreach ($rel in $repoPaths) {
  Remove-Tree (Join-Path $repoRoot $rel) $rel | Out-Null
}

npm.cmd cache clean --force 2>$null
if ($env:LOCALAPPDATA) {
  Remove-Tree (Join-Path $env:LOCALAPPDATA 'npm-cache') 'AppData\npm-cache' | Out-Null
}

if ($env:TEMP -and (Test-Path $env:TEMP)) {
  $n = 0
  Get-ChildItem -LiteralPath $env:TEMP -Force -ErrorAction SilentlyContinue | ForEach-Object {
    try { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop; $n++ } catch { }
  }
  Write-Host "  cleaned TEMP ($n stavki)" -ForegroundColor DarkGray
}

if (-not $SkipDockerPurge) {
  Write-Host 'Docker WSL purge (~37 GB):' -ForegroundColor Yellow
  @('Docker Desktop', 'com.docker.backend', 'com.docker.service', 'docker') | ForEach-Object {
    Get-Process -Name $_ -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 3
  wsl --shutdown 2>$null
  Start-Sleep -Seconds 2
  $vhdx = Join-Path $env:LOCALAPPDATA 'Docker\wsl\disk\docker_data.vhdx'
  if (Test-Path $vhdx) {
    $gb = [math]::Round((Get-Item -LiteralPath $vhdx).Length / 1GB, 1)
    Remove-Item -LiteralPath $vhdx -Force -ErrorAction SilentlyContinue
    Write-Host "  removed docker_data.vhdx (${gb} GB)" -ForegroundColor DarkGray
  }
  docker system prune -af 2>$null
}

Show-Free 'After:'
Write-Host ''
Write-Host 'Sačuvano: kod, .env, node_modules, git.' -ForegroundColor Green
Write-Host 'Docker: sledeći start Docker Desktop kreira prazan disk (migrate/seed ponovo).' -ForegroundColor Yellow
Write-Host 'Testovi: .\scripts\restart-docker-stack.ps1 pa .\scripts\local-test-all.ps1' -ForegroundColor Cyan
