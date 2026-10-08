<#
  LIVE probe: 5 ops/retainer industry packages.
  Proves tickets/CRM/analysis/RAG + problemsCovered>=5 + checklistScore.
  No fake PASS. No fake leads.
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [int]$PollSec = 180,
  [int]$SleepBetweenSec = 12,
  [int]$RateLimitMaxAttempts = 12
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$EvidenceMd = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-retainer-industry-20261008.md'
$RawDir = Join-Path $repoRoot 'docs\evidence\_tmp-helper-live-retainer-industry-20261008'
if (-not (Test-Path $RawDir)) { New-Item -ItemType Directory -Path $RawDir -Force | Out-Null }

$Cells = @(
  @{ sku = 'support-priority__healthcare'; base = 'support-priority'; industry = 'healthcare'; expect = @('kickoff_ticket','support_automation','sla_pack','min_problems_covered') }
  @{ sku = 'support-dedicated__legal'; base = 'support-dedicated'; industry = 'legal'; expect = @('kickoff_ticket','support_automation','sla_pack','min_problems_covered') }
  @{ sku = 'lead-gen-retainer__marketing'; base = 'lead-gen-retainer'; industry = 'marketing'; expect = @('lead_gen_kickoff','lead_gen_analysis_before_hunt','crm_bootstrap','no_simulated_harvest','min_problems_covered') }
  @{ sku = 'ai-support-retainer__technology'; base = 'ai-support-retainer'; industry = 'technology'; expect = @('ai_support_setup','kickoff_ticket','min_problems_covered') }
  @{ sku = 'vertical-package__construction'; base = 'vertical-package'; industry = 'construction'; expect = @('crm_bootstrap','kickoff_ticket','modules_metadata','min_problems_covered') }
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
    return @{ score = $Job.checklistScore; passed = [bool]$Job.checklistPassed; items = @($Job.checklistItems) }
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

# Catalog probe: catalog-quality (1000 count) + package-matrix per industry
$cqRaw = Invoke-WithRateLimitRetry -Label 'catalog-quality' -MaxAttempts $RateLimitMaxAttempts -Action {
  (Invoke-WebRequest -Uri "$web/api/atina/billing/catalog-quality" -WebSession $session -UseBasicParsing -TimeoutSec 120).Content
}
$cq = ($cqRaw | ConvertFrom-Json).data
$fullCatalogCount = [int]$cq.fullPackageCatalogCount
Write-Host ("Catalog-quality fullPackageCatalogCount={0} base={1}" -f $fullCatalogCount, $cq.basePackageCount) -ForegroundColor Cyan

$catalogHits = @{}
foreach ($ind in @($Cells | ForEach-Object { $_.industry } | Select-Object -Unique)) {
  $url = "$web/api/atina/billing/package-matrix?industryCategory=$([uri]::EscapeDataString($ind))"
  $raw = Invoke-WithRateLimitRetry -Label "matrix-$ind" -MaxAttempts $RateLimitMaxAttempts -Action {
    (Invoke-WebRequest -Uri $url -WebSession $session -UseBasicParsing -TimeoutSec 120).Content
  }
  $j = ($raw | ConvertFrom-Json).data
  $pkgs = @()
  if ($j.packages) { $pkgs = @($j.packages) }
  $byBase = @{}
  foreach ($p in $pkgs) {
    if ($p.deliverableId) { $byBase[[string]$p.deliverableId] = $p }
  }
  $catalogHits[$ind] = @{
    sellablePackages = $fullCatalogCount
    byBase = $byBase
    filteredCount = $pkgs.Count
  }
  Write-Host ("Package-matrix industry={0} packages={1}" -f $ind, $pkgs.Count) -ForegroundColor Cyan
}

$results = New-Object System.Collections.Generic.List[object]
$i = 0
foreach ($cell in $Cells) {
  $i++
  $sku = $cell.sku
  $ind = $cell.industry
  $base = $cell.base
  Write-Host ""
  Write-Host "[$i/$($Cells.Count)] -- $sku --" -ForegroundColor DarkCyan
  $sw = [Diagnostics.Stopwatch]::StartNew()

  $cat = $catalogHits[$ind]
  $inIds = $false
  $problemsCatalog = 0
  if ($cat -and $cat.byBase -and $cat.byBase.ContainsKey($base)) {
    $inIds = $true
    $mp = $cat.byBase[$base]
    $n = 0
    if ($mp.primaryProblem) { $n++ }
    if ($mp.secondaryProblems) { $n += @($mp.secondaryProblems).Count }
    $problemsCatalog = $n
  }
  # package-context for exact industry SKU (confirms locked industry + problem list)
  try {
    $ctxUrl = "$web/api/atina/billing/package-context?deliverableId=$([uri]::EscapeDataString($sku))&industryCategory=$([uri]::EscapeDataString($ind))"
    $ctxRaw = Invoke-WithRateLimitRetry -Label "pkg-ctx-$sku" -MaxAttempts 4 -Action {
      (Invoke-WebRequest -Uri $ctxUrl -WebSession $session -UseBasicParsing -TimeoutSec 60).Content
    }
    $ctxData = ($ctxRaw | ConvertFrom-Json).data
    if ($ctxData.problemsSolved) { $problemsCatalog = @($ctxData.problemsSolved).Count; $inIds = $true }
    elseif ($ctxData.primaryProblem) {
      $problemsCatalog = 1 + @($ctxData.secondaryProblems).Count
      $inIds = $true
    }
  } catch {
    Write-Host ("  package-context probe soft-fail: " + $_.Exception.Message) -ForegroundColor DarkYellow
  }
  # Industry SKU is sellable when full catalog is 1000 and matrix/context knows the base x industry
  if ($fullCatalogCount -ge 1000 -and $inIds) { $inIds = $true }

  $row = [ordered]@{
    sku = $sku
    base = $base
    industry = $ind
    catalogFound = $inIds
    catalogSellable = if ($cat) { $cat.sellablePackages } else { 0 }
    problemsCatalog = $problemsCatalog
    paymentId = ''
    status = 'FAIL'
    checklistScore = ''
    checklistPassed = $false
    artifacts = 0
    artifactTypes = ''
    problemsCoveredCount = 0
    problemsEmbeddedInDoc = $false
    kickoffTicketId = ''
    crmBootstrap = ''
    leadGenMode = ''
    leadsGenerated = ''
    sampleLeadsSeeded = ''
    analysisRules = ''
    ragSeeded = ''
    ragRecallHits = ''
    expectGates = ($cell.expect -join ',')
    failedGates = ''
    error = ''
    elapsedSec = 0
    checkoutMode = ''
  }

  try {
    if (-not $inIds) {
      throw ("SKU not resolved in package-matrix/context for industry=" + $ind + " : " + $sku + " (fullCatalog=" + $row.catalogSellable + ")")
    }
    if ($problemsCatalog -lt 5) {
      throw ("Catalog/context problems=" + $problemsCatalog + " < 5 for " + $sku)
    }

    $dq = (@{
      deliverableId = $sku
      industryCategory = $ind
      paymentProvider = 'manual'
    } | ConvertTo-Json -Compress)
    $row.checkoutMode = 'industry_sku'

    $dco = $null
    try {
      $dco = Invoke-WithRateLimitRetry -Label "checkout-$sku" -MaxAttempts $RateLimitMaxAttempts -Action {
        $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
          -ContentType 'application/json' -Body $dq -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
        return ($r.Content | ConvertFrom-Json)
      }
    } catch {
      Write-Host '  compound checkout failed; trying base+industry...' -ForegroundColor Yellow
      $dq2 = (@{
        deliverableId = $base
        industryCategory = $ind
        paymentProvider = 'manual'
      } | ConvertTo-Json -Compress)
      $row.checkoutMode = 'base_plus_industry_fallback'
      $dco = Invoke-WithRateLimitRetry -Label "checkout-$base-$ind" -MaxAttempts $RateLimitMaxAttempts -Action {
        $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
          -ContentType 'application/json' -Body $dq2 -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
        return ($r.Content | ConvertFrom-Json)
      }
    }

    if (-not $dco.ok) { throw ("checkout failed: " + ($dco | ConvertTo-Json -Compress)) }
    $paymentId = [string]$dco.data.paymentId
    $row.paymentId = $paymentId

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

    $jobPath = Join-Path $RawDir (($sku -replace '[^\w\-]+','_') + '-job.json')
    ($job | ConvertTo-Json -Depth 12) | Set-Content -Path $jobPath -Encoding UTF8

    if ($job.artifacts) {
      $arts = @($job.artifacts)
      $row.artifacts = $arts.Count
      $row.artifactTypes = (@($arts | ForEach-Object { if ($_.type) { $_.type } else { $_.filename } }) -join '; ')
    }

    # Prefer opsEvidence (admin job view) — proves tickets/CRM/RAG without docs theater.
    $ops = $job.opsEvidence
    $meta = Get-Meta $job
    if ($ops) {
      if ($null -ne $ops.problemsCoveredCount) { $row.problemsCoveredCount = [int]$ops.problemsCoveredCount }
      if ($null -ne $ops.problemsEmbeddedInDoc) { $row.problemsEmbeddedInDoc = [bool]$ops.problemsEmbeddedInDoc }
      if ($ops.kickoffTicketId) { $row.kickoffTicketId = [string]$ops.kickoffTicketId }
      if ($null -ne $ops.crmImportedLeads -or $ops.crmPipelineSeeded) {
        $row.crmBootstrap = ("imported=" + $ops.crmImportedLeads + ";seeded=" + $ops.crmPipelineSeeded)
      }
      if ($ops.leadGenMode) { $row.leadGenMode = [string]$ops.leadGenMode }
      if ($null -ne $ops.leadsGenerated) { $row.leadsGenerated = [string]$ops.leadsGenerated }
      if ($null -ne $ops.sampleLeadsSeeded) { $row.sampleLeadsSeeded = [string]$ops.sampleLeadsSeeded }
      if ($ops.analysisRulesVersion) { $row.analysisRules = [string]$ops.analysisRulesVersion }
      if ($null -ne $ops.ragSeeded) { $row.ragSeeded = [string]$ops.ragSeeded }
      if ($null -ne $ops.ragRecallHits) { $row.ragRecallHits = [string]$ops.ragRecallHits }
    } elseif ($meta) {
      $pc = $meta.problemsCoveredCount
      if ($null -eq $pc -and $meta.problemsCovered) { $pc = @($meta.problemsCovered).Count }
      if ($null -ne $pc) { $row.problemsCoveredCount = [int]$pc }
      $row.problemsEmbeddedInDoc = [bool]$meta.problemsEmbeddedInDoc
      if ($meta.kickoffTicketId) { $row.kickoffTicketId = [string]$meta.kickoffTicketId }
    }

    $checklist = Get-Checklist $job
    if (-not $checklist) { throw 'No numeric checklistScore - refusing fake PASS' }
    if (-not (Test-FiniteScore $checklist.score)) { throw 'checklistScore non-numeric - refusing fake PASS' }
    $row.checklistScore = [string]$checklist.score
    $row.checklistPassed = [bool]$checklist.passed

    $failed = @()
    if ($job.checklistFailedIds) { $failed = @($job.checklistFailedIds) }
    $row.failedGates = ($failed -join ', ')

    if (-not $row.checklistPassed) {
      throw ("Checklist failed score=" + $row.checklistScore + ' gates=' + $row.failedGates)
    }
    if ($failed.Count -gt 0) {
      throw ("checklistFailedIds present despite passed flag: " + $row.failedGates)
    }

    # Artifact-type substance (works even before opsEvidence deploy)
    $types = @()
    if ($job.artifacts) { $types = @($job.artifacts | ForEach-Object { [string]$_.type }) }
    $needArts = @('sla_onboarding_pack')
    if ($base -eq 'support-priority' -or $base -eq 'support-dedicated') {
      $needArts += @('support_faq_seed', 'health_check')
    }
    if ($base -eq 'lead-gen-retainer') {
      $needArts += @('lead_gen_analysis', 'lead_gen_report', 'lead_gen_pipeline_workspace')
    }
    if ($base -eq 'ai-support-retainer') {
      $needArts += @('ai_support_setup', 'ai_support_knowledge_base')
    }
    foreach ($t in $needArts) {
      if ($types -notcontains $t) { throw ("Missing substance artifact type: " + $t) }
    }

    # Download key artifacts for offline evidence
    foreach ($art in @($job.artifacts)) {
      $fn = [string]$art.filename
      if (-not $fn) { continue }
      $want = $false
      if ($fn -match 'analysis|ai-support-setup|kickoff|sla-onboarding|pipeline-workspace|health-check') { $want = $true }
      if (-not $want) { continue }
      try {
        $dl = Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$([uri]::EscapeDataString($fn))" `
          -WebSession $session -UseBasicParsing -TimeoutSec 90
        $out = Join-Path $RawDir (($sku -replace '[^\w\-]+','_') + '-' + ($fn -replace '[^\w\.\-]+','_'))
        if ($dl.RawContentStream) {
          $ms = New-Object System.IO.MemoryStream
          $dl.RawContentStream.CopyTo($ms)
          [System.IO.File]::WriteAllBytes($out, $ms.ToArray())
        } elseif ($dl.Content -is [byte[]]) {
          [System.IO.File]::WriteAllBytes($out, $dl.Content)
        } else {
          [System.IO.File]::WriteAllText($out, [string]$dl.Content, [System.Text.Encoding]::UTF8)
        }
      } catch {
        Write-Host ("  artifact download soft-fail " + $fn) -ForegroundColor DarkYellow
      }
    }

    if ($ops) {
      if ($row.problemsCoveredCount -lt 5) {
        throw ("problemsCoveredCount=" + $row.problemsCoveredCount + ' < 5 - refusing fake PASS')
      }
      if (-not $row.problemsEmbeddedInDoc) {
        throw 'problemsEmbeddedInDoc=false - catalog-only problems are theater'
      }
      foreach ($gate in $cell.expect) {
        switch ($gate) {
          'kickoff_ticket' {
            if (-not $row.kickoffTicketId) { throw 'kickoff_ticket expected but opsEvidence.kickoffTicketId empty' }
          }
          'crm_bootstrap' {
            if ($row.crmBootstrap -notmatch 'seeded=True|imported=[1-9]') {
              throw ('crm_bootstrap expected but opsEvidence weak: ' + $row.crmBootstrap)
            }
          }
          'lead_gen_analysis_before_hunt' {
            if (-not $row.analysisRules) { throw 'analysis rules missing in opsEvidence' }
            if ($types -notcontains 'lead_gen_analysis') { throw 'lead_gen_analysis artifact missing' }
          }
          'lead_gen_kickoff' {
            if (-not $row.leadGenMode) { throw 'leadGenMode missing' }
          }
          'no_simulated_harvest' {
            $live = 0
            [void][int]::TryParse([string]$row.leadsGenerated, [ref]$live)
            if ($live -gt 0 -and $row.leadGenMode -ne 'live_harvest') {
              throw ("Fake/simulated leads: leadsGenerated=" + $live + ' mode=' + $row.leadGenMode)
            }
          }
          'ai_support_setup' {
            if ($row.ragSeeded -ne 'True' -and $row.ragSeeded -ne 'true') { throw ('ragSeeded not true: ' + $row.ragSeeded) }
            $hits = 0
            [void][int]::TryParse([string]$row.ragRecallHits, [ref]$hits)
            if ($hits -lt 1) { throw ('ragRecallHits < 1: ' + $row.ragRecallHits) }
          }
          'support_automation' {
            if ($null -eq $ops.supportSlaHours -or [int]$ops.supportSlaHours -le 0) {
              throw 'supportAutomation.slaHours missing'
            }
          }
          'sla_pack' {
            if ($types -notcontains 'sla_onboarding_pack') { throw 'sla_onboarding_pack missing' }
          }
          'min_problems_covered' {
            if ($row.problemsCoveredCount -lt 5 -or -not $row.problemsEmbeddedInDoc) {
              throw 'min_problems_covered not proven via opsEvidence'
            }
          }
          'modules_metadata' {
            # covered by checklistPassed=true; CRM/modules recorded when present
          }
          default { }
        }
      }
    } else {
      # Pre-opsEvidence deploy: require checklist 100 + artifacts; do not claim ticket ids.
      if ([double]$row.checklistScore -lt 100) {
        throw ('Without opsEvidence, requiring checklistScore=100 (got ' + $row.checklistScore + ')')
      }
      Write-Host '  WARN: opsEvidence absent on job API - substance via artifacts + checklistScore only' -ForegroundColor Yellow
    }

    if ($base -eq 'lead-gen-retainer') {
      $live = 0
      [void][int]::TryParse([string]$row.leadsGenerated, [ref]$live)
      if ($live -gt 0 -and $row.leadGenMode -ne 'live_harvest') {
        throw ("Fake/simulated leads: leadsGenerated=" + $live + ' mode=' + $row.leadGenMode)
      }
    }

    $row.status = 'PASS'
    Write-Host ("  PASS score={0} arts={1} problems={2} ticket={3} ({4}s)" -f $row.checklistScore, $row.artifacts, $row.problemsCoveredCount, $row.kickoffTicketId, ([int]$sw.Elapsed.TotalSeconds)) -ForegroundColor Green
  } catch {
    $row.error = $_.Exception.Message -replace '[\r\n,]+', ' '
    $row.status = 'FAIL'
    Write-Host ("  FAIL " + $row.error) -ForegroundColor Red
  }

  $sw.Stop()
  $row.elapsedSec = [int]$sw.Elapsed.TotalSeconds
  $results.Add([pscustomobject]$row) | Out-Null

  if ($i -lt $Cells.Count -and $SleepBetweenSec -gt 0) {
    Start-Sleep -Seconds $SleepBetweenSec
  }
}

$passCount = @($results | Where-Object { $_.status -eq 'PASS' }).Count
$failCount = @($results | Where-Object { $_.status -eq 'FAIL' }).Count
$verdict = if ($failCount -eq 0 -and $passCount -eq $Cells.Count) { 'PASS' } else { 'FAIL' }

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine('# LIVE retainer/ops industry packages - 2026-10-08')
[void]$md.AppendLine('')
[void]$md.AppendLine('| Item | Value |')
[void]$md.AppendLine('|------|-------|')
[void]$md.AppendLine("| **Verdict** | **$verdict - $passCount/$($Cells.Count) PASS** |")
[void]$md.AppendLine("| **Target** | $web |")
[void]$md.AppendLine('| **Slice** | support-priority__healthcare, support-dedicated__legal, lead-gen-retainer__marketing, ai-support-retainer__technology, vertical-package__construction |')
[void]$md.AppendLine('| **Gates** | numeric checklistScore; problemsCovered>=5 + embedded; tickets/CRM/analysis/RAG as applicable; no fake leads |')
[void]$md.AppendLine("| **Raw jobs** | ``docs/evidence/_tmp-helper-live-retainer-industry-20261008/`` |")
[void]$md.AppendLine("| **Checked at** | $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K') |")
[void]$md.AppendLine('')
[void]$md.AppendLine('## Results')
[void]$md.AppendLine('')
[void]$md.AppendLine('| sku | status | score | problems | embedded | ticket | CRM/RAG/analysis | arts | checkout | elapsed |')
[void]$md.AppendLine('|-----|--------|------:|---------:|:--------:|--------|------------------|------:|----------|--------:|')
foreach ($r in $results) {
  $ops = New-Object System.Collections.Generic.List[string]
  if ($r.kickoffTicketId) {
    $tid = $r.kickoffTicketId
    if ($tid.Length -gt 8) { $tid = $tid.Substring(0, 8) + '...' }
    [void]$ops.Add("ticket=$tid")
  }
  if ($r.crmBootstrap) { [void]$ops.Add('crm') }
  if ($r.analysisRules) { [void]$ops.Add("analysis=$($r.analysisRules)") }
  if ($r.leadGenMode) { [void]$ops.Add("mode=$($r.leadGenMode);live=$($r.leadsGenerated);samples=$($r.sampleLeadsSeeded)") }
  if ($r.ragSeeded -ne '') { [void]$ops.Add("rag=$($r.ragSeeded);hits=$($r.ragRecallHits)") }
  $opsStr = if ($ops.Count) { ($ops -join '; ') } else { '-' }
  [void]$md.AppendLine("| ``$($r.sku)`` | **$($r.status)** | $($r.checklistScore) | $($r.problemsCoveredCount) | $($r.problemsEmbeddedInDoc) | $(if($r.kickoffTicketId){'yes'}else{'no'}) | $opsStr | $($r.artifacts) | $($r.checkoutMode) | $($r.elapsedSec)s |")
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## Catalog presence (catalog-quality + package-matrix/context)')
[void]$md.AppendLine('')
[void]$md.AppendLine('| sku | resolved | fullPackageCatalogCount | problems (context/matrix) |')
[void]$md.AppendLine('|-----|:--------:|------------------------:|-------------------------:|')
foreach ($r in $results) {
  [void]$md.AppendLine("| ``$($r.sku)`` | $($r.catalogFound) | $($r.catalogSellable) | $($r.problemsCatalog) |")
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## Per-SKU substance (anti theater)')
[void]$md.AppendLine('')
foreach ($r in $results) {
  [void]$md.AppendLine("### ``$($r.sku)`` - $($r.status)")
  [void]$md.AppendLine('')
  [void]$md.AppendLine("- paymentId: ``$($r.paymentId)``")
  [void]$md.AppendLine("- checklistScore: ``$($r.checklistScore)`` passed=$($r.checklistPassed)")
  [void]$md.AppendLine("- problemsCoveredCount: $($r.problemsCoveredCount); problemsEmbeddedInDoc: $($r.problemsEmbeddedInDoc)")
  [void]$md.AppendLine("- kickoffTicketId: ``$($r.kickoffTicketId)``")
  [void]$md.AppendLine("- artifactTypes: $($r.artifactTypes)")
  if ($r.base -eq 'lead-gen-retainer') {
    [void]$md.AppendLine("- leadGen mode=``$($r.leadGenMode)`` leadsGenerated=``$($r.leadsGenerated)`` samples=``$($r.sampleLeadsSeeded)`` analysis=``$($r.analysisRules)``")
    [void]$md.AppendLine('- fake leads: **NO** (gate no_simulated_harvest; live=0 unless mode=live_harvest + CONNECTED enrichment)')
  }
  if ($r.base -eq 'ai-support-retainer') {
    [void]$md.AppendLine("- RAG: ragSeeded=``$($r.ragSeeded)`` ragRecallHits=``$($r.ragRecallHits)``")
  }
  if ($r.crmBootstrap) { [void]$md.AppendLine("- CRM/modules: ``$($r.crmBootstrap)``") }
  if ($r.failedGates) { [void]$md.AppendLine("- failedGates: $($r.failedGates)") }
  if ($r.error) { [void]$md.AppendLine("- error: $($r.error)") }
  [void]$md.AppendLine('')
}
[void]$md.AppendLine('## Honesty')
[void]$md.AppendLine('')
[void]$md.AppendLine('| Claim | Status |')
[void]$md.AppendLine('|-------|--------|')
[void]$md.AppendLine("| All 5 industry SKUs live-fulfilled with numeric checklistScore | $(if($verdict -eq 'PASS'){'**YES**'}else{'**NO - see FAIL rows'}) |")
[void]$md.AppendLine('| problemsSolved/problemsCovered >=5 + embedded in MD/PDF | Required gate; FAIL if missing |')
[void]$md.AppendLine('| Docs-only theater (PDF without ticket/CRM/RAG/analysis) | Rejected by package-specific checklist gates |')
[void]$md.AppendLine('| Fake leads | Forbidden |')
[void]$md.AppendLine('| Fake PASS without checklistScore | Forbidden |')
[void]$md.AppendLine('')
[void]$md.AppendLine("Honest run - PASS only when checklistScore is numeric and substance gates hold. Verdict: **$verdict**.")

$md.ToString() | Set-Content -Path $EvidenceMd -Encoding UTF8
Write-Host ""
Write-Host "Evidence: $EvidenceMd" -ForegroundColor Cyan
Write-Host ("Verdict: {0} ({1}/{2})" -f $verdict, $passCount, $Cells.Count) -ForegroundColor $(if ($verdict -eq 'PASS') { 'Green' } else { 'Red' })
if ($verdict -ne 'PASS') { exit 1 }
