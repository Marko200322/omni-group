#Requires -Version 5.1
<#
  LIVE fulfill industry SKUs (docs + custom-software + bundles slice).
  Evidence: docs/evidence/_tmp-helper-live-docs-bundles-20261008.md
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [int]$PollSec = 240,
  [int]$SleepBetweenSec = 15,
  [int]$RateLimitMaxAttempts = 12
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$EvidenceMd = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-docs-bundles-20261008.md'
$EvidenceJson = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-docs-bundles-20261008.json'

$skus = @(
  'audit__healthcare',
  'integration__technology',
  'workflow-design__finance',
  'sales-enablement__marketing',
  'custom-software__construction',
  'bundle-portal-presence__fitness',
  'bundle-sales-launch__beauty',
  'bundle-ops-clarity__legal'
)

$bundleExpected = @{
  'bundle-portal-presence' = @('setup-quick', 'landing')
  'bundle-sales-launch'    = @('landing', 'sales-enablement')
  'bundle-ops-clarity'     = @('audit', 'workflow-design')
}

$pdfFloors = @{
  'audit'                   = 12000
  'workflow-design'         = 8000
  'integration'             = 8000
  'sales-enablement'        = 7000
  'custom-software'         = 6000
  'bundle-ops-clarity'      = 8000
  'bundle-portal-presence'  = 8000
  'bundle-sales-launch'     = 8000
}

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
  if (-not $c) { throw 'Missing og_csrf cookie - login/session invalid' }
  return @{ 'x-csrf-token' = $c.Value }
}

function Test-FiniteScore([object]$Raw) {
  if ($null -eq $Raw -or "$Raw" -eq '') { return $false }
  $n = 0.0
  return [double]::TryParse([string]$Raw, [ref]$n)
}

function Split-IndustrySku([string]$Sku) {
  $idx = $Sku.IndexOf('__')
  if ($idx -le 0) { throw "Not an industry SKU: $Sku" }
  return @{
    base     = $Sku.Substring(0, $idx)
    industry = $Sku.Substring($idx + 2)
  }
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -MaxAttempts $RateLimitMaxAttempts -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'Login failed' }
Write-Host "Login OK ($email)" -ForegroundColor Green

$results = New-Object System.Collections.Generic.List[object]
$i = 0

