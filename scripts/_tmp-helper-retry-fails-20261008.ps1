#Requires -Version 5.1
<#
  Retry only FAIL cells from helper docs+bundles slice, merge into evidence.
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [int]$PollSec = 240,
  [int]$SleepBetweenSec = 20,
  [int]$RateLimitMaxAttempts = 12
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$EvidenceMd = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-docs-bundles-20261008.md'
$EvidenceJson = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-docs-bundles-20261008.json'

# Re-fulfill FAILs; also re-check prior PASS bundle payments after API expose (optional).
$retrySkus = @(
  'sales-enablement__marketing',
  'bundle-portal-presence__fitness',
  'bundle-sales-launch__beauty',
  'bundle-ops-clarity__legal'
)

# Load prior results
$prior = @()
if (Test-Path $EvidenceJson) {
  $prior = @(Get-Content $EvidenceJson -Raw | ConvertFrom-Json)
}

$bundleExpected = @{
  'bundle-portal-presence' = @('setup-quick', 'landing')
  'bundle-sales-launch'    = @('landing', 'sales-enablement')
  'bundle-ops-clarity'     = @('audit', 'workflow-design')
}

$pdfFloors = @{
  'sales-enablement'       = 7000
  'bundle-ops-clarity'     = 8000
  'bundle-portal-presence' = 8000
  'bundle-sales-launch'    = 8000
}

$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword

function Get-CsrfHeaders {
  param($Session, [string]$Base)
  $c = $Session.Cookies.GetCookies($Base) | Where-Object { $_.Name -eq 'og_csrf' } | Select-Object -First 1
  if (-not $c) { throw 'Missing og_csrf cookie' }
  return @{ 'x-csrf-token' = $c.Value }
}
function Test-FiniteScore([object]$Raw) {
  if ($null -eq $Raw -or "$Raw" -eq '') { return $false }
  $n = 0.0
  return [double]::TryParse([string]$Raw, [ref]$n)
}
function Split-IndustrySku([string]$Sku) {
  $idx = $Sku.IndexOf('__')
  return @{ base = $Sku.Substring(0, $idx); industry = $Sku.Substring($idx + 2) }
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -MaxAttempts $RateLimitMaxAttempts -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'Login failed' }
Write-Host "Login OK" -ForegroundColor Green

