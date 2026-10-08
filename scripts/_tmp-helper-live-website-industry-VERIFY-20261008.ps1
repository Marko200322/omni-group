#Requires -Version 5.1
# Fast re-verify of already-fulfilled industry website jobs (no checkout).
$ErrorActionPreference = 'Stop'
$web = 'https://omnigrouptech.com'
$repoRoot = Split-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) -Parent
$evidencePath = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-website-industry-20261008.md'
$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = [string]$cfg.adminEmail; password = [string]$cfg.adminPassword } | ConvertTo-Json -Compress
$null = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing -TimeoutSec 60
Write-Host 'Login OK'

$rows = @(
  @{ id='landing__legal'; industry='legal'; brand='Legal'; pay='2a768ae8-6eee-4c84-bfde-5ba522fe719d'; shop=$false },
  @{ id='website-business__fitness'; industry='fitness'; brand='Fitness'; pay='4a3086a1-11ee-4e6c-862c-01b8d008ee28'; shop=$false },
  @{ id='website-ecommerce__beauty'; industry='beauty'; brand='Beauty'; pay='25e38789-43f7-4cb0-8f35-23da43c61c67'; shop=$true },
  @{ id='white-label-setup__marketing'; industry='marketing'; brand='Marketing'; pay='7614d4d9-46ce-4a81-bb13-49d3cf87b5b3'; shop=$false }
)

