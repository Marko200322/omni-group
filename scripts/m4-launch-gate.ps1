#Requires -Version 5.1
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$ApiBase = 'https://api.omnigrouptech.com',
  [switch]$SkipContact,
  [switch]$SkipFulfillment,
  [switch]$SkipSmokeAll,
  [switch]$FullPackagesMatrix,
  [switch]$SkipSlowPackages
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$api = $ApiBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$cfgPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
if (-not (Test-Path $cfgPath)) { throw "Missing $cfgPath" }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($pass)) {
  throw 'adminEmail/adminPassword missing in deploy.config.json'
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$reportDir = Join-Path $repoRoot 'docs\evidence'
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir -Force | Out-Null }
$reportPath = Join-Path $reportDir ("m4-launch-gate-{0}.md" -f $stamp)

$passed = 0
$failed = 0
$lines = New-Object System.Collections.Generic.List[string]
[void]$lines.Add("# M4 launch gate - $stamp")
[void]$lines.Add('')
[void]$lines.Add("- Web: $web")
[void]$lines.Add("- API: $api")
[void]$lines.Add('')

function Write-Result {
  param([string]$Name, [bool]$Ok, [string]$Detail = '')
  $mark = if ($Ok) { 'PASS' } else { 'FAIL' }
  $color = if ($Ok) { 'Green' } else { 'Red' }
  if ($Detail) {
    Write-Host ("{0} {1} - {2}" -f $mark, $Name, $Detail) -ForegroundColor $color
    [void]$script:lines.Add(("- **{0}** {1}: {2}" -f $mark, $Name, $Detail))
  } else {
    Write-Host ("{0} {1}" -f $mark, $Name) -ForegroundColor $color
    [void]$script:lines.Add(("- **{0}** {1}" -f $mark, $Name))
  }
  if ($Ok) { $script:passed++ } else { $script:failed++ }
}

Write-Host '=== M4 LAUNCH GATE ===' -ForegroundColor Cyan
Write-Host ("Web={0}  API={1}" -f $web, $api) -ForegroundColor DarkGray
Write-Host ''

Write-Host '== 1 Health ==' -ForegroundColor Cyan
foreach ($pair in @(
  @{ Name = 'API health'; Url = "$api/health" },
  @{ Name = 'Web home'; Url = "$web/" },
  @{ Name = 'Web pricing'; Url = "$web/pricing" },
  @{ Name = 'Web contact'; Url = "$web/contact" }
)) {
  try {
    $r = Invoke-WebRequest -Uri $pair.Url -UseBasicParsing -TimeoutSec 45
    Write-Result $pair.Name ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) ("HTTP {0}" -f $r.StatusCode)
  } catch {
    Write-Result $pair.Name $false $_.Exception.Message
  }
}

Write-Host ''
Write-Host '== 2 Pricing M4 UI ==' -ForegroundColor Cyan
try {
  $pricing = (Invoke-WebRequest -Uri "$web/pricing" -UseBasicParsing -TimeoutSec 60).Content
  $openN = 0
  if ($pricing -match '(\d+)\s+packages open') { $openN = [int]$Matches[1] }
  $buyNow = ([regex]::Matches($pricing, 'Buy now')).Count
  $readyBadge = ([regex]::Matches($pricing, 'Ready to buy')).Count
  # Client-rendered count may be 0 in raw HTML; Buy now / Ready to buy are SSR-safe signals.
  $openOk = ($openN -ge 10) -or ($buyNow -ge 10 -and $readyBadge -ge 5)
  Write-Result 'Pricing packages open' $openOk ("count={0} buyNow={1} readyBadge={2}" -f $openN, $buyNow, $readyBadge)
  Write-Result 'Pricing Quick setup 449' ($pricing -match '449') 'anchor present'
  Write-Result 'Pricing Landing 990' ($pricing -match '990') 'anchor present'
  Write-Result 'Pricing Priority 249' ($pricing -match '249') 'anchor present'
  Write-Result 'Pricing no under-construction wall' ($pricing -notmatch 'Currently under construction') 'section absent or empty'
} catch {
  Write-Result 'Pricing page parse' $false $_.Exception.Message
}