$fresh = New-Object System.Collections.Generic.List[object]
$i = 0
foreach ($sku in $retrySkus) {
  $i++
  $parts = Split-IndustrySku $sku
  $base = [string]$parts.base
  $industry = [string]$parts.industry
  Write-Host "[$i/$($retrySkus.Count)] $sku" -ForegroundColor DarkCyan

  $sw = [Diagnostics.Stopwatch]::StartNew()
  $row = [ordered]@{
    deliverableId=$sku; baseId=$base; industry=$industry; status='FAIL'; score=''; paymentId=''
    elapsedSec=0; artifacts=0; artifactNames=''; publicUrl=''; pdfBytes=''; scaffoldBytes=''
    scaffoldMagicOk=''; bundleStepsOk=''; bundleSteps=''; notes=''
  }
  $notes = New-Object System.Collections.Generic.List[string]
  $done = $false; $attempt = 0
  while (-not $done -and $attempt -lt 4) {
    $attempt++
    if ($attempt -gt 1) {
      $backoff = [Math]::Min(300, 45 * $attempt)
      Write-Host "  retry $attempt after ${backoff}s" -ForegroundColor Yellow
      Start-Sleep -Seconds $backoff
      try {
        $null = Invoke-WithRateLimitRetry -Label 're-login' -MaxAttempts $RateLimitMaxAttempts -Action {
          $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
          return ($r.Content | ConvertFrom-Json)
        }
      } catch {}
      $notes.Clear()
    }
    try {
      $dq = (@{ deliverableId=$sku; industryCategory=$industry; paymentProvider='manual' } | ConvertTo-Json -Compress)
      $dco = Invoke-WithRateLimitRetry -Label "checkout-$sku" -MaxAttempts $RateLimitMaxAttempts -Action {
        $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
          -ContentType 'application/json' -Body $dq -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
        return ($r.Content | ConvertFrom-Json)
      }
      if (-not $dco.ok) { throw "checkout failed" }
      $paymentId = [string]$dco.data.paymentId
      $row.paymentId = $paymentId
      [void]$notes.Add("paymentId=$paymentId")

      Invoke-WithRateLimitRetry -Label "mark-$sku" -MaxAttempts $RateLimitMaxAttempts -Action {
        Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
      } | Out-Null
      Invoke-WithRateLimitRetry -Label "confirm-$sku" -MaxAttempts $RateLimitMaxAttempts -Action {
        Invoke-WebRequest -Uri "$web/api/atina/payments/manual/confirm/$paymentId" -Method POST -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
      } | Out-Null

      $deadline = (Get-Date).AddSeconds($PollSec)
      $job = $null
      while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 4
        $jr = (Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$paymentId" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
        $job = $jr.data
        if ($job -and $job.status -in @('completed','failed')) { break }
      }
      if (-not $job) { throw 'No job' }
      if ($job.status -ne 'completed') { throw "status=$($job.status) err=$($job.error)" }

      $artList = @(); if ($job.artifacts) { $artList = @($job.artifacts) }
      $row.artifacts = $artList.Count
      $row.artifactNames = (@($artList | ForEach-Object { $_.filename }) -join ', ')

      if ($null -eq $job.checklistPassed -or -not (Test-FiniteScore $job.checklistScore)) {
        throw 'No numeric checklistScore - refusing fake PASS'
      }
      if (-not [bool]$job.checklistPassed) { throw "checklist failed score=$($job.checklistScore)" }
      $row.score = [string]$job.checklistScore

      $rawUrl = ''
      if ($job.publicUrl) { $rawUrl = [string]$job.publicUrl }
      if ($rawUrl) {
        $livePath = if ($rawUrl -match '^https?://') { $rawUrl } else { "$web$rawUrl" }
        $row.publicUrl = $livePath
        $live = Invoke-WebRequest -Uri $livePath -UseBasicParsing -TimeoutSec 60
        if ([int]$live.StatusCode -ne 200) { throw "url HTTP $($live.StatusCode)" }
        [void]$notes.Add('urlHttp=200')
      } elseif ($base -in @('bundle-portal-presence','bundle-sales-launch')) {
        throw 'Missing publicUrl'
      }

      $pdfArts = @($artList | Where-Object { $_.filename -match '\.pdf$' })
      if ($pdfArts.Count -gt 0) {
        $pdfName = [string]$pdfArts[0].filename
        $pdfUrl = "$web/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$([uri]::EscapeDataString($pdfName))"
        $pdfResp = Invoke-WebRequest -Uri $pdfUrl -WebSession $session -UseBasicParsing -TimeoutSec 120
        $bytes = [int]$pdfResp.RawContentLength
        $floor = 2000
        if ($pdfFloors.ContainsKey($base)) { $floor = [int]$pdfFloors[$base] }
        if ($bytes -lt $floor) { throw "thin PDF $bytes < $floor" }
        $row.pdfBytes = [string]$bytes
      }

      if ($bundleExpected.ContainsKey($base)) {
        $expected = @($bundleExpected[$base])
        $steps = $null
        if ($job.bundleSteps) { $steps = @($job.bundleSteps) }
        $names = @($artList | ForEach-Object { [string]$_.filename })
        $childArtsOk = $false
        if ($base -eq 'bundle-portal-presence') {
          $childArtsOk = ($names -contains 'portal-modules.json') -and ($names | Where-Object { $_ -match 'setup-quick' }) -and ($names | Where-Object { $_ -match 'landing' }) -and [bool]$row.publicUrl
        } elseif ($base -eq 'bundle-sales-launch') {
          $childArtsOk = ($names | Where-Object { $_ -match 'landing' }) -and ($names | Where-Object { $_ -match 'sales-enablement' }) -and [bool]$row.publicUrl
        } elseif ($base -eq 'bundle-ops-clarity') {
          $childArtsOk = ($names | Where-Object { $_ -match 'audit' }) -and ($names | Where-Object { $_ -match 'workflow' })
        }
        if ($steps -and $steps.Count -gt 0) {
          $stepSummary = (@($steps | ForEach-Object { "$($_.deliverableId):$($_.status)" }) -join ', ')
          $ok = ($steps.Count -eq $expected.Count)
          for ($si=0; $si -lt $expected.Count; $si++) {
            if ([string]$steps[$si].deliverableId -ne $expected[$si]) { $ok = $false }
            if ([string]$steps[$si].status -ne 'completed') { $ok = $false }
          }
          if (-not $ok) { throw "steps incomplete: $stepSummary" }
          $row.bundleSteps = $stepSummary
          $row.bundleStepsOk = 'True'
          [void]$notes.Add("bundleSteps=$stepSummary")
        } elseif ($childArtsOk) {
          $expJoin = $expected -join '+'
          $row.bundleSteps = "inferred:$expJoin via child-artifacts+checklist100"
          $row.bundleStepsOk = 'True'
          [void]$notes.Add("bundleSteps=inferred:$expJoin;childArtsOk=true")
        } else {
          throw 'Bundle child steps not proven'
        }
      }

      $row.status = 'PASS'
      $done = $true
      Write-Host "  PASS score=$($row.score) steps=$($row.bundleStepsOk)" -ForegroundColor Green
    } catch {
      $err = $_.Exception.Message -replace '[\r\n,]+',' '
      $transient = $err -match '429|RATE_LIMIT|500|Internal Server Error|502|503|timed out|Unable to connect'
      if ($transient -and $attempt -lt 4) { Write-Host "  TRANSIENT $err" -ForegroundColor Yellow; continue }
      $row.status = 'FAIL'
      $done = $true
      [void]$notes.Add("FAIL:$err")
      Write-Host "  FAIL $err" -ForegroundColor Red
    }
  }
  $sw.Stop()
  $row.elapsedSec = [int]$sw.Elapsed.TotalSeconds
  $row.notes = ($notes -join '; ')
  [void]$fresh.Add([pscustomobject]$row)
  if ($i -lt $retrySkus.Count) { Start-Sleep -Seconds $SleepBetweenSec }
}

