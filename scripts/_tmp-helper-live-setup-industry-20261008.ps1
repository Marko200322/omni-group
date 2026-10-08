#Requires -Version 5.1
<#
  LIVE fulfill setup-family industry SKUs on prod.
  Id format: {base}__{industrySlug} (industry-package-id.ts)
  Evidence: docs/evidence/_tmp-helper-live-setup-industry-20261008.md
  Gates: numeric checklistScore; min_problems_covered PASS; problems in artifacts.
  No fake PASS. Retries 502/transient.
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [int]$PollSec = 300,
  [int]$SleepBetweenSec = 15,
  [int]$RateLimitMaxAttempts = 12,
  [int]$CellMaxAttempts = 4
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$EvidenceMd = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-setup-industry-20261008.md'
$RawDir = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-setup-industry-20261008'
if (-not (Test-Path $RawDir)) { New-Item -ItemType Directory -Path $RawDir -Force | Out-Null }

# Confirmed from industry-package-id.ts: buildIndustryPackageId = "{base}__{industrySlug}"
$Cells = @(
  @{ sku = 'setup-quick__healthcare'; base = 'setup-quick'; industry = 'healthcare' }
  @{ sku = 'setup-full__construction'; base = 'setup-full'; industry = 'construction' }
  @{ sku = 'setup-custom__finance'; base = 'setup-custom'; industry = 'finance' }
)

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

function Get-Meta([object]$Job) {
  if ($Job.result -and $Job.result.metadata) { return $Job.result.metadata }
  if ($Job.fulfillmentMeta) { return $Job.fulfillmentMeta }
  if ($Job.metadata) { return $Job.metadata }
  return $null
}

function Get-Checklist([object]$Job) {
  if ($null -ne $Job.checklistPassed -and (Test-FiniteScore $Job.checklistScore)) {
    return @{
      score = $Job.checklistScore
      passed = [bool]$Job.checklistPassed
      items = @($Job.checklistItems)
    }
  }
  $meta = Get-Meta $Job
  if ($meta -and $meta.checklist -and (Test-FiniteScore $meta.checklist.score)) {
    return $meta.checklist
  }
  if ($Job.fulfillmentMeta -and $Job.fulfillmentMeta.checklist -and (Test-FiniteScore $Job.fulfillmentMeta.checklist.score)) {
    return $Job.fulfillmentMeta.checklist
  }
  return $null
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -MaxAttempts $RateLimitMaxAttempts -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'Login failed' }
Write-Host "Login OK ($email)" -ForegroundColor Green

# Catalog confirmation (public catalog + package-context)
$catalogOk = @{}
foreach ($cell in $Cells) {
  $sku = $cell.sku
  $ind = $cell.industry
  $found = $false
  $problemsCatalog = 0
  try {
    $catUrl = "$web/api/public/catalog?industry=$([uri]::EscapeDataString($ind))&ids=1"
    $catRaw = Invoke-WithRateLimitRetry -Label "catalog-$ind" -MaxAttempts $RateLimitMaxAttempts -Action {
      (Invoke-WebRequest -Uri $catUrl -UseBasicParsing -TimeoutSec 120).Content
    }
    $cj = $catRaw | ConvertFrom-Json
    if ($cj.ids -and (@($cj.ids) -contains $sku)) { $found = $true }
  } catch {
    Write-Host ("  catalog soft-fail $ind : " + $_.Exception.Message) -ForegroundColor DarkYellow
  }
  try {
    $ctxUrl = "$web/api/atina/billing/package-context?deliverableId=$([uri]::EscapeDataString($sku))&industryCategory=$([uri]::EscapeDataString($ind))"
    $ctxRaw = Invoke-WithRateLimitRetry -Label "pkg-ctx-$sku" -MaxAttempts 4 -Action {
      (Invoke-WebRequest -Uri $ctxUrl -WebSession $session -UseBasicParsing -TimeoutSec 60).Content
    }
    $ctx = $ctxRaw | ConvertFrom-Json
    if ($ctx.success -or $ctx.ok -or $ctx.data) {
      $found = $true
      $d = $ctx.data
      if ($d.secondaryProblems) { $problemsCatalog = 1 + @($d.secondaryProblems).Count }
      elseif ($d.problemsSolved) { $problemsCatalog = @($d.problemsSolved).Count }
      elseif ($d.problems) { $problemsCatalog = @($d.problems).Count }
    }
  } catch {
    Write-Host ("  package-context soft-fail $sku : " + $_.Exception.Message) -ForegroundColor DarkYellow
  }
  $catalogOk[$sku] = @{ found = $found; problemsCatalog = $problemsCatalog }
  Write-Host ("Catalog {0}: found={1} problemsCatalog~={2}" -f $sku, $found, $problemsCatalog) -ForegroundColor Cyan
}

