#Requires -Version 5.1
<#
  LIVE fulfill + prove website industry packages on prod.
  Evidence: docs/evidence/_tmp-helper-live-website-industry-20261008.md
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [int]$PollSec = 240,
  [int]$SleepBetweenSec = 12,
  [int]$RateLimitMaxAttempts = 12,
  # Optional: skip checkout and only re-verify existing paymentIds (same order as $packages)
  [string[]]$VerifyPaymentIds = @()
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$evidencePath = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-website-industry-20261008.md'
$cfgPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
if (-not (Test-Path $cfgPath)) { throw "Missing $cfgPath" }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($pass)) {
  throw 'adminEmail/adminPassword missing in deploy.config.json'
}

# Package ids must match industry-package-id: {base}__{industrySlug}
$packages = @(
  @{ id = 'landing__legal'; industry = 'legal'; brandHint = 'Legal'; expectShop = $false; minScore = 100 },
  @{ id = 'website-business__fitness'; industry = 'fitness'; brandHint = 'Fitness'; expectShop = $false; minScore = 100 },
  @{ id = 'website-ecommerce__beauty'; industry = 'beauty'; brandHint = 'Beauty'; expectShop = $true; minScore = 100 },
  @{ id = 'white-label-setup__marketing'; industry = 'marketing'; brandHint = 'Marketing'; expectShop = $false; minScore = 100 }
)

function Get-CsrfHeaders {
  param($Session, [string]$Base)
  $c = $Session.Cookies.GetCookies($Base) | Where-Object { $_.Name -eq 'og_csrf' } | Select-Object -First 1
  if (-not $c) { throw 'Missing og_csrf cookie - login/session invalid' }
  return @{ 'x-csrf-token' = $c.Value }
}

function Test-FiniteScore([object]$Raw) {
  if ($null -eq $Raw -or "$Raw" -eq '') { return $false }
  $n = 0.0
  return [double]::TryParse([string]$Raw, [ref]$n)
}

function Get-BaseId([string]$Id) {
  $idx = $Id.IndexOf('__')
  if ($idx -le 0) { return $Id }
  return $Id.Substring(0, $idx)
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -MaxAttempts $RateLimitMaxAttempts -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'Login failed' }
Write-Host "Login OK ($email)" -ForegroundColor Green

if ($VerifyPaymentIds.Count -eq 0) {
  Write-Host 'Catalog spot-check (checkout path will prove SKU)...' -ForegroundColor Cyan
} else {
  Write-Host "Verify-only mode: $($VerifyPaymentIds.Count) paymentIds" -ForegroundColor Cyan
}

