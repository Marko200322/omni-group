<#
.SYNOPSIS
  Prod E2E matrix: deliverable packages Ã— industry categories (CSRF-aware).

.DESCRIPTION
  Runs checkout â†’ mark-sent â†’ confirm â†’ fulfillment poll for each cell.
  Writes CSV progress for resume. Default target: live omnigrouptech.com.

.EXAMPLE
  .\scripts\e2e-fulfillment-matrix-prod.ps1
  .\scripts\e2e-fulfillment-matrix-prod.ps1 -PackagesOnly
  .\scripts\e2e-fulfillment-matrix-prod.ps1 -IndustriesOnly -DeliverableIds setup-quick
  .\scripts\e2e-fulfillment-matrix-prod.ps1 -SkipSlow -MaxCells 50
  .\scripts\e2e-fulfillment-matrix-prod.ps1 -Resume
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string[]]$DeliverableIds = @(),
  [string[]]$IndustryCategories = @(),
  [switch]$PackagesOnly,
  [switch]$IndustriesOnly,
  [switch]$SkipSlow,
  [switch]$SkipUnavailable,
  [switch]$Resume,
  [int]$MaxCells = 0,
  [int]$PollSec = 120,
  [int]$SleepBetweenSec = 8,
  [int]$RateLimitMaxAttempts = 8,
  [string]$ReportCsv = ''
)

$ErrorActionPreference = 'Stop'
# Trailing tokens after -IndustryCategories (common with powershell -File) merge into the list.
if ($args.Count -gt 0) {
  $IndustryCategories = @($IndustryCategories) + @($args)
}

$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$allPackages = @(
  'setup-quick', 'setup-full', 'setup-custom', 'audit', 'integration', 'workflow-design',
  'support-priority', 'support-dedicated', 'landing', 'website-business', 'website-ecommerce',
  'white-label-setup', 'sales-enablement', 'vertical-package', 'lead-gen-retainer',
  'ai-support-retainer', 'custom-software'
)
$slowIds = @('website-business', 'website-ecommerce', 'white-label-setup', 'custom-software', 'setup-custom')

function Get-CsrfHeaders {
  param($Session, [string]$Base)
  $c = $Session.Cookies.GetCookies($Base) | Where-Object { $_.Name -eq 'og_csrf' } | Select-Object -First 1
  if (-not $c) { throw 'Missing og_csrf cookie â€” login/session invalid' }
  return @{ 'x-csrf-token' = $c.Value }
}

function Get-IndustrySlugs {
  param([string]$Base, $Session)
  $raw = (Invoke-WebRequest -Uri "$Base/api/atina/billing/industry-catalog" -WebSession $Session -UseBasicParsing -TimeoutSec 60).Content
  $j = $raw | ConvertFrom-Json
  $cats = @()
  if ($j.data.categories) { $cats = @($j.data.categories) }
  elseif ($j.categories) { $cats = @($j.categories) }
  elseif ($j.data -is [System.Array]) { $cats = @($j.data) }
  $slugs = @()
  foreach ($c in $cats) {
    if ($c.slug) { $slugs += [string]$c.slug }
    elseif ($c.PSObject.Properties.Name -contains 'id') { $slugs += [string]$c.id }
  }
  return @($slugs | Select-Object -Unique)
}

function Read-DoneKeys {
  param([string]$Path)
  $set = @{}
  if (-not (Test-Path $Path)) { return $set }
  Import-Csv -Path $Path | ForEach-Object {
    if ($_.status -in @('PASS', 'SKIP')) {
      $set["$($_.deliverableId)|$($_.industryCategory)"] = $true
    }
  }
  return $set
}

if (-not $ReportCsv) {
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $ReportCsv = Join-Path $repoRoot "docs\evidence\fulfillment-matrix-prod-$stamp.csv"
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

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -MaxAttempts $RateLimitMaxAttempts -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'Login failed' }
Write-Host "Login OK ($email)" -ForegroundColor Green

