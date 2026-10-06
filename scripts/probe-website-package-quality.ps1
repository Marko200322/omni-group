<#
.SYNOPSIS
  Fulfill website packages across industries, open live URLs, score quality, write evidence.

.EXAMPLE
  .\scripts\probe-website-package-quality.ps1
  .\scripts\probe-website-package-quality.ps1 -IndustryCategories fitness,legal,healthcare -SkipFulfill
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string[]]$IndustryCategories = @(
    'fitness', 'legal', 'healthcare', 'hospitality', 'construction',
    'finance', 'education', 'automotive', 'beauty', 'ecommerce',
    'agriculture', 'marketing'
  ),
  [string[]]$DeliverableIds = @('landing', 'website-business', 'website-ecommerce'),
  [switch]$SkipFulfill,
  [string]$ReportCsv = '',
  [string]$EvidenceMd = '',
  [int]$PollSec = 180,
  [int]$SleepBetweenSec = 20,
  [int]$RateLimitMaxAttempts = 12
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
if (-not $ReportCsv) {
  $ReportCsv = Join-Path $repoRoot "docs\evidence\website-quality-probe-$stamp.csv"
}
if (-not $EvidenceMd) {
  $EvidenceMd = Join-Path $repoRoot "docs\evidence\proof-website-package-quality-$stamp.md"
}

$flatInd = New-Object System.Collections.Generic.List[string]
foreach ($item in @($IndustryCategories)) {
  foreach ($part in ([string]$item -split ',')) {
    $p = $part.Trim()
    if ($p) { [void]$flatInd.Add($p) }
  }
}
$industries = @($flatInd | Select-Object -Unique)
$packages = @()
foreach ($item in @($DeliverableIds)) {
  foreach ($part in ([string]$item -split ',')) {
    $p = $part.Trim()
    if ($p) { $packages += $p }
  }
}
$packages = @($packages | Select-Object -Unique)

$cfgPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
if (-not (Test-Path $cfgPath)) { throw "Missing $cfgPath" }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($pass)) {
  throw 'adminEmail/adminPassword missing in deploy.config.json'
}

function Get-CsrfHeaders {
  param($Session, [string]$Base)
  $c = $Session.Cookies.GetCookies($Base) | Where-Object { $_.Name -eq 'og_csrf' } | Select-Object -First 1
  if (-not $c) { throw 'Missing og_csrf cookie' }
  return @{ 'x-csrf-token' = $c.Value }
}

function Get-VisibleText([string]$Html) {
  $body = $Html
  if ($Html -match '(?s)<body[^>]*>(.*)</body>') { $body = $Matches[1] }
  $t = $body -replace '(?s)<script[^>]*>.*?</script>', ' '
  $t = $t -replace '(?s)<style[^>]*>.*?</style>', ' '
  $t = $t -replace '(?s)<!--.*?-->', ' '
  $t = $t -replace '</?[^>]+>', ' '
  $t = $t -replace '\s+', ' '
  return $t.Trim()
}