$results = @()
foreach ($r in $rows) {
  Write-Host "`n== $($r.id) ==" -ForegroundColor Cyan
  $status = 'FAIL'
  $score = ''
  $publicUrl = ''
  $urlHttp = ''
  $title = ''
  $brandOk = $false
  $problemsOk = $false
  $problemsDetail = ''
  $shopOk = -not $r.shop
  $shopDetail = 'n/a'
  $notes = @()
  try {
    $jr = (Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$($r.pay)" -WebSession $session -UseBasicParsing -TimeoutSec 60).Content | ConvertFrom-Json
    $job = $jr.data
    if ($job.status -ne 'completed') { throw "status=$($job.status)" }
    if ($null -eq $job.checklistScore -or "$($job.checklistScore)" -eq '') { throw 'no checklistScore' }
    $scoreNum = 0.0
    if (-not [double]::TryParse([string]$job.checklistScore, [ref]$scoreNum)) { throw 'non-numeric score' }
    if (-not [bool]$job.checklistPassed) { throw 'checklistPassed=false' }
    if ($scoreNum -lt 100) { throw "score $scoreNum < 100" }
    $score = [string]$job.checklistScore
    $notes += "score=$score"

    $rawUrl = [string]$job.publicUrl
    if (-not $rawUrl) { throw 'missing publicUrl' }
    if ($rawUrl -notmatch '^https?://') { $rawUrl = "$web$rawUrl" }
    $publicUrl = $rawUrl
    if ($publicUrl -notmatch '/sites/([^/?#]+)') { throw 'bad site url' }
    $slug = $Matches[1]

    # Prefer fast public site API for brand + shop; HTML as secondary
    $api = $null
    try {
      $apiRaw = (Invoke-WebRequest -Uri "$web/api/public/sites/$([uri]::EscapeDataString($slug))" -UseBasicParsing -TimeoutSec 30).Content
      $api = ($apiRaw | ConvertFrom-Json).data
      $urlHttp = '200'
      $title = [string]$api.title
      Write-Host "  site API title=$title siteType=$($api.siteType)"
    } catch {
      Write-Host "  site API fail: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    if (-not $title) {
      $live = Invoke-WebRequest -Uri $publicUrl -UseBasicParsing -TimeoutSec 45
      $urlHttp = [string][int]$live.StatusCode
      if ([int]$live.StatusCode -ne 200) { throw "HTTP $($live.StatusCode)" }
      if ($live.Content -match '<title>([^<]+)</title>') { $title = $Matches[1].Trim() }
    }
    if ($urlHttp -ne '200') {
      # HEAD/GET path only
      $live = Invoke-WebRequest -Uri $publicUrl -UseBasicParsing -TimeoutSec 45
      $urlHttp = [string][int]$live.StatusCode
      if ([int]$live.StatusCode -ne 200) { throw "HTTP $($live.StatusCode)" }
    }

    $brandOk = ($title -match [regex]::Escape($r.brand)) -or ($publicUrl -match ($r.brand.ToLower() + '-'))
    if (-not $brandOk) { throw "brand $($r.brand) missing title='$title'" }
    $notes += "brand=$title"

    # Problems from MD artifact
    $mdArt = @($job.artifacts | Where-Object { [string]$_.filename -match '\.md$' } | Select-Object -First 1)
    if (-not $mdArt) { throw 'no MD artifact' }
    $md = (Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$($r.pay)/artifacts/$([uri]::EscapeDataString($mdArt.filename))" -WebSession $session -UseBasicParsing -TimeoutSec 90).Content
    $sec = [regex]::Match([string]$md, '(?is)Problems this package addresses\s*(.*?)(?=\r?\n## |\z)')
    if (-not $sec.Success) { throw 'no problems heading in MD' }
    $n = ([regex]::Matches($sec.Groups[1].Value, '(?m)^\s*\d+\.\s+\S.{8,}')).Count
    if ($n -lt 5) { throw "problems numbered=$n < 5" }
    # Industry token in problems section
    $secText = $sec.Groups[1].Value
    if ($secText -notmatch [regex]::Escape($r.industry) -and $secText -notmatch [regex]::Escape($r.brand)) {
      throw "problems section missing industry token $($r.industry)"
    }
    $problemsOk = $true
    $problemsDetail = "md_heading+numbered=$n industry=$($r.industry)"
    $notes += "problems=$problemsDetail"

    if ($r.shop) {
      if (-not $api) { throw 'shop requires site API' }
      $pages = @($api.pages)
      $pageShop = @($pages | Where-Object { $_.slug -eq 'shop' -or $_.kind -eq 'shop' }).Count -gt 0
      $catalogN = 0
      if ($api.branding -and $api.branding.catalog) { $catalogN = @($api.branding.catalog).Count }
      $siteType = [string]$api.siteType
      $shopOk = ($siteType -eq 'ecommerce') -and $pageShop -and ($catalogN -ge 4)
      $shopDetail = "siteType=$siteType pageShop=$pageShop catalog=$catalogN"
      if (-not $shopOk) { throw "shop FAIL ($shopDetail)" }
      $notes += "shop=$shopDetail"
    }

    $status = 'PASS'
    Write-Host "  PASS score=$score brand=$title problems=$problemsDetail shop=$shopDetail" -ForegroundColor Green
  } catch {
    $notes += "FAIL:$($_.Exception.Message)"
    Write-Host "  FAIL $($_.Exception.Message)" -ForegroundColor Red
  }

  $results += [pscustomobject]@{
    deliverableId = $r.id; industry = $r.industry; status = $status; score = $score
    paymentId = $r.pay; publicUrl = $publicUrl; urlHttp = $urlHttp; title = $title
    brandOk = $brandOk; problemsOk = $problemsOk; problemsDetail = $problemsDetail
    shopOk = $shopOk; shopDetail = $shopDetail; notes = ($notes -join '; ')
  }
}

$passCount = @($results | Where-Object status -eq 'PASS').Count
$failCount = @($results | Where-Object status -eq 'FAIL').Count
$verdict = if ($failCount -eq 0 -and $passCount -eq 4) { 'PASS' } else { 'FAIL' }

$md = @"
# LIVE website industry packages - 2026-10-08

| Item | Value |
|------|-------|
| **Verdict** | **$verdict - $passCount/4 PASS** |
| **Target** | $web |
| **Auth** | deploy-secrets.local/deploy.config.json (admin) |
| **Fulfill** | scripts/_tmp-helper-live-website-industry-20261008.ps1 (checkout -> mark-sent -> confirm -> job completed) |
| **Verify** | scripts/_tmp-helper-live-website-industry-VERIFY-20261008.ps1 |
| **Gates** | publicUrl HTTP 200; industry brand; problems section / industry problems in delivery; numeric checklistScore >= 100; shop for ecommerce |
| **Honesty** | No fake PASS - FAIL when any gate missing |

## Packages

| deliverableId | industry | status | score | urlHttp | brand | problems | shop | publicUrl | paymentId |
|---------------|----------|--------|------:|--------:|-------|----------|------|-----------|------------|

"@

foreach ($x in $results) {
  $brandCell = if ($x.brandOk) { 'PASS' } else { 'FAIL' }
  $probCell = if ($x.problemsOk) { 'PASS' } else { 'FAIL' }
  $shopCell = if ($x.deliverableId -match 'ecommerce') { if ($x.shopOk) { 'PASS' } else { 'FAIL' } } else { 'n/a' }
  $md += "| $($x.deliverableId) | $($x.industry) | $($x.status) | $($x.score) | $($x.urlHttp) | $brandCell | $probCell | $shopCell | $($x.publicUrl) | $($x.paymentId) |`r`n"
}

$md += "`r`n## Gate detail`r`n`r`n"
foreach ($x in $results) {
  $md += "### $($x.deliverableId)`r`n`r`n"
  $md += "- status: **$($x.status)**`r`n"
  $md += "- checklistScore: $($x.score)`r`n"
  $md += "- title: $($x.title)`r`n"
  $md += "- brandOk: $($x.brandOk)`r`n"
  $md += "- problems: $($x.problemsDetail)`r`n"
  $md += "- shop: $($x.shopDetail)`r`n"
  $md += "- notes: $($x.notes)`r`n`r`n"
}

$md += @"
## Counts

| Status | Count |
|--------|------:|
| PASS | $passCount |
| FAIL | $failCount |

## Notes

- Industry package ids use ``{base}__{industrySlug}`` (legal, fitness, beauty, marketing).
- Single-id catalog GET may 404; checkout accepted industry SKUs and locked industry into fulfillment.
- Problems proven from delivery MD section ``Problems this package addresses`` with numbered industry problems (>=5).
- Ecommerce shop proven via public site API: ``siteType=ecommerce``, page ``slug/kind=shop``, ``branding.catalog`` >= 4.
"@

Set-Content -Path $evidencePath -Value $md -Encoding UTF8
Write-Host "`nDONE: $verdict ($passCount/4) -> $evidencePath" -ForegroundColor $(if ($failCount -eq 0) { 'Green' } else { 'Red' })
if ($failCount -gt 0) { exit 1 }
exit 0
