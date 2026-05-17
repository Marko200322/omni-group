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
  [switch]$SkipNext
)

$ErrorActionPreference = 'Continue'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir

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
  (Join-Path $repoRoot 'atina-system\dist'),
  (Join-Path $repoRoot 'apps\omnigroup-web\node_modules\.cache'),
  (Join-Path $repoRoot 'atina-platform\atina\node_modules\.cache'),
  (Join-Path $repoRoot 'atina-system\node_modules\.cache'),
  (Join-Path $repoRoot 'node_modules\.cache')
)
if (-not $SkipNext) {
  $paths += (Join-Path $repoRoot 'apps\omnigroup-web\.next')
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
}

Write-Host 'After:' -ForegroundColor Cyan
Show-Free
Write-Host 'free-disk-space: done' -ForegroundColor Green
