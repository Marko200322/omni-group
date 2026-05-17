<#
.SYNOPSIS
  Pregled diska C: i najvećih foldera (repo + Temp/Downloads).

.EXAMPLE
  .\scripts\disk-report.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Continue'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

function Folder-SizeMb {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return 0 }
  try {
    return [math]::Round((Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
  } catch { return 0 }
}

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)
$color = if ($freeGb -lt 1) { 'Red' } elseif ($freeGb -lt 5) { 'Yellow' } else { 'Green' }

Write-Host '=== disk-report ===' -ForegroundColor Cyan
Write-Host "C: free ${freeGb} GB (cilj >=5 GB za npm ci)" -ForegroundColor $color
Write-Host ''

Write-Host 'Repo root (MB):' -ForegroundColor Cyan
Get-ChildItem -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  [PSCustomObject]@{ Folder = $_.Name; MB = (Folder-SizeMb $_.FullName) }
} | Sort-Object MB -Descending | Select-Object -First 10 | ForEach-Object {
  Write-Host ("  {0,-22} {1,8} MB" -f $_.Folder, $_.MB) -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'node_modules u monorepu:' -ForegroundColor Cyan
Get-ChildItem -Path $repoRoot -Directory -Recurse -Filter 'node_modules' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch 'node_modules\\.*\\node_modules' } |
  ForEach-Object {
    [PSCustomObject]@{ Path = $_.FullName.Replace($repoRoot + '\', ''); MB = (Folder-SizeMb $_.FullName) }
  } | Sort-Object MB -Descending | Select-Object -First 6 | ForEach-Object {
    Write-Host ("  {0,-50} {1,8} MB" -f $_.Path, $_.MB) -ForegroundColor DarkGray
  }

Write-Host ''
Write-Host 'Korisnicki folderi:' -ForegroundColor Cyan
foreach ($p in @(
  @{ Label = 'TEMP'; Path = $env:TEMP },
  @{ Label = 'Downloads'; Path = (Join-Path $env:USERPROFILE 'Downloads') },
  @{ Label = 'npm cache'; Path = (npm.cmd config get cache 2>$null | Out-String).Trim() }
)) {
  if ($p.Path -and (Test-Path $p.Path)) {
    Write-Host ("  {0,-12} {1,8} MB  {2}" -f $p.Label, (Folder-SizeMb $p.Path), $p.Path) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Akcije:' -ForegroundColor Cyan
Write-Host '  .\scripts\free-disk-space.ps1 -CleanTemp -SkipNext   (dev serveri mogu ostati)' -ForegroundColor DarkGray
Write-Host '  .\scripts\free-disk-space.ps1                       (puno, zaustavi web pre)' -ForegroundColor DarkGray
Write-Host '  Isprazni Recycle Bin i Downloads rucno' -ForegroundColor DarkGray