Write-Host ''
Write-Host '== 3 Factory phase ready ==' -ForegroundColor Cyan
$apiHdr = $null
try {
  $loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
  $login = Invoke-WithRateLimitRetry -Label 'api-login' -Action {
    Invoke-RestMethod -TimeoutSec 30 -Method POST -Uri "$api/api/v1/auth/login" -ContentType 'application/json' -Body $loginBody
  }
  $token = $login.data.accessToken
  if (-not $token) { throw 'no accessToken' }
  $apiHdr = @{ Authorization = "Bearer $token" }
  Write-Result 'API admin login' $true $email

  $fp = (Invoke-RestMethod -TimeoutSec 30 -Uri "$api/api/v1/billing/factory-phase/status" -Headers $apiHdr).data
  Write-Result 'Factory phase is M4' ($fp.phase -eq 'M4') ("phase={0}" -f $fp.phase)
  Write-Result 'Factory ready true' ($fp.ready -eq $true) ("ready={0}" -f $fp.ready)
  $reqGaps = @($fp.gaps | Where-Object { $_.kind -in @('required', 'module_off') })
  Write-Result 'Factory required gaps empty' ($reqGaps.Count -eq 0) ("required_or_module_off={0}" -f $reqGaps.Count)
  if ($reqGaps.Count -gt 0) {
    foreach ($g in $reqGaps) { [void]$lines.Add(("  - gap: {0} - {1}" -f $g.key, $g.message)) }
  }
} catch {
  Write-Result 'Factory status' $false $_.Exception.Message
}

Write-Host ''
Write-Host '== 4 M4 modules read-only ==' -ForegroundColor Cyan
if ($apiHdr) {
  foreach ($ep in @(
    @{ Name = 'Hunter status'; Path = '/api/v1/client-hunter/status' },
    @{ Name = 'Lead DB status'; Path = '/api/v1/client-hunter/lead-databases/status' }
  )) {
    try {
      $j = Invoke-RestMethod -TimeoutSec 45 -Uri ($api + $ep.Path) -Headers $apiHdr
      $ok = $j.ok -eq $true -or $null -ne $j.data
      $snip = ($j | ConvertTo-Json -Compress -Depth 4)
      if ($snip.Length -gt 160) { $snip = $snip.Substring(0, 160) }
      Write-Result $ep.Name $ok $snip
    } catch {
      Write-Result $ep.Name $false $_.Exception.Message
    }
  }

  $outboundHit = $false
  foreach ($path in @(
    '/api/v1/outreach/status',
    '/api/v1/autonomy-loop/outbound/stats',
    '/api/v1/autonomy/outbound/stats'
  )) {
    try {
      $null = Invoke-RestMethod -TimeoutSec 30 -Uri ($api + $path) -Headers $apiHdr
      Write-Result 'Outbound status read' $true ("reachable {0} (no send)" -f $path)
      $outboundHit = $true
      break
    } catch {
      $code = $null
      if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
      if ($code -eq 404) { continue }
      Write-Result 'Outbound status read' $false $_.Exception.Message
      $outboundHit = $true
      break
    }
  }
  if (-not $outboundHit) {
    Write-Result 'Outbound status read' $true 'no public status route (OK for M4; drafts may still exist)'
  }
} else {
  Write-Result 'M4 modules skipped' $false 'no API token'
}

