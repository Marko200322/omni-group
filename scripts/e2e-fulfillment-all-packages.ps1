<#
.SYNOPSIS
  E2E: deliverable packages — checkout, confirm, fulfillment checklist pass.

.EXAMPLE
  .\scripts\e2e-fulfillment-all-packages.ps1
  .\scripts\e2e-fulfillment-all-packages.ps1 -DeliverableIds setup-quick,landing
  .\scripts\e2e-fulfillment-all-packages.ps1 -SkipSlow
  .\scripts\e2e-fulfillment-all-packages.ps1 -BudgetLaunchOnly   # M0 €200 Ready set (6)
#>
#Requires -Version 5.1
param(
  [string[]]$DeliverableIds = @(),
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$IndustryCategory = 'marketing',
  [switch]$SkipSlow,
  # Only packages sellable under €200 budget launch (M0 Ready set).
  [switch]$BudgetLaunchOnly,
  # Treat checkout 402 (phase/budget gate) as SKIP, not FAIL.
  [switch]$SkipUnavailable,
  [int]$PollSec = 90
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')

$allIds = @(
  'setup-quick', 'setup-full', 'setup-custom', 'audit', 'integration', 'workflow-design',
  'support-priority', 'support-dedicated', 'landing', 'website-business', 'website-ecommerce',
  'white-label-setup', 'sales-enablement', 'vertical-package', 'lead-gen-retainer',
  'ai-support-retainer', 'custom-software'
)

$budgetLaunchIds = @(
  'setup-quick', 'audit', 'landing', 'website-business', 'workflow-design', 'support-priority'
)
$slowIds = @('website-business', 'website-ecommerce', 'white-label-setup', 'custom-software', 'setup-custom')
$ids = if ($DeliverableIds.Count -gt 0) { $DeliverableIds } elseif ($BudgetLaunchOnly) { $budgetLaunchIds } else { $allIds }
if ($SkipSlow) { $ids = $ids | Where-Object { $_ -notin $slowIds } }
if ($BudgetLaunchOnly) { $SkipUnavailable = $true }

$creds = Get-AdminCredentials -RepoRoot $repoRoot
if ($web -match 'omnigrouptech\.com' -and (Test-Path (Join-Path $repoRoot 'atina-platform\atina\.env.vps.prod'))) {
  $prodPass = (Select-String -Path (Join-Path $repoRoot 'atina-platform\atina\.env.vps.prod') -Pattern '^ADMIN_PASSWORD=(.+)$' -ErrorAction SilentlyContinue).Matches.Groups[1].Value
  if ($prodPass) { $creds.Password = $prodPass }
}

& (Join-Path $scriptsDir 'restart-atina-dev.ps1') -RelaxRateLimit
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $creds.Email; password = $creds.Password } | ConvertTo-Json -Compress
$lj = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
if (($lj.Content | ConvertFrom-Json).ok -ne $true) { throw 'Login failed' }

$passed = 0
$failed = 0
$skipped = 0
$results = @()

Write-Host '== E2E fulfillment all packages ==' -ForegroundColor Cyan
Write-Host "  Packages: $($ids.Count)  Industry: $IndustryCategory$(if ($BudgetLaunchOnly) { '  Mode: BudgetLaunchOnly' })"

foreach ($deliverableId in $ids) {
  Write-Host '' 
  Write-Host "-- $deliverableId --" -ForegroundColor DarkCyan
  try {
    $dq = (@{
      deliverableId = $deliverableId
      industryCategory = $IndustryCategory
      paymentProvider = 'manual'
    } | ConvertTo-Json -Compress)
    $dco = Invoke-WithRateLimitRetry -Label "checkout-$deliverableId" -Action {
      $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST -ContentType 'application/json' -Body $dq -WebSession $session -UseBasicParsing
      return ($r.Content | ConvertFrom-Json)
    }
    if (-not $dco.ok) { throw "checkout failed: $($dco | ConvertTo-Json -Compress)" }
    $paymentId = $dco.data.paymentId

    Invoke-WithRateLimitRetry -Label "mark-sent-$deliverableId" -Action {
      Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST -ContentType 'application/json' -Body '{}' -WebSession $session -UseBasicParsing | Out-Null
    } | Out-Null
    Invoke-WithRateLimitRetry -Label "confirm-$deliverableId" -Action {
      Invoke-WebRequest -Uri "$web/api/atina/payments/manual/confirm/$paymentId" -Method POST -ContentType 'application/json' -Body '{}' -WebSession $session -UseBasicParsing | Out-Null
    } | Out-Null

    $pkgPoll = if ($deliverableId -in $slowIds) { [Math]::Max($PollSec, 180) } else { $PollSec }
    $deadline = (Get-Date).AddSeconds($pkgPoll)
    $job = $null
    while ((Get-Date) -lt $deadline) {
      Start-Sleep -Seconds 3
      $jr = (Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$paymentId" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
      $job = $jr.data
      if ($job.status -in 'completed', 'failed') { break }
    }

    if (-not $job) { throw 'No fulfillment job' }
    if ($job.status -eq 'failed') { throw "Fulfillment failed: $($job.error)" }
    if ($job.status -ne 'completed') { throw "Timeout - status=$($job.status)" }

    $checklist = $job.fulfillmentMeta.checklist
    if (-not $checklist) {
      $checklist = $job.result.fulfillmentMeta.checklist
    }
    $score = if ($checklist) { $checklist.score } else { $null }
    $checkPassed = if ($checklist) { $checklist.passed } else { $true }

    if (-not $checkPassed) {
      $fails = ($checklist.items | Where-Object { -not $_.passed -and $_.id -ne 'catalog_description' } | ForEach-Object { $_.id }) -join ', '
      throw "Checklist failed (${score}pct): $fails"
    }

    Write-Host "  PASS status=$($job.status) artifacts=$($job.artifacts.Count) checklist=${score}pct" -ForegroundColor Green
    $passed++
    $results += [pscustomobject]@{ deliverableId = $deliverableId; status = 'PASS'; score = $score }
    Start-Sleep -Seconds 20
  } catch {
    $msg = $_.Exception.Message
    $isGate = $msg -match '402|Payment Required|not available for self-serve'
    if ($SkipUnavailable -and $isGate) {
      Write-Host "  SKIP (phase/budget gate) $msg" -ForegroundColor Yellow
      $skipped++
      $results += [pscustomobject]@{ deliverableId = $deliverableId; status = 'SKIP'; score = 0; error = $msg }
    } else {
      Write-Host "  FAIL $msg" -ForegroundColor Red
      $failed++
      $results += [pscustomobject]@{ deliverableId = $deliverableId; status = 'FAIL'; score = 0; error = $msg }
    }
  }
}

Write-Host ''
Write-Host "e2e-fulfillment-all-packages: $passed passed, $failed failed, $skipped skipped" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
$results | Format-Table -AutoSize
if ($failed -gt 0) { exit 1 }