$packages = if ($DeliverableIds.Count -gt 0) { $DeliverableIds } else { $allPackages }
if ($DeliverableIds.Count -gt 0) {
  $DeliverableIds = @($DeliverableIds | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
  $packages = $DeliverableIds
}
if ($SkipSlow) { $packages = @($packages | Where-Object { $_ -notin $slowIds }) }

if ($IndustryCategories.Count -gt 0) {
  $flatInd = New-Object System.Collections.Generic.List[string]
  foreach ($item in @($IndustryCategories)) {
    foreach ($part in ([string]$item -split ',')) {
      $p = $part.Trim()
      if ($p) { [void]$flatInd.Add($p) }
    }
  }
  $IndustryCategories = @($flatInd | Select-Object -Unique)
}
$industries = if ($IndustryCategories.Count -gt 0) {
  @($IndustryCategories)
} else {
  @((Get-IndustrySlugs -Base $web -Session $session))
}
if ($industries.Count -eq 0) { throw 'No industry categories resolved from catalog API' }

if ($PackagesOnly) {
  # One industry â€” full package catalog types
  $preferred = @('marketing', 'technology', 'professional')
  $one = $preferred | Where-Object { $_ -in $industries } | Select-Object -First 1
  if (-not $one) { $one = $industries[0] }
  $industries = @($one)
}
if ($IndustriesOnly -and $DeliverableIds.Count -eq 0) {
  $packages = @('setup-quick')
}

$done = @{}
if ($Resume -and (Test-Path $ReportCsv)) {
  $done = Read-DoneKeys -Path $ReportCsv
  Write-Host "Resume: $($done.Count) PASS/SKIP cells already in $ReportCsv"
} elseif (-not (Test-Path $ReportCsv)) {
  'deliverableId,industryCategory,status,score,artifacts,paymentId,error,elapsedSec,checkedAt' |
    Set-Content -Path $ReportCsv -Encoding UTF8
}

$cells = @()
foreach ($ind in $industries) {
  foreach ($pkg in $packages) {
    $cells += [pscustomobject]@{ deliverableId = $pkg; industryCategory = $ind }
  }
}
if ($MaxCells -gt 0 -and $cells.Count -gt $MaxCells) {
  $cells = $cells | Select-Object -First $MaxCells
}

Write-Host "== Prod fulfillment matrix ==" -ForegroundColor Cyan
Write-Host "  Web: $web"
Write-Host "  Packages: $($packages.Count)  Industries: $($industries.Count)  Cells: $($cells.Count)"
Write-Host "  Report: $ReportCsv"

$passed = 0; $failed = 0; $skipped = 0; $i = 0
foreach ($cell in $cells) {
  $i++
  $pkg = $cell.deliverableId
  $ind = $cell.industryCategory
  $key = "$pkg|$ind"
  if ($done.ContainsKey($key)) {
    Write-Host "[$i/$($cells.Count)] SKIP-DONE $pkg @ $ind"
    continue
  }

  Write-Host ""
  Write-Host "[$i/$($cells.Count)] -- $pkg @ $ind --" -ForegroundColor DarkCyan
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $status = 'FAIL'
  $score = ''
  $arts = 0
  $paymentId = ''
  $err = ''
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
      industryCategory = $ind
      paymentProvider = 'manual'
    } | ConvertTo-Json -Compress)

    $dco = Invoke-WithRateLimitRetry -Label "checkout-$pkg-$ind" -MaxAttempts $RateLimitMaxAttempts -Action {
      $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
        -ContentType 'application/json' -Body $dq -WebSession $session -Headers (Get-CsrfHeaders $session $web) -UseBasicParsing
      return ($r.Content | ConvertFrom-Json)
    }
    if (-not $dco.ok) { throw "checkout failed: $($dco | ConvertTo-Json -Compress)" }
    $paymentId = [string]$dco.data.paymentId

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
    $checklist = $null
    if ($job.fulfillmentMeta) { $checklist = $job.fulfillmentMeta.checklist }
    if (-not $checklist -and $job.result -and $job.result.fulfillmentMeta) {
      $checklist = $job.result.fulfillmentMeta.checklist
    }
    $checkPassed = $true
    if ($checklist) {
      $score = [string]$checklist.score
      $checkPassed = [bool]$checklist.passed
    }
    if (-not $checkPassed) {
      $fails = @($checklist.items | Where-Object { -not $_.passed -and $_.id -ne 'catalog_description' } | ForEach-Object { $_.id }) -join ', '
      throw "Checklist failed (${score}pct): $fails"
    }

    $status = 'PASS'
    $passed++
    $cellDone = $true
    Write-Host "  PASS artifacts=$arts checklist=${score}pct (${([int]$sw.Elapsed.TotalSeconds)}s)" -ForegroundColor Green
  } catch {
    $err = $_.Exception.Message -replace '[\r\n,]+', ' '
    $isGate = $err -match '402|Payment Required|not available for self-serve|phase|budget'
    $isTransient = $err -match '429|Too Many Requests|RATE_LIMIT|connection was closed|kept alive was closed|timed out|Unable to connect'
    if ($SkipUnavailable -and $isGate) {
      $status = 'SKIP'
      $skipped++
      $cellDone = $true
      Write-Host "  SKIP $err" -ForegroundColor Yellow
    } elseif ($isTransient -and $cellAttempts -lt $cellMaxAttempts) {
      Write-Host "  TRANSIENT $err" -ForegroundColor Yellow
      continue
    } else {
      $status = 'FAIL'
      $failed++
      $cellDone = $true
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
  } # end cell retry while


  $sw.Stop()
  $line = ('{0},{1},{2},{3},{4},{5},"{6}",{7},{8}' -f `
    $pkg, $ind, $status, $score, $arts, $paymentId, ($err -replace '"', ''''), ([int]$sw.Elapsed.TotalSeconds), (Get-Date -Format 'o'))
  Add-Content -Path $ReportCsv -Value $line -Encoding UTF8

  if ($SleepBetweenSec -gt 0) { Start-Sleep -Seconds $SleepBetweenSec }
}

Write-Host ''
Write-Host "MATRIX DONE: $passed passed, $failed failed, $skipped skipped" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
Write-Host "Report: $ReportCsv"
if ($failed -gt 0) { exit 1 }
exit 0
