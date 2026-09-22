#Requires -Version 5.1
<#
  Fast prod gate: 50 industries x 20 packages via public BFF/API (no checkout).
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$ApiBase = 'https://api.omnigrouptech.com',
  [int]$ExpectedPackages = 20,
  [int]$MinCategories = 50
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$api = $ApiBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'fulfillment-catalog-packages.ps1')

$fail = 0
function Write-AssertResult {
  param([bool]$Ok, [string]$Name, [string]$Detail)
  if ($Ok) {
    Write-Host "PASS $Name - $Detail" -ForegroundColor Green
  } else {
    Write-Host "FAIL $Name - $Detail" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host '== Industry x package matrix verify ==' -ForegroundColor Cyan
Write-Host "Web=$web Api=$api ExpectedPackages=$ExpectedPackages"

$catRaw = (Invoke-WebRequest -Uri "$web/api/atina/billing/industry-catalog" -UseBasicParsing -TimeoutSec 90).Content | ConvertFrom-Json
$cats = @()
if ($catRaw.data.categories) { $cats = @($catRaw.data.categories) }
elseif ($catRaw.categories) { $cats = @($catRaw.categories) }
$slugs = @($cats | ForEach-Object { [string]$_.slug } | Where-Object { $_ } | Select-Object -Unique)
Write-AssertResult ($slugs.Count -ge $MinCategories) 'Industry categories' ("count={0}" -f $slugs.Count)

$delRaw = (Invoke-WebRequest -Uri "$api/api/v1/billing/deliverables" -UseBasicParsing -TimeoutSec 60).Content | ConvertFrom-Json
$delCount = 0
if ($delRaw.data) { $delCount = @($delRaw.data).Count }
elseif ($delRaw.deliverables) { $delCount = @($delRaw.deliverables).Count }
Write-AssertResult ($delCount -eq $ExpectedPackages) 'Deliverables catalog' ("count={0}" -f $delCount)

$bad = @()
foreach ($slug in $slugs) {
  $url = "$web/api/atina/billing/package-matrix?industryCategory=$([uri]::EscapeDataString($slug))"
  try {
    $j = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 45).Content | ConvertFrom-Json
    $pkgs = @()
    if ($j.data.packages) { $pkgs = @($j.data.packages) }
    elseif ($j.packages) { $pkgs = @($j.packages) }
    if ($pkgs.Count -ne $ExpectedPackages) {
      $bad += '{0}:{1}' -f $slug, $pkgs.Count
    }
  } catch {
    $bad += '{0}:error' -f $slug
  }
}

$matrixDetail = if ($bad.Count -eq 0) {
  '{0} industries x {1} packages OK' -f $slugs.Count, $ExpectedPackages
} else {
  'failures: {0}' -f (($bad | Select-Object -First 8) -join ', ')
}
Write-AssertResult ($bad.Count -eq 0) 'Matrix 20xN' $matrixDetail

$expectedIds = @($script:FulfillmentCatalogPackages | Sort-Object)
$sample = $slugs | Select-Object -First 1
if ($sample) {
  $mj = (Invoke-WebRequest -Uri "$web/api/atina/billing/package-matrix?industryCategory=$sample" -UseBasicParsing).Content | ConvertFrom-Json
  $ids = @($mj.data.packages | ForEach-Object { $_.deliverableId } | Sort-Object)
  $same = ($ids -join ',') -eq ($expectedIds -join ',')
  Write-AssertResult $same 'Matrix SKU set' ("sample={0}" -f $sample)
}

if ($fail -gt 0) { exit 1 }
Write-Host "ALL PASS ($($slugs.Count)*$ExpectedPackages catalog cells)" -ForegroundColor Green
exit 0
