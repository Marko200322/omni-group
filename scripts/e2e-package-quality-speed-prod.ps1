<#
.SYNOPSIS
  Prod quality + speed probe for every catalog deliverable package.

.DESCRIPTION
  For each package: checkout → mark-sent → confirm → poll job completed.
  Hard matrix-quality-gate (numeric checklistScore required).
  Captures wall-clock elapsedSec, artifact count, publicUrl HTTP 200,
  and primary PDF download bytes. Writes CSV + MD evidence.

.EXAMPLE
  .\scripts\e2e-package-quality-speed-prod.ps1
  .\scripts\e2e-package-quality-speed-prod.ps1 -IndustryCategory technology -SleepBetweenSec 20
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$IndustryCategory = 'marketing',
  [string[]]$DeliverableIds = @(),
  [int]$PollSec = 210,
  [int]$SleepBetweenSec = 20,
  [int]$RateLimitMaxAttempts = 12,
  [string]$ReportCsv = '',
  [string]$EvidenceMd = '',
  [switch]$Resume
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'fulfillment-catalog-packages.ps1')

$allPackages = @($script:FulfillmentCatalogPackages)
$slowIds = @($script:FulfillmentSlowPackageIds)

# Mirror server DOC_SUBSTANCE_THRESHOLDS minPdfBytes (thin PDF = FAIL).
$pdfFloors = @{
  'audit'                 = 12000
  'workflow-design'       = 8000
  'integration'           = 8000
  'setup-quick'           = 9000
  'setup-full'            = 8000
  'setup-custom'          = 8000
  'sales-enablement'      = 7000
  'custom-software'       = 6000
  'bundle-ops-clarity'    = 8000
  'white-label-setup'     = 7000
  'vertical-package'      = 5000
  'landing'               = 10000
  'website-business'      = 10000
  'website-ecommerce'     = 10000
  'support-priority'      = 5000
  'support-dedicated'     = 5000
  'lead-gen-retainer'     = 5000
  'ai-support-retainer'   = 5000
  'bundle-portal-presence'= 8000
  'bundle-sales-launch'   = 8000
}

$sitePackages = @('landing', 'website-business', 'website-ecommerce', 'bundle-portal-presence', 'bundle-sales-launch')

if (-not $ReportCsv) {
  $ReportCsv = Join-Path $repoRoot 'docs\evidence\package-quality-speed-20261007.csv'
}
if (-not $EvidenceMd) {
  $EvidenceMd = Join-Path $repoRoot 'docs\evidence\package-quality-speed-20261007.md'
}
$reportDir = Split-Path -Parent $ReportCsv
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir -Force | Out-Null }

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

function Escape-CsvField([string]$Value) {
  if ($null -eq $Value) { return '' }
  $v = $Value -replace '"', '""'
  if ($v -match '[,"\r\n]') { return '"' + $v + '"' }
  return $v
}

function Read-DoneIds {
  param([string]$Path)
  $set = @{}
  if (-not (Test-Path $Path)) { return $set }
  Import-Csv -Path $Path | ForEach-Object {
    if ($_.status -eq 'PASS') { $set[[string]$_.deliverableId] = $true }
  }
  return $set
}