function Score-LiveSite {
  param(
    [string]$AbsoluteUrl,
    [string]$DeliverableId,
    [string]$Industry
  )
  $notes = New-Object System.Collections.Generic.List[string]
  $http = 0
  $title = ''
  $visible = ''
  $bytes = 0
  $catalogCount = 0
  $siteType = ''
  $apiTitle = ''
  $pageCount = 0
  $hasShop = $false
  $sectionCount = 0

  try {
    $slug = ($AbsoluteUrl -split '/sites/')[-1]
    $apiUrl = "$web/api/public/sites/$slug"
    $apiRaw = (Invoke-WebRequest -Uri $apiUrl -UseBasicParsing -TimeoutSec 30).Content
    $api = $apiRaw | ConvertFrom-Json
    $data = $api.data
    if ($data) {
      $apiTitle = [string]$data.title
      $siteType = [string]$data.siteType
      $pageCount = @($data.pages).Count
      $hasShop = @($data.pages | Where-Object { $_.slug -eq 'shop' -or $_.kind -eq 'shop' }).Count -gt 0
      if ($data.branding -and $data.branding.catalog) {
        $catalogCount = @($data.branding.catalog).Count
      }
      $joined = (@($data.pages | ForEach-Object { $_.body }) -join "`n")
      $sectionCount = ([regex]::Matches($joined, '(?m)^##\s+')).Count
      if ($pageCount -le 1) {
        $sectionCount = ([regex]::Matches([string]$data.pages[0].body, '(?m)^##\s+')).Count
      }
    }
  } catch {
    [void]$notes.Add("api_fail:$($_.Exception.Message)")
  }

  try {
    $r = Invoke-WebRequest -Uri $AbsoluteUrl -UseBasicParsing -TimeoutSec 30
    $http = [int]$r.StatusCode
    $bytes = [int]$r.RawContentLength
    if ($r.Content -match '<title[^>]*>([^<]+)</title>') { $title = $Matches[1].Trim() }
    $visible = Get-VisibleText $r.Content
  } catch {
    [void]$notes.Add("http_fail:$($_.Exception.Message)")
  }

  $httpOk = ($http -eq 200 -and $bytes -ge 800)
  $brandOk = $true
  if ($title -match '(?i)system\s*admin|omni\s*group') { $brandOk = $false; [void]$notes.Add('title_system_admin_or_omni') }
  if ($apiTitle -match '(?i)^system\s*admin$|^omni') { $brandOk = $false; [void]$notes.Add('api_title_placeholder') }
  if ($visible -match '(?i)\bSystem Admin\b') { $brandOk = $false; [void]$notes.Add('body_system_admin') }

  $chromeOk = $true
  if ($visible -match '(?i)ask\s*omi|powered by omni|omni group tech') {
    $chromeOk = $false
    [void]$notes.Add('omni_chrome_visible')
  }

  $copyOk = $true
  if ($sectionCount -lt 3 -and $pageCount -lt 3) {
    $copyOk = $false
    [void]$notes.Add("thin_sections:sections=$sectionCount,pages=$pageCount")
  }
  if ($visible.Length -lt 400) {
    $copyOk = $false
    [void]$notes.Add('thin_visible_text')
  }
  # Industry token should appear somewhere (slug, hyphenated, or first word).
  # ecommerce -> also accept "e-commerce" / "E-commerce".
  $indNorm = ($Industry -replace '[_-]+', ' ').Trim()
  $variants = @(
    $indNorm,
    ($Industry -replace '_', '-'),
    ($indNorm -replace 'ecommerce', 'e-commerce'),
    ($indNorm -replace 'ecommerce', 'e commerce'),
    (($Industry -split '[_\-]')[0])
  ) | Where-Object { $_ } | Select-Object -Unique
  $industryHit = $false
  foreach ($v in $variants) {
    if ($visible -match "(?i)$([regex]::Escape($v))") { $industryHit = $true; break }
  }
  if (-not $industryHit) {
    $copyOk = $false
    [void]$notes.Add('industry_token_missing')
  }

  $shopOk = $true
  if ($DeliverableId -eq 'website-ecommerce') {
    if (-not $hasShop) { $shopOk = $false; [void]$notes.Add('missing_shop_page') }
    if ($catalogCount -lt 4) { $shopOk = $false; [void]$notes.Add("catalog_lt4:$catalogCount") }
    if ($siteType -ne 'ecommerce') { $shopOk = $false; [void]$notes.Add("siteType=$siteType") }
    if ($visible -notmatch '(?i)\bshop\b|catalog|add to cart|cart') {
      # shop may be behind client tab - check API instead, but note UI
      [void]$notes.Add('shop_ui_signal_weak_on_default_view')
    }
  }

  $pass = $httpOk -and $brandOk -and $chromeOk -and $copyOk -and $shopOk
  $score = 0
  if ($httpOk) { $score += 20 }
  if ($brandOk) { $score += 25 }
  if ($chromeOk) { $score += 20 }
  if ($copyOk) { $score += 20 }
  if ($DeliverableId -eq 'website-ecommerce') {
    if ($shopOk) { $score += 15 }
  } else {
    $score += 15
  }

  return [pscustomobject]@{
    deliverableId = $DeliverableId
    industry = $Industry
    absoluteUrl = $AbsoluteUrl
    httpStatus = $http
    bytes = $bytes
    title = $title
    apiTitle = $apiTitle
    pageCount = $pageCount
    sectionCount = $sectionCount
    catalogCount = $catalogCount
    hasShop = $hasShop
    siteType = $siteType
    httpOk = $httpOk
    brandOk = $brandOk
    chromeOk = $chromeOk
    copyOk = $copyOk
    shopOk = $shopOk
    score = $score
    status = $(if ($pass) { 'PASS' } else { 'FAIL' })
    failReasons = ($notes -join '|')
    visibleSnippet = $visible.Substring(0, [Math]::Min(280, $visible.Length))
  }
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$null = Invoke-WithRateLimitRetry -Label 'login' -MaxAttempts $RateLimitMaxAttempts -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
Write-Host "Login OK ($email)" -ForegroundColor Green

'deliverableId,industry,status,score,absoluteUrl,httpStatus,title,apiTitle,pageCount,sectionCount,catalogCount,hasShop,failReasons,paymentId,checkedAt' |
  Set-Content -Path $ReportCsv -Encoding UTF8

$results = @()
$i = 0
$total = $industries.Count * $packages.Count
foreach ($ind in $industries) {
  foreach ($pkg in $packages) {
    $i++
    Write-Host ""
    Write-Host "[$i/$total] $pkg @ $ind" -ForegroundColor DarkCyan
    $paymentId = ''
    $abs = ''
    try {
      if (-not $SkipFulfill) {
        $dq = (@{
          deliverableId = $pkg
          industryCategory = $ind
          paymentProvider = 'manual'
        } | ConvertTo-Json -Compress)
        $dco = Invoke-WithRateLimitRetry -Label "checkout-$pkg-$ind" -MaxAttempts $RateLimitMaxAttempts -Action {
          $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
            -ContentType 'application/json' -Body $dq -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
          return ($r.Content | ConvertFrom-Json)
        }
        if (-not $dco.ok) { throw "checkout failed" }
        $paymentId = [string]$dco.data.paymentId

        Invoke-WithRateLimitRetry -Label "mark-sent-$pkg" -MaxAttempts $RateLimitMaxAttempts -Action {
          Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST `
            -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
        } | Out-Null

        Invoke-WithRateLimitRetry -Label "confirm-$pkg" -MaxAttempts $RateLimitMaxAttempts -Action {
          Invoke-WebRequest -Uri "$web/api/atina/payments/manual/confirm/$paymentId" -Method POST `
            -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
        } | Out-Null

        $deadline = (Get-Date).AddSeconds($PollSec)
        $job = $null
        while ((Get-Date) -lt $deadline) {
          Start-Sleep -Seconds 4
          $jr = (Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$paymentId" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
          $job = $jr.data
          if ($job -and $job.status -in @('completed', 'failed')) { break }
        }
        if (-not $job) { throw 'No fulfillment job' }
        if ($job.status -eq 'failed') { throw "Fulfillment failed: $($job.error)" }
        if ($job.status -ne 'completed') { throw "Timeout status=$($job.status)" }

        $abs = [string]$job.publicUrl
        if (-not $abs -and $job.result) { $abs = [string]$job.result.publicUrl }
        if (-not $abs -and $job.fulfillmentMeta -and $job.fulfillmentMeta.liveProbe) {
          $abs = [string]$job.fulfillmentMeta.liveProbe.url
        }
        if (-not $abs -and $job.result -and $job.result.fulfillmentMeta -and $job.result.fulfillmentMeta.liveProbe) {
          $abs = [string]$job.result.fulfillmentMeta.liveProbe.url
        }
        if ($abs -and $abs -notmatch '^https?://') {
          $abs = "$web$abs"
        }
        if (-not $abs) { throw 'Missing publicUrl on completed job' }
        Write-Host "  fulfilled -> $abs" -ForegroundColor Green
      } else {
        throw 'SkipFulfill requires absoluteUrl source (not implemented for matrix lookup in this run)'
      }

      $scored = Score-LiveSite -AbsoluteUrl $abs -DeliverableId $pkg -Industry $ind
      Write-Host "  $($scored.status) score=$($scored.score) title=$($scored.title) reasons=$($scored.failReasons)" -ForegroundColor $(if ($scored.status -eq 'PASS') { 'Green' } else { 'Red' })
      $results += $scored
      $line = ('{0},{1},{2},{3},{4},{5},"{6}","{7}",{8},{9},{10},{11},"{12}",{13},{14}' -f `
        $pkg, $ind, $scored.status, $scored.score, $abs, $scored.httpStatus,
        ($scored.title -replace '"', ''''), ($scored.apiTitle -replace '"', ''''),
        $scored.pageCount, $scored.sectionCount, $scored.catalogCount, $scored.hasShop,
        ($scored.failReasons -replace '"', ''''), $paymentId, (Get-Date -Format 'o'))
      Add-Content -Path $ReportCsv -Value $line -Encoding UTF8
    } catch {
      $err = $_.Exception.Message -replace '[\r\n,"]+', ' '
      Write-Host "  FAIL $err" -ForegroundColor Red
      $results += [pscustomobject]@{
        deliverableId = $pkg; industry = $ind; absoluteUrl = $abs; status = 'FAIL'; score = 0
        title = ''; failReasons = $err; httpStatus = 0; pageCount = 0; sectionCount = 0
        catalogCount = 0; hasShop = $false; apiTitle = ''; siteType = ''
        httpOk = $false; brandOk = $false; chromeOk = $false; copyOk = $false; shopOk = $false
        visibleSnippet = ''
      }
      $line = ('{0},{1},FAIL,0,{2},0,"","",0,0,0,False,"{3}",{4},{5}' -f `
        $pkg, $ind, $abs, $err, $paymentId, (Get-Date -Format 'o'))
      Add-Content -Path $ReportCsv -Value $line -Encoding UTF8
    }

    if ($SleepBetweenSec -gt 0) { Start-Sleep -Seconds $SleepBetweenSec }
  }
}

$passN = @($results | Where-Object { $_.status -eq 'PASS' }).Count
$failN = @($results | Where-Object { $_.status -ne 'PASS' }).Count
$md = @()
$md += "# Website package quality proof - $stamp"
$md += ''
$md += "## Method"
$md += ''
$md += "- Prod e2e fulfill for **$($packages -join ', ')** across **$($industries.Count)** industries"
$md += "- Opened real live URLs (HTTP + public API + visible body text)"
$md += "- Gates: HTTP 200, client brand (not System Admin), no Omni chrome, multi-section industry-aware copy, ecommerce shop+catalog"
$md += "- CSV: ``$ReportCsv``"
$md += ''
$md += "## Summary"
$md += ''
$md += "| Metric | Value |"
$md += "|---|---:|"
$md += "| Cells | $($results.Count) |"
$md += "| PASS | $passN |"
$md += "| FAIL | $failN |"
$md += "| Verdict | $(if ($failN -eq 0) { '**PASS**' } else { '**FAIL**' }) |"
$md += ''
$md += "## Pass/fail table"
$md += ''
$md += '| Package | Industry | Status | Score | URL | FAIL reasons |'
$md += '|---|---|---|---:|---|---|'
foreach ($r in $results) {
  $url = if ($r.absoluteUrl) { $r.absoluteUrl } else { '-' }
  $why = if ($r.failReasons) { $r.failReasons } else { '' }
  $md += "| $($r.deliverableId) | $($r.industry) | **$($r.status)** | $($r.score) | $url | $why |"
}
$md += ''
$md += "## Notes"
$md += ''
$md += '- Scores are quality gates (not matrix smoke). Matrix green alone is insufficient.'
$md += '- Ecommerce shop UI is verified via API shop page + catalog count; default HTML view may open on Shop for ecommerce sites.'
$md += ''
$md -join "`n" | Set-Content -Path $EvidenceMd -Encoding UTF8

Write-Host ''
Write-Host "QUALITY DONE: $passN passed, $failN failed" -ForegroundColor $(if ($failN -eq 0) { 'Green' } else { 'Red' })
Write-Host "CSV: $ReportCsv"
Write-Host "MD:  $EvidenceMd"
if ($failN -gt 0) { exit 1 }
exit 0
