<#
.SYNOPSIS
  Pregled velikih foldera u repou i slobodnog prostora na C:.

.EXAMPLE
  .\scripts\disk-report.ps1
#>
#Requires -Version 5.1
param(
  [int]$TopN = 12
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)
$color = if ($freeGb -lt 1) { 'Red' } elseif ($freeGb -lt 2) { 'Yellow' } else { 'Green' }

Write-Host '=== disk-report ===' -ForegroundColor Cyan
Write-Host ("C: free {0} GB" -f $freeGb) -ForegroundColor $color
Write-Host ''

$candidates = @(
  'atina-platform\atina\node_modules',
  'atina-platform\atina\coverage',
  'atina-platform\atina\dist',
  'atina-platform\atina\jest-results.json',
  'apps\omnigroup-web\node_modules',
  'apps\omnigroup-web\.next',
  'apps\omnigroup-web\node_modules\.cache',
  'atina-system\node_modules',
  'atina-system\dist',
  'node_modules',
  '.pytest_cache',
  "$env:LOCALAPPDATA\npm-cache"
)

$rows = @()
foreach ($rel in $candidates) {
  $p = if ([System.IO.Path]::IsPathRooted($rel)) { $rel } else { Join-Path $repoRoot $rel }
  if (-not (Test-Path $p)) { continue }
  $item = Get-Item -LiteralPath $p
  if ($item.PSIsContainer) {
    $bytes = (Get-ChildItem -LiteralPath $p -Recurse -File -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum).Sum
  } else {
    $bytes = $item.Length
  }
  $rows += [pscustomobject]@{ Path = $rel; MB = [math]::Round($bytes / 1MB, 1) }
}

foreach ($row in ($rows | Sort-Object MB -Descending | Select-Object -First $TopN)) {
  Write-Host ("  {0,-45} {1,8:N1} MB" -f $row.Path, $row.MB)
}

Write-Host ''
Write-Host 'Cleanup: .\scripts\free-disk-space.ps1 -SkipDocker -CleanTemp' -ForegroundColor DarkGray
Write-Host 'Low disk: staging-preflight -SkipAtinaTestCi -SkipDiskCheck (posle owner-smoke-all).' -ForegroundColor DarkGray