$packages = if ($DeliverableIds.Count -gt 0) {
  @($DeliverableIds | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
} else {
  $allPackages
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -MaxAttempts $RateLimitMaxAttempts -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'Login failed' }
Write-Host "Login OK ($email)" -ForegroundColor Green

$csvHeader = 'deliverableId,industry,status,score,elapsedSec,artifacts,publicUrl,pdfBytes,notes'
$done = @{}
if ($Resume -and (Test-Path $ReportCsv)) {
  $done = Read-DoneIds -Path $ReportCsv
  Write-Host "Resume: $($done.Count) PASS rows already in $ReportCsv"
} else {
  Set-Content -Path $ReportCsv -Value $csvHeader -Encoding UTF8
}

Write-Host '== Package quality + speed (prod) ==' -ForegroundColor Cyan
Write-Host "  Web: $web"
Write-Host "  Industry: $IndustryCategory"
Write-Host "  Packages: $($packages.Count)"
Write-Host "  CSV: $ReportCsv"
Write-Host "  MD:  $EvidenceMd"

$passed = 0; $failed = 0; $i = 0
$results = New-Object System.Collections.Generic.List[object]

# Keep prior PASS rows when resuming so MD/CSV stay complete.
if ($Resume -and (Test-Path $ReportCsv)) {
  Import-Csv -Path $ReportCsv | ForEach-Object {
    if ($_.status -eq 'PASS') {
      $passed++
      [void]$results.Add($_)
    }
  }
  # Rewrite CSV with header + PASS only; FAIL rows will be re-run.
  $csvHeader | Set-Content -Path $ReportCsv -Encoding UTF8
  foreach ($row in $results) {
    $line = '{0},{1},{2},{3},{4},{5},{6},{7},{8}' -f `
      (Escape-CsvField $row.deliverableId),
      (Escape-CsvField $row.industry),
      (Escape-CsvField $row.status),
      (Escape-CsvField $row.score),
      (Escape-CsvField $row.elapsedSec),
      (Escape-CsvField $row.artifacts),
      (Escape-CsvField $row.publicUrl),
      (Escape-CsvField $row.pdfBytes),
      (Escape-CsvField $row.notes)
    Add-Content -Path $ReportCsv -Value $line -Encoding UTF8
  }
}

foreach ($pkg in $packages) {
  $i++
  if ($done.ContainsKey($pkg)) {
    Write-Host "[$i/$($packages.Count)] SKIP-DONE $pkg"
    continue
  }

  Write-Host ''
  Write-Host "[$i/$($packages.Count)] -- $pkg @ $IndustryCategory --" -ForegroundColor DarkCyan
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $status = 'FAIL'
  $score = ''
  $arts = 0
  $publicUrl = ''
  $pdfBytes = ''
  $notesList = New-Object System.Collections.Generic.List[string]
  $cellAttempts = 0
  $cellMaxAttempts = 4
  $cellDone = $false

  while (-not $cellDone -and $cellAttempts -lt $cellMaxAttempts) {
    $cellAttempts++
    if ($cellAttempts -gt 1) {
      $backoff = [Math]::Min(300, 45 * $cellAttempts)
      Write-Host "  cell retry $cellAttempts/$cellMaxAttempts after ${backoff}s..." -ForegroundColor Yellow
      Start-Sleep -Seconds $backoff
      try {
        $null = Invoke-WithRateLimitRetry -Label 're-login' -MaxAttempts $RateLimitMaxAttempts -Action {
          $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
          return ($r.Content | ConvertFrom-Json)
        }
      } catch {}
    }

    try {
      $dq = (@{
        deliverableId = $pkg
        industryCategory = $IndustryCategory
        paymentProvider = 'manual'
      } | ConvertTo-Json -Compress)

      $dco = Invoke-WithRateLimitRetry -Label "checkout-$pkg" -MaxAttempts $RateLimitMaxAttempts -Action {
        $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
          -ContentType 'application/json' -Body $dq -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
        return ($r.Content | ConvertFrom-Json)
      }
      if (-not $dco.ok) { throw "checkout failed: $($dco | ConvertTo-Json -Compress)" }
      $paymentId = [string]$dco.data.paymentId
      [void]$notesList.Add("paymentId=$paymentId")

      Invoke-WithRateLimitRetry -Label "mark-sent-$pkg" -MaxAttempts $RateLimitMaxAttempts -Action {
        Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST `
          -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
      } | Out-Null

      Invoke-WithRateLimitRetry -Label "confirm-$pkg" -MaxAttempts $RateLimitMaxAttempts -Action {
        Invoke-WebRequest -Uri "$web/api/atina/payments/manual/confirm/$paymentId" -Method POST `
          -ContentType 'application/json' -Body '{}' -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing | Out-Null
      } | Out-Null

      $pkgPoll = if ($pkg -in $slowIds) { [Math]::Max($PollSec, 240) } else { $PollSec }
      $deadline = (Get-Date).AddSeconds($pkgPoll)
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

      if ($job.artifacts) { $arts = @($job.artifacts).Count }

      # --- Hard quality gate (matrix-quality-gate) ---
      $checklist = $null
      if ($null -ne $job.checklistPassed -and "$($job.checklistPassed)" -ne '') {
        if (-not (Test-FiniteScore $job.checklistScore)) {
          throw 'checklistPassed set but checklistScore missing - refusing fake PASS'
        }
        $checklist = @{
          score = $job.checklistScore
          passed = [bool]$job.checklistPassed
          items = @()
        }
      }
      if (-not $checklist -and $job.fulfillmentMeta -and $job.fulfillmentMeta.checklist) {
        $c = $job.fulfillmentMeta.checklist
        if ((Test-FiniteScore $c.score) -and ($null -ne $c.passed -and "$($c.passed)" -ne '')) {
          $checklist = $c
        }
      }
      if (-not $checklist -and $job.result -and $job.result.fulfillmentMeta -and $job.result.fulfillmentMeta.checklist) {
        $c = $job.result.fulfillmentMeta.checklist
        if ((Test-FiniteScore $c.score) -and ($null -ne $c.passed -and "$($c.passed)" -ne '')) {
          $checklist = $c
        }
      }

      $checkPassed = $false
      $qualityGate = 'none'
      if ($checklist) {
        if (-not (Test-FiniteScore $checklist.score)) {
          throw 'Checklist present but score missing - refusing fake PASS'
        }
        $score = [string]$checklist.score
        $checkPassed = [bool]$checklist.passed
        $qualityGate = 'checklist'
        if (-not $checkPassed) {
          $fails = @($checklist.items | Where-Object { -not $_.passed -and $_.id -ne 'catalog_description' } | ForEach-Object { $_.id }) -join ', '
          throw "Checklist failed (${score}pct): $fails"
        }
      } else {
        # Substance / live URL alone are not enough - numeric checklistScore required.
        throw 'No numeric checklistScore - refusing fake PASS'
      }
      if (-not $checkPassed) { throw "Quality gate failed ($qualityGate)" }
      if (-not (Test-FiniteScore $score)) {
        throw "Numeric checklistScore required - refusing empty/non-numeric score ('$score')"
      }
      [void]$notesList.Add("gate=$qualityGate")

      # --- publicUrl live gate (required for site packages) ---
      $rawUrl = ''
      if ($job.publicUrl) { $rawUrl = [string]$job.publicUrl }
      elseif ($job.result -and $job.result.publicUrl) { $rawUrl = [string]$job.result.publicUrl }
      if ($rawUrl) {
        $livePath = $rawUrl
        if ($livePath -notmatch '^https?://') { $livePath = "$web$livePath" }
        $publicUrl = $livePath
        $live = Invoke-WebRequest -Uri $livePath -UseBasicParsing -TimeoutSec 60
        if ([int]$live.StatusCode -ne 200) { throw "Live publicUrl HTTP $($live.StatusCode)" }
        $title = if ($live.Content -match '<title>([^<]+)</title>') { $Matches[1].Trim() } else { '' }
        if ($title -match 'System Admin') { throw "Live publicUrl title is System Admin: $title" }
        if (-not $live.Content -or $live.RawContentLength -lt 500) {
          throw ("Live publicUrl body too thin ({0} bytes)" -f $live.RawContentLength)
        }
        [void]$notesList.Add("urlHttp=200")
      } elseif ($pkg -in $sitePackages) {
        throw 'Missing publicUrl on site package - refusing PASS'
      }

      # --- PDF download + thin-PDF gate ---
      $pdfArts = @()
      if ($job.artifacts) {
        $pdfArts = @($job.artifacts | Where-Object { [string]$_.filename -match '\.pdf$' })
      }
      if ($pdfArts.Count -gt 0) {
        $pdfName = [string]$pdfArts[0].filename
        $pdfDownloadUrl = "$web/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$([uri]::EscapeDataString($pdfName))"
        $pdfResp = Invoke-WebRequest -Uri $pdfDownloadUrl -WebSession $session -UseBasicParsing -TimeoutSec 120
        $bytes = [int]$pdfResp.RawContentLength
        if ($pdfResp.StatusCode -ne 200 -or $bytes -lt 200) {
          throw "PDF download failed status=$($pdfResp.StatusCode) bytes=$bytes"
        }
        $pdfBytes = [string]$bytes
        $floor = 2000
        if ($pdfFloors.ContainsKey($pkg)) { $floor = [int]$pdfFloors[$pkg] }
        if ($bytes -lt $floor) {
          throw "Thin PDF gate: $pdfName is ${bytes}B < floor ${floor}B"
        }
        [void]$notesList.Add("pdf=$pdfName")
      } else {
        [void]$notesList.Add('noPdf')
        # Site packages may be URL-primary; still require checklist score.
        if ($pkg -notin $sitePackages -and $arts -eq 0) {
          throw 'No artifacts and no PDF - refusing PASS'
        }
      }

      # Final: score must be numeric (user requirement: refuse empty).
      if (-not (Test-FiniteScore $score)) {
        throw "Score missing/non-numeric ('$score') - refusing fake PASS"
      }

      $status = 'PASS'
      $passed++
      $cellDone = $true
      Write-Host "  PASS score=$score arts=$arts pdfBytes=$pdfBytes elapsed=$([int]$sw.Elapsed.TotalSeconds)s" -ForegroundColor Green
    } catch {
      $err = $_.Exception.Message -replace '[\r\n,]+', ' '
      $isTransient = $err -match '429|Too Many Requests|RATE_LIMIT|502|Bad Gateway|503|Service Unavailable|connection was closed|kept alive was closed|timed out|Unable to connect'
      if ($isTransient -and $cellAttempts -lt $cellMaxAttempts) {
        Write-Host "  TRANSIENT $err" -ForegroundColor Yellow
        $notesList.Clear()
        continue
      }
      $status = 'FAIL'
      $failed++
      $cellDone = $true
      [void]$notesList.Add("FAIL:$err")
      Write-Host "  FAIL $err" -ForegroundColor Red
      if ($err -match '401|403|csrf|Unauthorized|Forbidden') {
        try {
          $null = Invoke-WithRateLimitRetry -Label 're-login' -MaxAttempts $RateLimitMaxAttempts -Action {
            $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
            return ($r.Content | ConvertFrom-Json)
          }
          Write-Host '  (re-login OK)' -ForegroundColor DarkYellow
        } catch {}
      }
    }
  }

  $sw.Stop()
  $elapsed = [int]$sw.Elapsed.TotalSeconds
  $notes = ($notesList -join '; ') -replace '"', ''''
  $row = [pscustomobject]@{
    deliverableId = $pkg
    industry      = $IndustryCategory
    status        = $status
    score         = $score
    elapsedSec    = $elapsed
    artifacts     = $arts
    publicUrl     = $publicUrl
    pdfBytes      = $pdfBytes
    notes         = $notes
  }
  [void]$results.Add($row)
  $line = '{0},{1},{2},{3},{4},{5},{6},{7},{8}' -f `
    (Escape-CsvField $pkg),
    (Escape-CsvField $IndustryCategory),
    (Escape-CsvField $status),
    (Escape-CsvField $score),
    $elapsed,
    $arts,
    (Escape-CsvField $publicUrl),
    (Escape-CsvField $pdfBytes),
    (Escape-CsvField $notes)
  Add-Content -Path $ReportCsv -Value $line -Encoding UTF8

  if ($SleepBetweenSec -gt 0 -and $i -lt $packages.Count) {
    Start-Sleep -Seconds $SleepBetweenSec
  }
}

# --- MD summary sorted by speed ---
$sorted = @($results | Sort-Object { [int]($_.elapsedSec) })
$passCount = @($results | Where-Object { $_.status -eq 'PASS' }).Count
$failCount = @($results | Where-Object { $_.status -eq 'FAIL' }).Count
$verdict = if ($failCount -eq 0 -and $passCount -eq $packages.Count) { 'PASS' } else { 'FAIL' }

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine('# Package quality + speed - 2026-10-07')
[void]$md.AppendLine('')
[void]$md.AppendLine("| Item | Value |")
[void]$md.AppendLine('|------|-------|')
[void]$md.AppendLine("| **Verdict** | **$verdict - $passCount/$($packages.Count) PASS** |")
[void]$md.AppendLine("| **Target** | $web |")
[void]$md.AppendLine("| **Industry** | $IndustryCategory |")
[void]$md.AppendLine("| **CSV** | ``$([IO.Path]::GetFileName($ReportCsv))`` |")
[void]$md.AppendLine("| **Script** | ``scripts/e2e-package-quality-speed-prod.ps1`` |")
[void]$md.AppendLine("| **Gates** | numeric checklistScore; thin-PDF floors; publicUrl HTTP 200 for site pkgs |")
[void]$md.AppendLine("| **SleepBetweenSec** | $SleepBetweenSec |")
[void]$md.AppendLine('')
[void]$md.AppendLine('## Results (sorted by elapsedSec)')
[void]$md.AppendLine('')
[void]$md.AppendLine('| deliverableId | status | score | elapsedSec | artifacts | pdfBytes | publicUrl | quality verdict |')
[void]$md.AppendLine('|---------------|--------|------:|-----------:|----------:|---------:|-----------|-----------------|')
foreach ($r in $sorted) {
  $urlShort = if ($r.publicUrl) { 'yes' } else { '' }
  $qv = if ($r.status -eq 'PASS') { 'PASS (checklist+evidence)' } else { "FAIL: $($r.notes)" }
  [void]$md.AppendLine("| $($r.deliverableId) | $($r.status) | $($r.score) | $($r.elapsedSec) | $($r.artifacts) | $($r.pdfBytes) | $urlShort | $qv |")
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## Counts')
[void]$md.AppendLine('')
[void]$md.AppendLine('| Status | Count |')
[void]$md.AppendLine('|--------|------:|')
[void]$md.AppendLine("| PASS | $passCount |")
[void]$md.AppendLine("| FAIL | $failCount |")
[void]$md.AppendLine('')
[void]$md.AppendLine('Honest run - PASS only when checklistScore is numeric and evidence (PDF/URL) meets floors.')
Set-Content -Path $EvidenceMd -Value $md.ToString() -Encoding UTF8

Write-Host ''
Write-Host "QUALITY+SPEED DONE: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
Write-Host "CSV: $ReportCsv"
Write-Host "MD:  $EvidenceMd"
if ($failed -gt 0) { exit 1 }
exit 0