$results = New-Object System.Collections.Generic.List[object]
$i = 0
foreach ($p in $packages) {
  $i++
  $pkg = $p.id
  $industry = $p.industry
  $baseId = Get-BaseId $pkg
  Write-Host ''
  Write-Host "[$i/$($packages.Count)] -- $pkg (industry=$industry) --" -ForegroundColor DarkCyan

  $status = 'FAIL'
  $score = ''
  $paymentId = ''
  $publicUrl = ''
  $title = ''
  $brandOk = $false
  $problemsOk = $false
  $problemsDetail = ''
  $shopOk = -not $p.expectShop
  $shopDetail = if ($p.expectShop) { 'pending' } else { 'n/a' }
  $urlHttp = ''
  $notes = New-Object System.Collections.Generic.List[string]
  $sw = [Diagnostics.Stopwatch]::StartNew()

  try {
    $job = $null
    if ($VerifyPaymentIds.Count -ge $i) {
      $paymentId = [string]$VerifyPaymentIds[$i - 1]
      [void]$notes.Add("paymentId=$paymentId")
      [void]$notes.Add('mode=verify-only')
      Write-Host "  verify-only paymentId=$paymentId"
      $jr = (Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$paymentId" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
      $job = $jr.data
    } else {
      $dq = (@{
        deliverableId = $pkg
        industryCategory = $industry
        paymentProvider = 'manual'
      } | ConvertTo-Json -Compress)

      $dco = Invoke-WithRateLimitRetry -Label "checkout-$pkg" -MaxAttempts $RateLimitMaxAttempts -Action {
        $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
          -ContentType 'application/json' -Body $dq -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
        return ($r.Content | ConvertFrom-Json)
      }
      if (-not $dco.ok) { throw "checkout failed: $($dco | ConvertTo-Json -Compress)" }
      $paymentId = [string]$dco.data.paymentId
      [void]$notes.Add("paymentId=$paymentId")
      Write-Host "  paymentId=$paymentId"

      Invoke-WithRateLimitRetry -Label "mark-sent-$pkg" -MaxAttempts $RateLimitMaxAttempts -Action {
        Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST `
          -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
      } | Out-Null

      Invoke-WithRateLimitRetry -Label "confirm-$pkg" -MaxAttempts $RateLimitMaxAttempts -Action {
        Invoke-WebRequest -Uri "$web/api/atina/payments/manual/confirm/$paymentId" -Method POST `
          -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
      } | Out-Null

      $deadline = (Get-Date).AddSeconds($PollSec)
      while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 4
        $jr = (Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$paymentId" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
        $job = $jr.data
        if ($job -and $job.status -in @('completed', 'failed')) { break }
      }
    }
    if (-not $job) { throw 'No fulfillment job' }
    if ($job.status -eq 'failed') { throw "Fulfillment failed: $($job.error)" }
    if ($job.status -ne 'completed') { throw "Timeout status=$($job.status)" }

    # Checklist score
    if (-not (Test-FiniteScore $job.checklistScore)) {
      throw 'checklistScore missing/non-numeric - refusing fake PASS'
    }
    $scoreNum = [double]$job.checklistScore
    $score = [string]$job.checklistScore
    if (-not [bool]$job.checklistPassed) {
      throw "checklistPassed=false score=$score"
    }
    if ($scoreNum -lt [double]$p.minScore) {
      throw "checklistScore $score < gate $($p.minScore)"
    }
    [void]$notes.Add("score=$score")

    # publicUrl HTTP 200
    $rawUrl = ''
    if ($job.publicUrl) { $rawUrl = [string]$job.publicUrl }
    elseif ($job.result -and $job.result.publicUrl) { $rawUrl = [string]$job.result.publicUrl }
    if (-not $rawUrl) { throw 'Missing publicUrl on website/industry package' }
    if ($rawUrl -notmatch '^https?://') { $rawUrl = "$web$rawUrl" }
    $publicUrl = $rawUrl
    $live = Invoke-WebRequest -Uri $publicUrl -UseBasicParsing -TimeoutSec 60
    $urlHttp = [string][int]$live.StatusCode
    if ([int]$live.StatusCode -ne 200) { throw "publicUrl HTTP $($live.StatusCode)" }
    if (-not $live.Content -or $live.RawContentLength -lt 500) {
      throw ("publicUrl body too thin ({0}B)" -f $live.RawContentLength)
    }
    $title = if ($live.Content -match '<title>([^<]+)</title>') { $Matches[1].Trim() } else { '' }
    if ($title -match 'System Admin|Omni Group|omnigroup' ) {
      throw "Omni chrome / System Admin title: $title"
    }

    # Industry brand
    $brandHint = [string]$p.brandHint
    $bodyLower = [string]$live.Content
    $titleOk = $title -match [regex]::Escape($brandHint)
    $metaBrand = ''
    if ($job.fulfillmentMeta -and $job.fulfillmentMeta.brandTitle) { $metaBrand = [string]$job.fulfillmentMeta.brandTitle }
    elseif ($job.result -and $job.result.metadata -and $job.result.metadata.brandTitle) { $metaBrand = [string]$job.result.metadata.brandTitle }
    elseif ($job.metadata -and $job.metadata.brandTitle) { $metaBrand = [string]$job.metadata.brandTitle }
    $metaOk = $metaBrand -match [regex]::Escape($brandHint)
    $slugOk = $publicUrl -match ($brandHint.ToLower() + '-')
    $brandOk = $titleOk -or $metaOk -or $slugOk
    if (-not $brandOk) {
      # Also accept "{Industry} Studio|Store" in body snippet
      if ($bodyLower -match ("(?i){0}\s+(Studio|Store)" -f [regex]::Escape($brandHint))) { $brandOk = $true }
    }
    if (-not $brandOk) {
      throw "Industry brand '$brandHint' not found (title='$title' meta='$metaBrand' url=$publicUrl)"
    }
    [void]$notes.Add("brand=$brandHint ok title='$title' meta='$metaBrand'")

    # Problems section / industry problems in delivery
    $problemsCovered = @()
    $embedded = $false
    $meta = $null
    if ($job.fulfillmentMeta) { $meta = $job.fulfillmentMeta }
    elseif ($job.result -and $job.result.metadata) { $meta = $job.result.metadata }
    elseif ($job.metadata) { $meta = $job.metadata }
    if ($meta) {
      if ($meta.problemsCovered) { $problemsCovered = @($meta.problemsCovered) }
      if ("$($meta.problemsEmbeddedInDoc)" -eq 'True' -or $meta.problemsEmbeddedInDoc -eq $true) { $embedded = $true }
    }
    $mdText = ''
    $mdArts = @()
    if ($job.artifacts) {
      $mdArts = @($job.artifacts | Where-Object { [string]$_.filename -match '\.md$' })
    }
    if ($mdArts.Count -gt 0) {
      $mdName = [string]$mdArts[0].filename
      $mdUrl = "$web/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$([uri]::EscapeDataString($mdName))"
      $mdResp = Invoke-WebRequest -Uri $mdUrl -WebSession $session -UseBasicParsing -TimeoutSec 120
      $mdText = [string]$mdResp.Content
    }
    $hasProblemsHeading = $mdText -match 'Problems this package addresses|Industry problems|problems this package'
    $problemHits = 0
    foreach ($pr in $problemsCovered) {
      $snip = ([string]$pr).Substring(0, [Math]::Min(24, ([string]$pr).Length))
      if ($snip.Length -ge 8 -and $mdText -match [regex]::Escape($snip)) { $problemHits++ }
    }
    # Delivery packs use numbered lists (1. ...), not only markdown bullets.
    $sectionText = ''
    $secMatch = [regex]::Match($mdText, '(?is)Problems this package addresses\s*(.*?)(?=\r?\n## |\z)')
    if ($secMatch.Success) { $sectionText = $secMatch.Groups[1].Value }
    $numberedInSection = 0
    if ($sectionText) {
      $numberedInSection = ([regex]::Matches($sectionText, '(?m)^\s*\d+\.\s+\S.{8,}')).Count
    }
    $bulletish = ([regex]::Matches($mdText, '(?m)^\s*[-*]\s+\S.{10,}')).Count
    $countOk = ($problemsCovered.Count -ge 5) -or ($numberedInSection -ge 5)
    $problemsOk = $hasProblemsHeading -and $countOk -and ($embedded -or $numberedInSection -ge 5 -or $problemHits -ge 5 -or $bulletish -ge 5)
    if ($numberedInSection -ge 5 -and $hasProblemsHeading) {
      $problemsOk = $true
      $problemsDetail = "md_heading+numbered=$numberedInSection industry=$industry"
    }
    if (-not $problemsDetail) {
      $problemsDetail = "covered=$($problemsCovered.Count) embedded=$embedded heading=$hasProblemsHeading hits=$problemHits numbered=$numberedInSection"
    }
    if (-not $problemsOk) {
      throw "Problems gate FAIL ($problemsDetail)"
    }
    [void]$notes.Add("problems=$problemsDetail")

    # Shop for ecommerce
    if ($p.expectShop) {
      $hasShopMeta = $false
      if ($meta -and ("$($meta.hasShopPage)" -eq 'True' -or $meta.hasShopPage -eq $true)) { $hasShopMeta = $true }
      $pageSlugs = @()
      if ($meta -and $meta.pageSlugs) { $pageSlugs = @($meta.pageSlugs) }
      $slugShop = @($pageSlugs | Where-Object { $_ -match 'shop' }).Count -gt 0
      $bodyShop = $bodyLower -match '(?i)shop|cart|add to cart|catalog'
      # Public site API probe (catalog lives under branding.catalog)
      $apiShop = $false
      $siteApiDetail = ''
      if ($publicUrl -match '/sites/([^/?#]+)') {
        $siteSlug = $Matches[1]
        try {
          $siteApiUrl = "$web/api/public/sites/$([uri]::EscapeDataString($siteSlug))"
          $sa = Invoke-WebRequest -Uri $siteApiUrl -UseBasicParsing -TimeoutSec 30
          $saj = $sa.Content | ConvertFrom-Json
          $data = $null
          if ($saj.data) { $data = $saj.data } else { $data = $saj }
          $siteType = if ($data.siteType) { [string]$data.siteType } else { '' }
          $pages = @()
          if ($data.pages) { $pages = @($data.pages) }
          $pageShop = @($pages | Where-Object {
            $ps = if ($_.slug) { [string]$_.slug } else { '' }
            $pk = if ($_.kind) { [string]$_.kind } else { '' }
            $ps -eq 'shop' -or $pk -eq 'shop' -or $ps -match 'shop'
          }).Count -gt 0
          $catalogN = 0
          if ($data.branding -and $data.branding.catalog) { $catalogN = @($data.branding.catalog).Count }
          elseif ($data.catalog) { $catalogN = @($data.catalog).Count }
          $apiShop = ($siteType -eq 'ecommerce') -and ($pageShop -or $catalogN -ge 4)
          $siteApiDetail = "siteType=$siteType pages=$($pages.Count) catalog=$catalogN pageShop=$pageShop"
        } catch {
          $siteApiDetail = "siteApiErr=$($_.Exception.Message)"
        }
      }
      $shopOk = $apiShop -or (($hasShopMeta -or $slugShop) -and $bodyShop)
      $shopDetail = "metaShop=$hasShopMeta slugShop=$slugShop bodyShop=$bodyShop api=($siteApiDetail)"
      if (-not $shopOk) { throw "Shop gate FAIL ($shopDetail)" }
      [void]$notes.Add("shop=$shopDetail")
    }

    $status = 'PASS'
    Write-Host "  PASS score=$score url=$publicUrl title=$title" -ForegroundColor Green
  } catch {
    $err = $_.Exception.Message -replace '[\r\n]+', ' '
    [void]$notes.Add("FAIL:$err")
    Write-Host "  FAIL $err" -ForegroundColor Red
  }

  $sw.Stop()
  [void]$results.Add([pscustomobject]@{
    deliverableId   = $pkg
    industry        = $industry
    status          = $status
    score           = $score
    paymentId       = $paymentId
    publicUrl       = $publicUrl
    urlHttp         = $urlHttp
    title           = $title
    brandOk         = $brandOk
    problemsOk      = $problemsOk
    problemsDetail  = $problemsDetail
    shopOk          = $shopOk
    shopDetail      = $shopDetail
    elapsedSec      = [int]$sw.Elapsed.TotalSeconds
    notes           = ($notes -join '; ')
  })

  if ($SleepBetweenSec -gt 0 -and $i -lt $packages.Count) {
    Start-Sleep -Seconds $SleepBetweenSec
  }
}

$passCount = @($results | Where-Object { $_.status -eq 'PASS' }).Count
$failCount = @($results | Where-Object { $_.status -eq 'FAIL' }).Count
$verdict = if ($failCount -eq 0 -and $passCount -eq $packages.Count) { 'PASS' } else { 'FAIL' }

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine('# LIVE website industry packages - 2026-10-08')
[void]$md.AppendLine('')
[void]$md.AppendLine('| Item | Value |')
[void]$md.AppendLine('|------|-------|')
[void]$md.AppendLine("| **Verdict** | **$verdict - $passCount/$($packages.Count) PASS** |")
[void]$md.AppendLine("| **Target** | $web |")
[void]$md.AppendLine('| **Auth** | deploy-secrets.local/deploy.config.json (admin) |')
[void]$md.AppendLine('| **Script** | `scripts/_tmp-helper-live-website-industry-20261008.ps1` |')
[void]$md.AppendLine('| **Gates** | publicUrl HTTP 200; industry brand; problems section / industry problems in delivery; numeric checklistScore >= 100; shop for ecommerce |')
[void]$md.AppendLine('| **Honesty** | No fake PASS - FAIL when any gate missing |')
[void]$md.AppendLine('')
[void]$md.AppendLine('## Packages')
[void]$md.AppendLine('')
[void]$md.AppendLine('| deliverableId | industry | status | score | urlHttp | brand | problems | shop | publicUrl | paymentId |')
[void]$md.AppendLine('|---------------|----------|--------|------:|--------:|-------|----------|------|-----------|------------|')
foreach ($r in $results) {
  $brandCell = if ($r.brandOk) { 'PASS' } else { 'FAIL' }
  $probCell = if ($r.problemsOk) { 'PASS' } else { 'FAIL' }
  $shopCell = if ($r.deliverableId -match 'ecommerce') { if ($r.shopOk) { 'PASS' } else { 'FAIL' } } else { 'n/a' }
  [void]$md.AppendLine("| $($r.deliverableId) | $($r.industry) | $($r.status) | $($r.score) | $($r.urlHttp) | $brandCell | $probCell | $shopCell | $($r.publicUrl) | $($r.paymentId) |")
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## Gate detail')
[void]$md.AppendLine('')
foreach ($r in $results) {
  [void]$md.AppendLine("### $($r.deliverableId)")
  [void]$md.AppendLine('')
  [void]$md.AppendLine("- status: **$($r.status)**")
  [void]$md.AppendLine("- checklistScore: $($r.score)")
  [void]$md.AppendLine("- title: $($r.title)")
  [void]$md.AppendLine("- brandOk: $($r.brandOk)")
  [void]$md.AppendLine("- problems: $($r.problemsDetail)")
  [void]$md.AppendLine("- shop: $($r.shopDetail)")
  [void]$md.AppendLine("- elapsedSec: $($r.elapsedSec)")
  [void]$md.AppendLine("- notes: $($r.notes)")
  [void]$md.AppendLine('')
}
[void]$md.AppendLine('## Counts')
[void]$md.AppendLine('')
[void]$md.AppendLine("| PASS | $passCount |")
[void]$md.AppendLine("| FAIL | $failCount |")
[void]$md.AppendLine('')
Set-Content -Path $evidencePath -Value $md.ToString() -Encoding UTF8

Write-Host ''
Write-Host "DONE: $verdict ($passCount/$($packages.Count)) evidence=$evidencePath" -ForegroundColor $(if ($failCount -eq 0) { 'Green' } else { 'Red' })
if ($failCount -gt 0) { exit 1 }
exit 0
