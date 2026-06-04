<#
.SYNOPSIS
  Bezbedno oslobađanje prostora za lokalni dev (npm, build artefakti, Docker).

.EXAMPLE
  .\scripts\free-disk-space.ps1
.EXAMPLE
  .\scripts\free-disk-space.ps1 -SkipDocker
#>
#Requires -Version 5.1
param(
  [switch]$SkipDocker,
  [switch]$SkipNext,
  [switch]$CleanTemp,
  [switch]$ForceWebCache
)

$ErrorActionPreference = 'Continue'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$webDevPort = 3010

function Test-WebDevRunning {
  $conn = Get-NetTCPConnection -LocalPort $webDevPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return [bool]$conn
}

function Show-Free {
  $d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  Write-Host ("C: free {0:N2} GB" -f ($d.FreeSpace / 1GB)) -ForegroundColor DarkGray
}

Write-Host 'Before:' -ForegroundColor Cyan
Show-Free

npm.cmd cache clean --force 2>$null

$paths = @(
  (Join-Path $repoRoot 'atina-platform\atina\coverage'),
  (Join-Path $repoRoot 'atina-platform\atina\dist'),
  (Join-Path $repoRoot 'atina-platform\atina\jest-results.json'),
  (Join-Path $repoRoot 'atina-system\dist'),
  (Join-Path $repoRoot 'apps\omnigroup-web\node_modules\.cache'),
  (Join-Path $repoRoot 'atina-platform\atina\node_modules\.cache'),
  (Join-Path $repoRoot 'atina-system\node_modules\.cache'),
  (Join-Path $repoRoot 'node_modules\.cache'),
  (Join-Path $repoRoot '.pytest_cache')
)
if ($env:LOCALAPPDATA) {
  $paths += (Join-Path $env:LOCALAPPDATA 'npm-cache')
}
if (-not $SkipNext) {
  $paths += (Join-Path $repoRoot 'apps\omnigroup-web\.next')
}

$webDevUp = Test-WebDevRunning
if ($webDevUp -and -not $ForceWebCache) {
  $webCache = Join-Path $repoRoot 'apps\omnigroup-web\node_modules\.cache'
  $before = $paths.Count
  $paths = @($paths | Where-Object { $_ -ne $webCache })
  if (-not $SkipNext) {
    $nextDir = Join-Path $repoRoot 'apps\omnigroup-web\.next'
    $paths = @($paths | Where-Object { $_ -ne $nextDir })
  }
  if ($paths.Count -lt $before) {
    Write-Host ("NAPOMENA: web dev slusa na :{0} - preskocen Next cache/.next (koristi -ForceWebCache ili restart-web-dev.ps1 posle)" -f $webDevPort) -ForegroundColor Yellow
  }
}

foreach ($p in $paths) {
  if (Test-Path $p) {
    $sizeMb = 0
    try {
      $sizeMb = [math]::Round((Get-ChildItem -LiteralPath $p -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
    } catch { }
    Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
    if ($sizeMb -gt 0) {
      Write-Host "removed $p (${sizeMb} MB)"
    } else {
      Write-Host "removed $p"
    }
  }
}

if (-not $SkipDocker) {
  docker system prune -f 2>$null
  docker volume prune -f 2>$null
}

if ($CleanTemp -and $env:TEMP -and (Test-Path $env:TEMP)) {
  $removed = 0
  Get-ChildItem -LiteralPath $env:TEMP -Force -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
      $removed++
    } catch { }
  }
  Write-Host "cleaned TEMP ($removed stavki u $env:TEMP)"
}

Write-Host 'After:' -ForegroundColor Cyan
Show-Free
Write-Host 'free-disk-space: done' -ForegroundColor Green