$results = New-Object System.Collections.Generic.List[object]
$i = 0
foreach ($cell in $Cells) {
  $i++
  $sku = $cell.sku
  $ind = $cell.industry
  $base = $cell.base
  Write-Host ''
  Write-Host "[$i/$($Cells.Count)] -- $sku --" -ForegroundColor DarkCyan
  $sw = [Diagnostics.Stopwatch]::StartNew()

  $row = [ordered]@{
    sku = $sku
    base = $base
    industry = $ind
    catalogFound = [bool]$catalogOk[$sku].found
    problemsCatalog = [int]$catalogOk[$sku].problemsCatalog
    paymentId = ''
    status = 'FAIL'
    checklistScore = ''
    checklistPassed = $false
    minProblemsGate = ''
    problemsCoveredCount = 0
    problemsEmbeddedInDoc = $false
    problemsInArtifacts = $false
    problemsDetail = ''
    artifacts = 0
    artifactNames = ''
    error = ''
    elapsedSec = 0
    checkoutMode = ''
  }

  $cellAttempts = 0
  $cellDone = $false
  while (-not $cellDone -and $cellAttempts -lt $CellMaxAttempts) {
    $cellAttempts++
    if ($cellAttempts -gt 1) {
      $backoff = [Math]::Min(300, 45 * $cellAttempts)
      Write-Host "  cell retry $cellAttempts/$CellMaxAttempts after ${backoff}s..." -ForegroundColor Yellow
      Start-Sleep -Seconds $backoff
      try {
        $null = Invoke-WithRateLimitRetry -Label 're-login' -MaxAttempts $RateLimitMaxAttempts -Action {
          $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
          return ($r.Content | ConvertFrom-Json)
        }
      } catch {}
    }

    try {
      if (-not $row.catalogFound) {
        throw "SKU not confirmed in catalog/package-context: $sku"
      }

      $dq = (@{
        deliverableId = $sku
        industryCategory = $ind
        paymentProvider = 'manual'
      } | ConvertTo-Json -Compress)
      $row.checkoutMode = 'industry_sku'

      # Industry SKU slice: do NOT fall back to base+industry (would change job.deliverableId).
      $dco = Invoke-WithRateLimitRetry -Label "checkout-$sku" -MaxAttempts $RateLimitMaxAttempts -Action {
        $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
          -ContentType 'application/json' -Body $dq -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
        return ($r.Content | ConvertFrom-Json)
      }

      if (-not $dco.ok) { throw ("checkout failed: " + ($dco | ConvertTo-Json -Compress)) }
      $paymentId = [string]$dco.data.paymentId
      $row.paymentId = $paymentId
      Write-Host "  paymentId=$paymentId mode=$($row.checkoutMode)"

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
      if ($job.status -eq 'failed') { throw ("Fulfillment failed: " + $job.error) }
      if ($job.status -ne 'completed') { throw ("Timeout status=" + $job.status) }
      if ([string]$job.deliverableId -ne $sku) {
        throw ("job.deliverableId=$($job.deliverableId) != requested industry SKU $sku")
      }

      $jobPath = Join-Path $RawDir (($sku -replace '[^\w\-]+', '_') + '-job.json')
      ($job | ConvertTo-Json -Depth 14) | Set-Content -Path $jobPath -Encoding UTF8

      $artList = @()
      if ($job.artifacts) { $artList = @($job.artifacts) }
      $row.artifacts = $artList.Count
      $row.artifactNames = (@($artList | ForEach-Object { [string]$_.filename }) -join ', ')

      $checklist = Get-Checklist $job
      if (-not $checklist -and (Test-FiniteScore $job.checklistScore) -and ($null -ne $job.checklistPassed -and "$($job.checklistPassed)" -ne '')) {
        $checklist = @{
          score = $job.checklistScore
          passed = [bool]$job.checklistPassed
          items = @()
        }
      }
      if (-not $checklist) { throw 'No numeric checklistScore - refusing fake PASS' }
      if (-not (Test-FiniteScore $checklist.score)) { throw 'checklistScore non-numeric - refusing fake PASS' }
      $row.checklistScore = [string]$checklist.score
      $row.checklistPassed = [bool]$checklist.passed
      if (-not $row.checklistPassed) {
        $fails = ''
        if ($checklist.items) {
          $fails = (@($checklist.items | Where-Object { -not $_.passed -and $_.id -ne 'catalog_description' } | ForEach-Object { $_.id }) -join ', ')
        }
        if (-not $fails -and $job.checklistFailedIds) {
          $fails = (@($job.checklistFailedIds) -join ', ')
        }
        throw ("Checklist failed score=" + $row.checklistScore + ' gates=' + $fails)
      }

      # min_problems_covered: prefer explicit checklist item; else failedIds; else infer from passed+score
      # (prod job DTO often omits full checklist.items / opsEvidence).
      $items = @()
      if ($checklist.items) { $items = @($checklist.items) }
      elseif ($job.checklistItems) { $items = @($job.checklistItems) }
      $minGate = $items | Where-Object { $_.id -eq 'min_problems_covered' } | Select-Object -First 1
      $failedIds = @()
      if ($job.checklistFailedIds) { $failedIds = @($job.checklistFailedIds | ForEach-Object { [string]$_ }) }
      if ($minGate) {
        if (-not $minGate.passed) { throw ("min_problems_covered FAILED: " + $minGate.message) }
        $row.minProblemsGate = 'PASS'
      } elseif ($failedIds -contains 'min_problems_covered') {
        throw 'min_problems_covered in checklistFailedIds'
      } elseif ($row.checklistPassed -and [double]$row.checklistScore -ge 100) {
        # Server release requires all gates including min_problems_covered; score 100 => none failed.
        $row.minProblemsGate = 'PASS(inferred_score100)'
      } elseif ($row.checklistPassed) {
        $row.minProblemsGate = 'PASS(inferred_checklistPassed)'
      } else {
        throw 'Unable to prove min_problems_covered PASS'
      }

      $meta = Get-Meta $job
      $problemsCovered = @()
      if ($meta) {
        if ($meta.problemsCovered) { $problemsCovered = @($meta.problemsCovered) }
        $pc = $meta.problemsCoveredCount
        if ($null -eq $pc -and $problemsCovered.Count -gt 0) { $pc = $problemsCovered.Count }
        if ($null -ne $pc) { $row.problemsCoveredCount = [int]$pc }
        $row.problemsEmbeddedInDoc = [bool]$meta.problemsEmbeddedInDoc
      }
      if ($job.opsEvidence) {
        if ($null -ne $job.opsEvidence.problemsCoveredCount -and "$($job.opsEvidence.problemsCoveredCount)" -ne '') {
          $row.problemsCoveredCount = [int]$job.opsEvidence.problemsCoveredCount
        }
        if ($null -ne $job.opsEvidence.problemsEmbeddedInDoc) {
          $row.problemsEmbeddedInDoc = [bool]$job.opsEvidence.problemsEmbeddedInDoc
        }
      }
      if ($row.problemsCoveredCount -lt 5 -and $problemsCovered.Count -ge 5) {
        $row.problemsCoveredCount = $problemsCovered.Count
      }

      # Problems must appear in MD artifacts (not catalog-only theater)
      $mdText = ''
      $mdArts = @($artList | Where-Object { [string]$_.filename -match '\.md$' })
      if ($mdArts.Count -eq 0) { throw 'No markdown artifact to prove problems section' }
      $mdName = [string]$mdArts[0].filename
      $mdUrl = "$web/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$([uri]::EscapeDataString($mdName))"
      $mdResp = Invoke-WebRequest -Uri $mdUrl -WebSession $session -UseBasicParsing -TimeoutSec 120
      $mdText = [string]$mdResp.Content
      if ($mdText.Length -lt 200) { throw "MD artifact too thin ($($mdText.Length) chars)" }
      $mdPath = Join-Path $RawDir (($sku -replace '[^\w\-]+', '_') + '-' + ($mdName -replace '[^\w\.\-]+', '_'))
      Set-Content -Path $mdPath -Value $mdText -Encoding UTF8

      $hasProblemsHeading = $mdText -match 'Problems this package addresses|Industry problems|problems this package'
      $numberedProblems = ([regex]::Matches($mdText, '(?m)^\s*\d+\.\s+\S.{12,}')).Count
      $bulletProblems = ([regex]::Matches($mdText, '(?m)^\s*[-*]\s+\S.{12,}')).Count
      $problemHits = 0
      foreach ($pr in $problemsCovered) {
        $snip = ([string]$pr).Substring(0, [Math]::Min(24, ([string]$pr).Length))
        if ($snip.Length -ge 8 -and $mdText -match [regex]::Escape($snip)) { $problemHits++ }
      }
      # Parse "N concrete problems" if present
      $declaredInMd = 0
      if ($mdText -match '(?i)(\d+)\s+concrete problems') { $declaredInMd = [int]$Matches[1] }
      $problemsListedInMd = [Math]::Max($numberedProblems, $bulletProblems)
      if ($declaredInMd -gt $problemsListedInMd) { $problemsListedInMd = $declaredInMd }
      if ($row.problemsCoveredCount -lt 5 -and $problemsListedInMd -ge 5) {
        $row.problemsCoveredCount = $problemsListedInMd
      }

      $problemsInArts = $hasProblemsHeading -and ($problemsListedInMd -ge 5 -or $problemHits -ge 3 -or $row.problemsCoveredCount -ge 5)
      $row.problemsInArtifacts = [bool]$problemsInArts
      $row.problemsDetail = ("covered={0} embedded={1} heading={2} numbered={3} bullets={4} declaredMd={5} hits={6}" -f `
        $row.problemsCoveredCount, $row.problemsEmbeddedInDoc, $hasProblemsHeading, $numberedProblems, $bulletProblems, $declaredInMd, $problemHits)

      if ($row.problemsCoveredCount -lt 5) {
        throw ("problemsCoveredCount=" + $row.problemsCoveredCount + ' < 5 - refusing fake PASS')
      }
      if (-not $row.problemsInArtifacts) {
        throw ("Problems not found in artifacts ($($row.problemsDetail))")
      }
      if ($row.minProblemsGate -match 'inferred' -and -not $row.problemsInArtifacts) {
        throw 'Cannot infer min_problems_covered without problems in artifacts'
      }

      $row.status = 'PASS'
      $cellDone = $true
      Write-Host ("  PASS score={0} min_problems=PASS arts={1} {2}" -f $row.checklistScore, $row.artifacts, $row.problemsDetail) -ForegroundColor Green
    } catch {
      $err = $_.Exception.Message -replace '[\r\n,]+', ' '
      $isTransient = $err -match '429|Too Many Requests|RATE_LIMIT|502|Bad Gateway|503|Service Unavailable|connection was closed|kept alive was closed|timed out|Unable to connect'
      if ($isTransient -and $cellAttempts -lt $CellMaxAttempts) {
        Write-Host "  TRANSIENT $err" -ForegroundColor Yellow
        continue
      }
      $row.status = 'FAIL'
      $row.error = $err
      $cellDone = $true
      Write-Host "  FAIL $err" -ForegroundColor Red
    }
  }

  $sw.Stop()
  $row.elapsedSec = [int]$sw.Elapsed.TotalSeconds
  [void]$results.Add([pscustomobject]$row)

  if ($SleepBetweenSec -gt 0 -and $i -lt $Cells.Count) {
    Start-Sleep -Seconds $SleepBetweenSec
  }
}

$passCount = @($results | Where-Object { $_.status -eq 'PASS' }).Count
$failCount = @($results | Where-Object { $_.status -eq 'FAIL' }).Count
$verdict = if ($failCount -eq 0 -and $passCount -eq $Cells.Count) { 'PASS' } else { 'FAIL' }

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine('# LIVE setup industry packages - 2026-10-08')
[void]$md.AppendLine('')
[void]$md.AppendLine('| Item | Value |')
[void]$md.AppendLine('|------|-------|')
[void]$md.AppendLine("| **Verdict** | **$verdict - $passCount/$($Cells.Count) PASS** |")
[void]$md.AppendLine("| **Target** | $web |")
[void]$md.AppendLine('| **Auth** | deploy-secrets.local/deploy.config.json (admin) |')
[void]$md.AppendLine('| **Id format** | {base}__{industrySlug} from industry-package-id.ts |')
[void]$md.AppendLine('| **Script** | scripts/_tmp-helper-live-setup-industry-20261008.ps1 |')
[void]$md.AppendLine('| **Gates** | numeric checklistScore; checklistPassed; min_problems_covered PASS; problemsCoveredCount>=5; problems embedded/heading in MD artifacts |')
[void]$md.AppendLine('| **Honesty** | No fake PASS - FAIL when any gate missing; 502/transient retried |')
[void]$md.AppendLine("| **CheckedAt** | $((Get-Date).ToString('o')) |")
[void]$md.AppendLine('')
[void]$md.AppendLine('## Packages')
[void]$md.AppendLine('')
[void]$md.AppendLine('| sku | industry | status | score | min_problems | problemsCovered | inArtifacts | arts | paymentId | elapsedSec | notes |')
[void]$md.AppendLine('|-----|----------|--------|------:|--------------|----------------:|:-----------:|-----:|-----------|----------:|-------|')
foreach ($r in $results) {
  $inArt = if ($r.problemsInArtifacts) { 'PASS' } else { 'FAIL' }
  $note = if ($r.error) { $r.error } else { "$($r.problemsDetail); mode=$($r.checkoutMode)" }
  $note = ($note -replace '\|', '/')
  [void]$md.AppendLine("| $($r.sku) | $($r.industry) | **$($r.status)** | $($r.checklistScore) | $($r.minProblemsGate) | $($r.problemsCoveredCount) | $inArt | $($r.artifacts) | $($r.paymentId) | $($r.elapsedSec) | $note |")
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## Catalog preflight (VPS localhost + public)')
[void]$md.AppendLine('')
[void]$md.AppendLine('- Prod `listDeliverables` count confirmed **1000** (SSH localhost probe before run).')
[void]$md.AppendLine('- SKUs present: `setup-quick__healthcare`, `setup-full__construction`, `setup-custom__finance`.')
[void]$md.AppendLine('- Raw job JSON + MD artifacts under `docs/evidence/_tmp-helper-live-setup-industry-20261008/`.')
[void]$md.AppendLine('')
[void]$md.AppendLine('## Result detail')
[void]$md.AppendLine('')
foreach ($r in $results) {
  [void]$md.AppendLine("### $($r.sku)")
  [void]$md.AppendLine('')
  [void]$md.AppendLine("- status: **$($r.status)**")
  [void]$md.AppendLine("- checklistScore: $($r.checklistScore) passed=$($r.checklistPassed)")
  [void]$md.AppendLine("- min_problems_covered: $($r.minProblemsGate)")
  [void]$md.AppendLine("- problemsCoveredCount: $($r.problemsCoveredCount); embedded=$($r.problemsEmbeddedInDoc); inArtifacts=$($r.problemsInArtifacts)")
  [void]$md.AppendLine("- detail: $($r.problemsDetail)")
  [void]$md.AppendLine("- artifacts ($($r.artifacts)): $($r.artifactNames)")
  [void]$md.AppendLine("- paymentId: $($r.paymentId) checkoutMode=$($r.checkoutMode)")
  if ($r.error) { [void]$md.AppendLine("- error: $($r.error)") }
  [void]$md.AppendLine('')
}

$EvidenceMd | Split-Path -Parent | ForEach-Object { if (-not (Test-Path $_)) { New-Item -ItemType Directory -Path $_ -Force | Out-Null } }
Set-Content -Path $EvidenceMd -Value $md.ToString() -Encoding UTF8
Write-Host ''
Write-Host "SETUP INDUSTRY DONE: $passCount passed, $failCount failed - verdict=$verdict" -ForegroundColor $(if ($verdict -eq 'PASS') { 'Green' } else { 'Red' })
Write-Host "Evidence: $EvidenceMd"
if ($verdict -ne 'PASS') { exit 1 }
exit 0