Write-Host ''
Write-Host '== 5 Web BFF catalog ==' -ForegroundColor Cyan
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrfHdr = $null
try {
  $lj = Invoke-WithRateLimitRetry -Label 'web-login' -Action {
    $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' `
      -Body (@{ email = $email; password = $pass } | ConvertTo-Json -Compress) -WebSession $session -UseBasicParsing
    return ($r.Content | ConvertFrom-Json)
  }
  Write-Result 'Web admin login' ($lj.ok -eq $true) $email

  $csrf = $session.Cookies.GetCookies($web) | Where-Object { $_.Name -eq 'og_csrf' } | Select-Object -First 1
  Write-Result 'CSRF cookie' ($null -ne $csrf) $(if ($csrf) { 'og_csrf set' } else { 'missing' })
  if ($csrf) { $csrfHdr = @{ 'x-csrf-token' = $csrf.Value } }

  $cat = (Invoke-WebRequest -Uri "$web/api/atina/billing/industry-catalog" -WebSession $session -UseBasicParsing -TimeoutSec 60).Content | ConvertFrom-Json
  $cats = @()
  if ($cat.data.categories) { $cats = @($cat.data.categories) }
  elseif ($cat.categories) { $cats = @($cat.categories) }
  Write-Result 'Industry catalog' ($cats.Count -ge 20) ("categories={0}" -f $cats.Count)
} catch {
  Write-Result 'Web BFF login/catalog' $false $_.Exception.Message
}

Write-Host ''
Write-Host '== 6 Contact form ==' -ForegroundColor Cyan
if ($SkipContact) {
  Write-Host '  SKIP contact (flag)' -ForegroundColor Yellow
  [void]$lines.Add('- SKIP Contact form')
} else {
  try {
    $contactBody = @{
      name = "M4 Gate $stamp"
      email = $email
      company = 'Omni M4 Launch Gate'
      message = "Automated M4 launch gate contact smoke at $stamp. Safe to ignore."
      website = ''
    } | ConvertTo-Json -Compress
    $cr = Invoke-WebRequest -Uri "$web/api/contact" -Method POST -ContentType 'application/json' `
      -Body $contactBody -UseBasicParsing -TimeoutSec 60
    $cj = $cr.Content | ConvertFrom-Json
    $ok = ($cj.ok -eq $true) -or ($cr.StatusCode -ge 200 -and $cr.StatusCode -lt 300)
    $detail = if ($cj.sent_via) { "sent_via=$($cj.sent_via)" } elseif ($cj.channel) { "channel=$($cj.channel)" } else { "HTTP $($cr.StatusCode)" }
    Write-Result 'Contact form' $ok $detail
  } catch {
    Write-Result 'Contact form' $false $_.Exception.Message
  }
}

Write-Host ''
Write-Host '== 7 Fulfillment sample setup-quick marketing ==' -ForegroundColor Cyan
if ($SkipFulfillment) {
  Write-Host '  SKIP fulfillment (flag)' -ForegroundColor Yellow
  [void]$lines.Add('- SKIP Fulfillment sample')
} elseif (-not $csrfHdr) {
  Write-Result 'Fulfillment sample' $false 'no CSRF / web session'
} else {
  try {
    $dq = (@{
      deliverableId = 'setup-quick'
      industryCategory = 'marketing'
      paymentProvider = 'manual'
    } | ConvertTo-Json -Compress)
    $dco = Invoke-WithRateLimitRetry -Label 'checkout-setup-quick' -Action {
      $r = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/deliverable-checkout" -Method POST `
        -ContentType 'application/json' -Body $dq -WebSession $session -Headers $csrfHdr -UseBasicParsing
      return ($r.Content | ConvertFrom-Json)
    }
    if (-not $dco.ok) { throw 'checkout failed' }
    $paymentId = [string]$dco.data.paymentId
    Write-Result 'Checkout setup-quick' ($paymentId.Length -gt 0) ("paymentId={0}" -f $paymentId)

    Invoke-WithRateLimitRetry -Label 'mark-sent' -Action {
      Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST `
        -ContentType 'application/json' -Body '{}' -WebSession $session -Headers $csrfHdr -UseBasicParsing | Out-Null
    } | Out-Null
    Write-Result 'Mark-sent' $true $paymentId

    Invoke-WithRateLimitRetry -Label 'confirm' -Action {
      Invoke-WebRequest -Uri "$web/api/atina/payments/manual/confirm/$paymentId" -Method POST `
        -ContentType 'application/json' -Body '{}' -WebSession $session -Headers $csrfHdr -UseBasicParsing | Out-Null
    } | Out-Null
    Write-Result 'Confirm payment' $true $paymentId

    $job = $null
    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
      Start-Sleep -Seconds 4
      $jr = (Invoke-WebRequest -Uri "$web/api/atina/billing/fulfillment/jobs/$paymentId" -WebSession $session -UseBasicParsing).Content | ConvertFrom-Json
      $job = $jr.data
      if ($job -and $job.status -in @('completed', 'failed')) { break }
    }
    $arts = 0
    if ($job.artifacts) { $arts = @($job.artifacts).Count }
    elseif ($job.artifactCount) { $arts = [int]$job.artifactCount }
    Write-Result 'Fulfillment completed' ($job.status -eq 'completed') ("status={0} artifacts={1}" -f $job.status, $arts)
  } catch {
    Write-Result 'Fulfillment sample' $false $_.Exception.Message
  }
}