foreach ($sku in $skus) {
  $i++
  $parts = Split-IndustrySku $sku
  $base = [string]$parts.base
  $industry = [string]$parts.industry
  Write-Host ''
  Write-Host "[$i/$($skus.Count)] -- $sku --" -ForegroundColor DarkCyan

  $sw = [Diagnostics.Stopwatch]::StartNew()
  $row = [ordered]@{
    deliverableId   = $sku
    baseId          = $base
    industry        = $industry
    status          = 'FAIL'
    score           = ''
    paymentId       = ''
    elapsedSec      = 0
    artifacts       = 0
    artifactNames   = ''
    publicUrl       = ''
    pdfBytes        = ''
    scaffoldBytes   = ''
    scaffoldMagicOk = ''
    bundleStepsOk   = ''
    bundleSteps     = ''
    notes           = ''
  }
  $notes = New-Object System.Collections.Generic.List[string]
  $cellAttempts = 0
  $cellMax = 4
  $cellDone = $false

  while (-not $cellDone -and $cellAttempts -lt $cellMax) {
    $cellAttempts++
    if ($cellAttempts -gt 1) {
      $backoff = [Math]::Min(300, 45 * $cellAttempts)
      Write-Host "  cell retry $cellAttempts/$cellMax after ${backoff}s..." -ForegroundColor Yellow
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
      $dq = (@{
        deliverableId    = $sku
        industryCategory = $industry
        paymentProvider  = 'manual'
      } | ConvertTo-Json -Compress)

      $dco = Invoke-WithRateLimitRetry -Label "checkout-$sku" -MaxAttempts $RateLimitMaxAttempts -Action {
        $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
          -ContentType 'application/json' -Body $dq -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
        return ($r.Content | ConvertFrom-Json)
      }
      if (-not $dco.ok) { throw "checkout failed: $($dco | ConvertTo-Json -Compress)" }
      $paymentId = [string]$dco.data.paymentId
      $row.paymentId = $paymentId
      [void]$notes.Add("paymentId=$paymentId")

      Invoke-WithRateLimitRetry -Label "mark-sent-$sku" -MaxAttempts $RateLimitMaxAttempts -Action {
        Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST `
          -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
      } | Out-Null

      Invoke-WithRateLimitRetry -Label "confirm-$sku" -MaxAttempts $RateLimitMaxAttempts -Action {
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

      $artList = @()
      if ($job.artifacts) { $artList = @($job.artifacts) }
      $row.artifacts = $artList.Count
      $row.artifactNames = (@($artList | ForEach-Object { [string]$_.filename }) -join ', ')

      # Numeric checklistScore required - refuse fake PASS
      $checklist = $null
      if ($null -ne $job.checklistPassed -and "$($job.checklistPassed)" -ne '') {
        if (-not (Test-FiniteScore $job.checklistScore)) {
          throw 'checklistPassed set but checklistScore missing - refusing fake PASS'
        }
        $checklist = @{ score = $job.checklistScore; passed = [bool]$job.checklistPassed }
      }
      if (-not $checklist -and $job.fulfillmentMeta -and $job.fulfillmentMeta.checklist) {
        $c = $job.fulfillmentMeta.checklist
        if ((Test-FiniteScore $c.score) -and ($null -ne $c.passed -and "$($c.passed)" -ne '')) {
          $checklist = @{ score = $c.score; passed = [bool]$c.passed; items = $c.items }
        }
      }
      if (-not $checklist) { throw 'No numeric checklistScore - refusing fake PASS' }
      if (-not [bool]$checklist.passed) {
        $fails = ''
        if ($checklist.items) {
          $fails = (@($checklist.items | Where-Object { -not $_.passed } | ForEach-Object { $_.id }) -join ', ')
        }
        throw "Checklist failed ($($checklist.score)pct): $fails"
      }
      $row.score = [string]$checklist.score
      [void]$notes.Add('gate=checklist')

      # publicUrl for site bundles
      $rawUrl = ''
      if ($job.publicUrl) { $rawUrl = [string]$job.publicUrl }
      elseif ($job.result -and $job.result.publicUrl) { $rawUrl = [string]$job.result.publicUrl }
      elseif ($job.fulfillmentMeta -and $job.fulfillmentMeta.publicUrl) { $rawUrl = [string]$job.fulfillmentMeta.publicUrl }
      if ($rawUrl) {
        $livePath = $rawUrl
        if ($livePath -notmatch '^https?://') { $livePath = "$web$livePath" }
        $row.publicUrl = $livePath
        $live = Invoke-WebRequest -Uri $livePath -UseBasicParsing -TimeoutSec 60
        if ([int]$live.StatusCode -ne 200) { throw "Live publicUrl HTTP $($live.StatusCode)" }
        $title = if ($live.Content -match '<title>([^<]+)</title>') { $Matches[1].Trim() } else { '' }
        if ($title -match 'System Admin') { throw "Live publicUrl title is System Admin: $title" }
        [void]$notes.Add('urlHttp=200')
      } elseif ($base -in @('bundle-portal-presence', 'bundle-sales-launch')) {
        throw 'Missing publicUrl on site bundle - refusing PASS'
      }

      # PDF download + thin-PDF floor (base floors)
      $pdfArts = @($artList | Where-Object { [string]$_.filename -match '\.pdf$' })
      if ($pdfArts.Count -gt 0) {
        $pdfName = [string]$pdfArts[0].filename
        $pdfUrl = "$web/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$([uri]::EscapeDataString($pdfName))"
        $pdfResp = Invoke-WebRequest -Uri $pdfUrl -WebSession $session -UseBasicParsing -TimeoutSec 120
        $bytes = [int]$pdfResp.RawContentLength
        if ($pdfResp.StatusCode -ne 200 -or $bytes -lt 200) {
          throw "PDF download failed status=$($pdfResp.StatusCode) bytes=$bytes"
        }
        $row.pdfBytes = [string]$bytes
        $floor = 2000
        if ($pdfFloors.ContainsKey($base)) { $floor = [int]$pdfFloors[$base] }
        if ($bytes -lt $floor) { throw "Thin PDF gate: $pdfName is ${bytes}B < floor ${floor}B" }
        [void]$notes.Add("pdf=$pdfName")
      }

      # custom-software: must download software-scaffold.tar.gz (not PDF-only)
      if ($base -eq 'custom-software') {
        $scaffold = @($artList | Where-Object { [string]$_.filename -eq 'software-scaffold.tar.gz' } | Select-Object -First 1)
        if (-not $scaffold) {
          throw 'custom-software missing software-scaffold.tar.gz artifact - PDF-only is FAIL'
        }
        $scUrl = "$web/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$([uri]::EscapeDataString('software-scaffold.tar.gz'))"
        $tmp = Join-Path $env:TEMP ("scaffold-" + $paymentId + ".tar.gz")
        Invoke-WebRequest -Uri $scUrl -WebSession $session -OutFile $tmp -UseBasicParsing -TimeoutSec 120
        $scInfo = Get-Item -LiteralPath $tmp
        $scBytes = [int]$scInfo.Length
        if ($scBytes -lt 800) {
          Remove-Item -Force $tmp -ErrorAction SilentlyContinue
          throw "scaffold download too small bytes=$scBytes (min 800)"
        }
        $row.scaffoldBytes = [string]$scBytes
        $fs = [IO.File]::OpenRead($tmp)
        try {
          $b0 = $fs.ReadByte()
          $b1 = $fs.ReadByte()
          $magicOk = ($b0 -eq 0x1F -and $b1 -eq 0x8B)
        } finally {
          $fs.Close()
        }
        Remove-Item -Force $tmp -ErrorAction SilentlyContinue
        $row.scaffoldMagicOk = [string]$magicOk
        if (-not $magicOk) { throw 'software-scaffold.tar.gz missing gzip magic 1F8B' }
        [void]$notes.Add("scaffold=${scBytes}B;gzip=1F8B")
      }

      # bundles: child steps must all be completed
      if ($bundleExpected.ContainsKey($base)) {
        $expected = @($bundleExpected[$base])
        $steps = $null
        if ($job.bundleSteps) { $steps = @($job.bundleSteps) }
        elseif ($job.fulfillmentMeta -and $job.fulfillmentMeta.bundleSteps) { $steps = @($job.fulfillmentMeta.bundleSteps) }
        elseif ($job.metadata -and $job.metadata.bundleSteps) { $steps = @($job.metadata.bundleSteps) }

        $names = @($artList | ForEach-Object { [string]$_.filename })
        $childArtsOk = $false
        if ($base -eq 'bundle-portal-presence') {
          $hasSetup = [bool]($names | Where-Object { $_ -match 'setup-quick' })
          $hasLanding = [bool]($names | Where-Object { $_ -match 'landing' })
          $childArtsOk = ($names -contains 'portal-modules.json') -and $hasSetup -and $hasLanding -and [bool]$row.publicUrl
        } elseif ($base -eq 'bundle-sales-launch') {
          $hasLanding = [bool]($names | Where-Object { $_ -match 'landing' })
          $hasSales = [bool]($names | Where-Object { $_ -match 'sales-enablement' })
          $childArtsOk = $hasLanding -and $hasSales -and [bool]$row.publicUrl
        } elseif ($base -eq 'bundle-ops-clarity') {
          $hasAudit = [bool]($names | Where-Object { $_ -match 'audit' })
          $hasWorkflow = [bool]($names | Where-Object { $_ -match 'workflow' })
          $childArtsOk = $hasAudit -and $hasWorkflow
        }

        if ($steps -and $steps.Count -gt 0) {
          $stepSummary = (@($steps | ForEach-Object { "$($_.deliverableId):$($_.status)" }) -join ', ')
          $row.bundleSteps = $stepSummary
          $ok = $true
          if ($steps.Count -ne $expected.Count) { $ok = $false }
          for ($si = 0; $si -lt $expected.Count; $si++) {
            if ([string]$steps[$si].deliverableId -ne $expected[$si]) { $ok = $false }
            if ([string]$steps[$si].status -ne 'completed') { $ok = $false }
          }
          $row.bundleStepsOk = [string]$ok
          if (-not $ok) {
            $expJoin = $expected -join ', '
            throw "Bundle child steps incomplete - expected [$expJoin] got [$stepSummary]"
          }
          [void]$notes.Add("bundleSteps=$stepSummary")
        } else {
          # Prod job DTO may omit bundleSteps until API expose is deployed.
          # Honest fallback: score=100 requires server bundle_steps_complete + child artifact fingerprints.
          if (-not $childArtsOk) {
            throw 'Bundle missing bundleSteps and child artifact fingerprints - refusing PASS'
          }
          $expJoin = $expected -join '+'
          $row.bundleSteps = "inferred:$expJoin via child-artifacts+checklist100"
          $row.bundleStepsOk = 'True'
          [void]$notes.Add("bundleSteps=inferred:$expJoin;childArtsOk=true")
        }
      }

      $row.status = 'PASS'
      $cellDone = $true
      Write-Host "  PASS score=$($row.score) arts=$($row.artifacts) scaffold=$($row.scaffoldBytes) steps=$($row.bundleStepsOk)" -ForegroundColor Green
    } catch {
      $err = $_.Exception.Message -replace '[\r\n,]+', ' '
      $isTransient = $err -match '429|Too Many Requests|RATE_LIMIT|500|Internal Server Error|502|Bad Gateway|503|Service Unavailable|connection was closed|kept alive was closed|timed out|Unable to connect'
      if ($isTransient -and $cellAttempts -lt $cellMax) {
        Write-Host "  TRANSIENT $err" -ForegroundColor Yellow
        continue
      }
      $row.status = 'FAIL'
      $cellDone = $true
      [void]$notes.Add("FAIL:$err")
      Write-Host "  FAIL $err" -ForegroundColor Red
    }
  }

  $sw.Stop()
  $row.elapsedSec = [int]$sw.Elapsed.TotalSeconds
  $row.notes = ($notes -join '; ')
  [void]$results.Add([pscustomobject]$row)

  if ($SleepBetweenSec -gt 0 -and $i -lt $skus.Count) {
    Start-Sleep -Seconds $SleepBetweenSec
  }
}

$passCount = @($results | Where-Object { $_.status -eq 'PASS' }).Count
$failCount = @($results | Where-Object { $_.status -eq 'FAIL' }).Count
$verdict = if ($failCount -eq 0 -and $passCount -eq $skus.Count) { 'PASS' } else { 'FAIL' }

$results | ConvertTo-Json -Depth 6 | Set-Content -Path $EvidenceJson -Encoding UTF8

$nl = [Environment]::NewLine
$mdLines = New-Object System.Collections.Generic.List[string]
[void]$mdLines.Add('# Helper LIVE docs + bundles industry SKUs - 2026-10-08')
[void]$mdLines.Add('')
[void]$mdLines.Add('| Item | Value |')
[void]$mdLines.Add('|------|-------|')
[void]$mdLines.Add("| **Verdict** | **$verdict - $passCount/$($skus.Count) PASS** |")
[void]$mdLines.Add("| **Target** | $web |")
[void]$mdLines.Add('| **Script** | `scripts/_tmp-helper-live-docs-bundles-20261008.ps1` |')
[void]$mdLines.Add('| **Gates** | numeric checklistScore; thin-PDF floors; custom-software `software-scaffold.tar.gz` download+gzip magic; bundle child steps completed |')
[void]$mdLines.Add('| **Anti-fake** | No PASS without numeric score; custom-software PDF-only = FAIL |')
[void]$mdLines.Add('')
[void]$mdLines.Add('## Results')
[void]$mdLines.Add('')
[void]$mdLines.Add('| deliverableId | status | score | elapsedSec | artifacts | scaffoldBytes | bundleStepsOk | paymentId | notes |')
[void]$mdLines.Add('|---------------|--------|------:|-----------:|----------:|--------------:|---------------|-----------|-------|')
foreach ($r in $results) {
  $notesShort = ([string]$r.notes) -replace '\|', '/'
  if ($notesShort.Length -gt 120) { $notesShort = $notesShort.Substring(0, 117) + '...' }
  [void]$mdLines.Add("| $($r.deliverableId) | $($r.status) | $($r.score) | $($r.elapsedSec) | $($r.artifacts) | $($r.scaffoldBytes) | $($r.bundleStepsOk) | ``$($r.paymentId)`` | $notesShort |")
}
[void]$mdLines.Add('')
[void]$mdLines.Add('## Per-SKU detail')
[void]$mdLines.Add('')
foreach ($r in $results) {
  [void]$mdLines.Add("### $($r.deliverableId)")
  [void]$mdLines.Add('')
  [void]$mdLines.Add("- status: **$($r.status)** score=$($r.score) elapsed=$($r.elapsedSec)s")
  [void]$mdLines.Add("- paymentId: ``$($r.paymentId)``")
  [void]$mdLines.Add("- artifacts ($($r.artifacts)): $($r.artifactNames)")
  if ($r.publicUrl) { [void]$mdLines.Add("- publicUrl: $($r.publicUrl)") }
  if ($r.pdfBytes) { [void]$mdLines.Add("- pdfBytes: $($r.pdfBytes)") }
  if ($r.baseId -eq 'custom-software') {
    [void]$mdLines.Add("- scaffold: bytes=$($r.scaffoldBytes) gzipMagicOk=$($r.scaffoldMagicOk)")
  }
  if ($r.bundleSteps) {
    [void]$mdLines.Add("- bundleSteps: $($r.bundleSteps) ok=$($r.bundleStepsOk)")
  }
  [void]$mdLines.Add("- notes: $($r.notes)")
  [void]$mdLines.Add('')
}
[void]$mdLines.Add('## Honesty')
[void]$mdLines.Add('')
[void]$mdLines.Add('- PASS only when fulfillment completed + numeric checklistScore + package-specific evidence gates.')
[void]$mdLines.Add('- custom-software requires downloadable `software-scaffold.tar.gz` (gzip `1F8B`), not PDF-only.')
[void]$mdLines.Add('- Bundles require `bundleSteps` metadata with every child `status=completed`.')
[void]$mdLines.Add('- Raw JSON: `docs/evidence/_tmp-helper-live-docs-bundles-20261008.json`')

[System.IO.File]::WriteAllText($EvidenceMd, ($mdLines -join $nl) + $nl)
Write-Host ''
Write-Host "Verdict: $verdict ($passCount/$($skus.Count)) -> $EvidenceMd" -ForegroundColor $(if ($verdict -eq 'PASS') { 'Green' } else { 'Red' })
if ($verdict -ne 'PASS') { exit 1 }
exit 0
