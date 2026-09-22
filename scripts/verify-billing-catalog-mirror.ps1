#Requires -Version 5.1
<#
  Ensures web + Atina deliverable-catalog.ts stay identical on anchorEur + slug set.
  Run before deploy when changing prices: .\scripts\verify-billing-catalog-mirror.ps1
#>
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$web = Join-Path $repo 'apps\omnigroup-web\src\lib\deliverable-catalog.ts'
$atina = Join-Path $repo 'atina-platform\atina\src\modules\billing\lib\deliverable-catalog.ts'

function Get-CatalogAnchors([string]$Path) {
  $text = Get-Content $Path -Raw
  $map = @{}
  [regex]::Matches($text, "id:\s*'([^']+)'[^}]*?anchorEur:\s*(\d+)") | ForEach-Object {
    $map[$_.Groups[1].Value] = [int]$_.Groups[2].Value
  }
  return $map
}

$w = Get-CatalogAnchors $web
$a = Get-CatalogAnchors $atina
$fail = $false

foreach ($slug in ($w.Keys | Sort-Object)) {
  if (-not $a.ContainsKey($slug)) {
    Write-Host "FAIL missing in Atina: $slug" -ForegroundColor Red
    $fail = $true
    continue
  }
  if ($w[$slug] -ne $a[$slug]) {
    Write-Host "FAIL anchor drift $slug web=$($w[$slug]) atina=$($a[$slug])" -ForegroundColor Red
    $fail = $true
  }
}

foreach ($slug in ($a.Keys | Sort-Object)) {
  if (-not $w.ContainsKey($slug)) {
    Write-Host "FAIL missing in web: $slug" -ForegroundColor Red
    $fail = $true
  }
}

if ($fail) {
  Write-Host "Catalog mirror verify FAILED ($($w.Count) web / $($a.Count) atina slugs)" -ForegroundColor Red
  exit 1
}

Write-Host "PASS deliverable-catalog mirror ($($w.Count) packages, anchors match)" -ForegroundColor Green