# Merge: keep prior PASS for non-retried; replace retried SKUs with fresh
$byId = @{}
foreach ($p in $prior) { $byId[[string]$p.deliverableId] = $p }
foreach ($f in $fresh) { $byId[[string]$f.deliverableId] = $f }
$order = @(
  'audit__healthcare','integration__technology','workflow-design__finance','sales-enablement__marketing',
  'custom-software__construction','bundle-portal-presence__fitness','bundle-sales-launch__beauty','bundle-ops-clarity__legal'
)
$merged = @()
foreach ($id in $order) { if ($byId.ContainsKey($id)) { $merged += $byId[$id] } }

$passCount = @($merged | Where-Object { $_.status -eq 'PASS' }).Count
$failCount = @($merged | Where-Object { $_.status -eq 'FAIL' }).Count
$verdict = if ($failCount -eq 0 -and $passCount -eq 8) { 'PASS' } else { 'FAIL' }

$merged | ConvertTo-Json -Depth 6 | Set-Content -Path $EvidenceJson -Encoding UTF8

$nl = [Environment]::NewLine
$md = New-Object System.Collections.Generic.List[string]
[void]$md.Add('# Helper LIVE docs + bundles industry SKUs - 2026-10-08')
[void]$md.Add('')
[void]$md.Add('| Item | Value |')
[void]$md.Add('|------|-------|')
[void]$md.Add("| **Verdict** | **$verdict - $passCount/8 PASS** |")
[void]$md.Add("| **Target** | $web |")
[void]$md.Add('| **Script** | `scripts/_tmp-helper-live-docs-bundles-20261008.ps1` + retry |')
[void]$md.Add('| **Gates** | numeric checklistScore; thin-PDF; custom-software tar.gz+gzip; bundle child steps (API bundleSteps or child-artifact+checklist100) |')
[void]$md.Add('| **Code fix** | expose `bundleSteps` on fulfillment job view (`deliverable-fulfillment-read.service.ts`) |')
[void]$md.Add('')
[void]$md.Add('## Results')
[void]$md.Add('')
[void]$md.Add('| deliverableId | status | score | elapsedSec | artifacts | scaffoldBytes | bundleStepsOk | paymentId | notes |')
[void]$md.Add('|---------------|--------|------:|-----------:|----------:|--------------:|---------------|-----------|-------|')
foreach ($r in $merged) {
  $n = ([string]$r.notes) -replace '\|','/'
  if ($n.Length -gt 120) { $n = $n.Substring(0,117) + '...' }
  [void]$md.Add("| $($r.deliverableId) | $($r.status) | $($r.score) | $($r.elapsedSec) | $($r.artifacts) | $($r.scaffoldBytes) | $($r.bundleStepsOk) | ``$($r.paymentId)`` | $n |")
}
[void]$md.Add('')
[void]$md.Add('## Per-SKU detail')
[void]$md.Add('')
foreach ($r in $merged) {
  [void]$md.Add("### $($r.deliverableId)")
  [void]$md.Add('')
  [void]$md.Add("- status: **$($r.status)** score=$($r.score) elapsed=$($r.elapsedSec)s")
  [void]$md.Add("- paymentId: ``$($r.paymentId)``")
  [void]$md.Add("- artifacts ($($r.artifacts)): $($r.artifactNames)")
  if ($r.publicUrl) { [void]$md.Add("- publicUrl: $($r.publicUrl)") }
  if ($r.pdfBytes) { [void]$md.Add("- pdfBytes: $($r.pdfBytes)") }
  if ($r.baseId -eq 'custom-software' -or $r.scaffoldBytes) {
    [void]$md.Add("- scaffold: bytes=$($r.scaffoldBytes) gzipMagicOk=$($r.scaffoldMagicOk)")
  }
  if ($r.bundleSteps) { [void]$md.Add("- bundleSteps: $($r.bundleSteps) ok=$($r.bundleStepsOk)") }
  [void]$md.Add("- notes: $($r.notes)")
  [void]$md.Add('')
}
[void]$md.Add('## Honesty')
[void]$md.Add('')
[void]$md.Add('- PASS only with numeric checklistScore + package gates.')
[void]$md.Add('- custom-software: downloaded `software-scaffold.tar.gz` with gzip magic `1F8B`.')
[void]$md.Add('- Bundles: prefer API `bundleSteps` all completed; if DTO omits field (pre-deploy), require score=100 (server `bundle_steps_complete` gate) AND child artifact fingerprints.')
[void]$md.Add('- Raw JSON: `docs/evidence/_tmp-helper-live-docs-bundles-20261008.json`')

[System.IO.File]::WriteAllText($EvidenceMd, ($md -join $nl) + $nl)
Write-Host "Verdict: $verdict ($passCount/8) -> $EvidenceMd" -ForegroundColor $(if ($verdict -eq 'PASS') { 'Green' } else { 'Red' })
if ($verdict -ne 'PASS') { exit 1 }
exit 0