Write-Host ''
Write-Host '== 8 Local verify-factory-phase M4 ==' -ForegroundColor Cyan
try {
  & (Join-Path $scriptsDir 'verify-factory-phase.ps1') -FactoryPhase M4 -MonthlyBudgetEur 550
  Write-Result 'verify-factory-phase.ps1' ($LASTEXITCODE -eq 0) ("exit={0}" -f $LASTEXITCODE)
} catch {
  Write-Result 'verify-factory-phase.ps1' $false $_.Exception.Message
}

Write-Host ''
Write-Host '== 9 Atina smoke all ==' -ForegroundColor Cyan
if ($SkipSmokeAll) {
  Write-Host '  SKIP smoke:all (flag)' -ForegroundColor Yellow
  [void]$lines.Add('- SKIP smoke:all')
} else {
  try {
    Push-Location (Join-Path $repoRoot 'atina-platform\atina')
    npm.cmd run smoke:all -- -BaseUrl $api -Email $email -Password $pass
    $code = $LASTEXITCODE
    Pop-Location
    Write-Result 'smoke:all prod API' ($code -eq 0) ("exit={0}" -f $code)
  } catch {
    Pop-Location -ErrorAction SilentlyContinue
    Write-Result 'smoke:all prod API' $false $_.Exception.Message
  }
}

Write-Host ''
Write-Host '== 10 Packages matrix ==' -ForegroundColor Cyan
if (-not $FullPackagesMatrix) {
  Write-Host '  SKIP full packages matrix (pass -FullPackagesMatrix to run 17x1)' -ForegroundColor Yellow
  [void]$lines.Add('- SKIP PackagesOnly matrix (use -FullPackagesMatrix)')
} else {
  $matrixCsv = Join-Path $reportDir ("m4-packages-only-{0}.csv" -f $stamp)
  $matrixArgs = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $scriptsDir 'e2e-fulfillment-matrix-prod.ps1'),
    '-WebBase', $web,
    '-PackagesOnly',
    '-ReportCsv', $matrixCsv,
    '-PollSec', '180',
    '-SleepBetweenSec', '10'
  )
  if ($SkipSlowPackages) { $matrixArgs += '-SkipSlow' }
  & powershell @matrixArgs
  $mcode = $LASTEXITCODE
  Write-Result 'PackagesOnly matrix' ($mcode -eq 0) ("exit={0} csv={1}" -f $mcode, $matrixCsv)
}

[void]$lines.Add('')
[void]$lines.Add('## Summary')
[void]$lines.Add("- Passed: $passed")
[void]$lines.Add("- Failed: $failed")
$verdict = if ($failed -eq 0) { 'GO' } else { 'NO-GO' }
[void]$lines.Add("- Verdict: **$verdict**")
$lines | Set-Content -Path $reportPath -Encoding UTF8

Write-Host ''
Write-Host ("=== RESULT: {0} PASS / {1} FAIL -> {2} ===" -f $passed, $failed, $verdict) -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
Write-Host ("Report: {0}" -f $reportPath)
if ($failed -gt 0) { exit 1 }
exit 0
