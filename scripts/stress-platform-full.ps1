<#
.SYNOPSIS
  Heavy load / stress test — admin dashboard, payments, resource shop, revenue allocation.

.EXAMPLE
  .\scripts\stress-platform-full.ps1
  .\scripts\stress-platform-full.ps1 -Concurrent 25 -Rounds 4
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [int]$Concurrent = 20,
  [int]$Rounds = 3,
  [string]$Email = 'admin@atina.io',
  [string]$Password = ''
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$atina = $AtinaBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path $scriptsDir -Parent
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')

if (-not $Password) {
  $creds = Get-AdminCredentials -RepoRoot $repoRoot
  $Email = $creds.Email
  $Password = $creds.Password
}

& (Join-Path $scriptsDir 'ensure-atina-api.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$global:StressStats = @{}
$global:StressFailures = New-Object System.Collections.Generic.List[string]

function Add-StressResult {
  param([string]$Name, [bool]$Ok, [long]$Ms, [string]$Err = '')
  if (-not $global:StressStats.ContainsKey($Name)) {
    $global:StressStats[$Name] = @{ ok = 0; fail = 0; totalMs = 0; maxMs = 0 }
  }
  $s = $global:StressStats[$Name]
  if ($Ok) { $s.ok++ } else { $s.fail++ }
  $s.totalMs += $Ms
  if ($Ms -gt $s.maxMs) { $s.maxMs = $Ms }
  if (-not $Ok) { $global:StressFailures.Add("${Name}: $Err") | Out-Null }
}

function Get-SessionCookieValue {
  param([string]$Web, [string]$Em, [string]$Pw)
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $body = @{ email = $Em; password = $Pw } | ConvertTo-Json -Compress
  Invoke-WithRateLimitRetry -Label 'stress login' -Action {
    Invoke-WebRequest -Uri "$Web/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing -TimeoutSec 45 | Out-Null
  } | Out-Null
  $c = $session.Cookies.GetCookies($Web) | Where-Object { $_.Name -eq 'og_session' } | Select-Object -First 1
  if (-not $c) { throw 'og_session cookie missing after login' }
  return $c.Value
}

function Invoke-ParallelJobs {
  param(
    [string]$Name,
    [scriptblock]$Worker,
    [int]$Count = $Concurrent,
    [object[]]$ExtraArgs = @()
  )
  Write-Host "== $Name (x$Count) ==" -ForegroundColor Cyan
  $jobs = @()
  for ($i = 0; $i -lt $Count; $i++) {
    $jobs += Start-Job -ScriptBlock $Worker -ArgumentList (@($web, $atina, $Email, $Password) + $ExtraArgs)
  }
  $results = $jobs | Wait-Job | Receive-Job
  $jobs | Remove-Job -Force
  foreach ($r in $results) {
    if ($null -eq $r) { Add-StressResult -Name $Name -Ok $false -Ms 0 -Err 'empty job result'; continue }
    Add-StressResult -Name $Name -Ok $r.ok -Ms $r.ms -Err $r.err
  }
  $ok = ($results | Where-Object { $_ -and $_.ok }).Count
  $fail = $Count - $ok
  $color = if ($fail -eq 0) { 'Green' } elseif ($ok -gt 0) { 'Yellow' } else { 'Red' }
  Write-Host "  $ok/$Count OK" -ForegroundColor $color
}

$workerWithCookie = {
  param($web, $atina, $email, $password, [string]$CookieValue, [string]$Path, [string]$Method, [string]$Body, [int]$TimeoutSec)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $headers = @{ Cookie = "og_session=$CookieValue" }
    $params = @{
      Uri = "$web$Path"
      Method = $Method
      Headers = $headers
      UseBasicParsing = $true
      TimeoutSec = $TimeoutSec
    }
    if ($Body) {
      $params.ContentType = 'application/json'
      $params.Body = $Body
    }
    $r = Invoke-WebRequest @params
    if ($r.StatusCode -lt 200 -or $r.StatusCode -ge 300) { throw "HTTP $($r.StatusCode)" }
    $sw.Stop()
    return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
  } catch {
    $sw.Stop()
    return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
  }
}

$workerHtmlPage = {
  param($web, $atina, $email, $password, [string]$CookieValue, [string]$Path)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $headers = @{}
    if ($CookieValue) { $headers.Cookie = "og_session=$CookieValue" }
    $r = Invoke-WebRequest -Uri "$web$Path" -Headers $headers -UseBasicParsing -TimeoutSec 90
    if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }
    $sw.Stop()
    return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
  } catch {
    $sw.Stop()
    return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
  }
}

$workerQuoteBurst = {
  param($web, $atina, $email, $password, [string]$CookieValue)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $deliverables = @('setup-quick', 'vertical-package', 'custom-software', 'website-ecommerce')
    $id = $deliverables | Get-Random
    $body = (@{ deliverableId = $id; industryCategory = 'marketing'; paymentProvider = 'manual' } | ConvertTo-Json -Compress)
    $headers = @{ Cookie = "og_session=$CookieValue" }
    $r = Invoke-WebRequest -Uri "$web/api/atina/billing/quote" -Method POST -Headers $headers -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 45
    if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }
    $sw.Stop()
    return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
  } catch {
    $sw.Stop()
    return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
  }
}

Write-Host "stress-platform-full: concurrent=$Concurrent rounds=$Rounds" -ForegroundColor Magenta
$cookieValue = Get-SessionCookieValue -Web $web -Em $Email -Pw $Password
Write-Host 'Session cookie OK' -ForegroundColor Green

for ($round = 1; $round -le $Rounds; $round++) {
  Write-Host "`n--- Round $round/$Rounds ---" -ForegroundColor Magenta

  Invoke-ParallelJobs -Name 'health_atina' -Count 12 -Worker {
    param($web, $atina, $email, $password)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      Invoke-RestMethod -Uri "$atina/health" -TimeoutSec 20 | Out-Null
      $sw.Stop()
      return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
    } catch {
      $sw.Stop()
      return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
    }
  }

  Invoke-ParallelJobs -Name 'health_web' -Count 12 -Worker {
    param($web, $atina, $email, $password)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      Invoke-RestMethod -Uri "$web/api/health" -TimeoutSec 20 | Out-Null
      $sw.Stop()
      return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
    } catch {
      $sw.Stop()
      return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
    }
  }

  Invoke-ParallelJobs -Name 'admin_html' -Worker $workerHtmlPage -Count 10 -ExtraArgs @($cookieValue, '/admin')
  Invoke-ParallelJobs -Name 'admin_mobile_html' -Worker $workerHtmlPage -Count 8 -ExtraArgs @($cookieValue, '/admin/mobile')
  Invoke-ParallelJobs -Name 'dashboard_html' -Worker $workerHtmlPage -Count 10 -ExtraArgs @($cookieValue, '/dashboard')
  Invoke-ParallelJobs -Name 'pricing_html' -Worker $workerHtmlPage -Count 12 -ExtraArgs @('', '/pricing')

  Invoke-ParallelJobs -Name 'admin_overview' -Count 8 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/admin/overview', 'GET', '', 40)
  Invoke-ParallelJobs -Name 'admin_payments' -Count 8 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/admin/payments?status=processing&limit=20', 'GET', '', 40)
  Invoke-ParallelJobs -Name 'resource_catalog' -Count 8 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/resource-procurement/catalog', 'GET', '', 35)
  Invoke-ParallelJobs -Name 'resource_settings' -Count 8 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/resource-procurement/settings', 'GET', '', 35)
  Invoke-ParallelJobs -Name 'resource_orders' -Count 8 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/resource-procurement/orders', 'GET', '', 35)
  Invoke-ParallelJobs -Name 'revenue_summary' -Count 8 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/billing/revenue-allocation/summary', 'GET', '', 40)
  Invoke-ParallelJobs -Name 'billing_quotes' -Count 10 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/billing/quotes?industryCategory=marketing', 'GET', '', 45)
  Invoke-ParallelJobs -Name 'billing_summary' -Count 8 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/billing/summary', 'GET', '', 35)
  Invoke-ParallelJobs -Name 'payments_methods' -Count 10 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/payments/methods', 'GET', '', 30)
  Invoke-ParallelJobs -Name 'autonomy_status' -Count 6 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/autonomy-loop/status', 'GET', '', 40)
  Invoke-ParallelJobs -Name 'cursor_status' -Count 6 -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/cursor-agent/status', 'GET', '', 35)

  Invoke-ParallelJobs -Name 'quote_post_burst' -Worker $workerQuoteBurst -Count 10 -ExtraArgs @($cookieValue)
  Invoke-ParallelJobs -Name 'deliverable_checkout' -Worker $workerWithCookie -Count 3 -ExtraArgs @(
    $cookieValue,
    '/api/atina/payments/manual/deliverable-checkout',
    'POST',
    '{"deliverableId":"setup-quick","industryCategory":"marketing","paymentProvider":"manual"}',
    60
  )
  Invoke-ParallelJobs -Name 'plan_checkout' -Worker $workerWithCookie -Count 3 -ExtraArgs @(
    $cookieValue,
    '/api/atina/payments/manual/checkout',
    'POST',
    '{"planSlug":"starter","billingCycle":"monthly"}',
    60
  )
  Invoke-ParallelJobs -Name 'resource_checkout' -Worker $workerWithCookie -Count 2 -ExtraArgs @(
    $cookieValue,
    '/api/atina/resource-procurement/checkout',
    'POST',
    '{"items":[{"sku":"openrouter_10","qty":1}]}',
    60
  )
}

Write-Host "`n== Summary ==" -ForegroundColor Cyan
$totalOk = 0
$totalFail = 0
foreach ($k in ($global:StressStats.Keys | Sort-Object)) {
  $s = $global:StressStats[$k]
  $total = $s.ok + $s.fail
  $totalOk += $s.ok
  $totalFail += $s.fail
  $avg = if ($total -gt 0) { [math]::Round($s.totalMs / $total) } else { 0 }
  $pct = if ($total -gt 0) { [math]::Round(100 * $s.ok / $total) } else { 0 }
  Write-Host ("  {0,-24} ok={1} fail={2} ({3}%) avg={4}ms max={5}ms" -f $k, $s.ok, $s.fail, $pct, $avg, $s.maxMs)
}

Write-Host ("`nTotal: {0} OK, {1} fail" -f $totalOk, $totalFail) -ForegroundColor $(if ($totalFail -eq 0) { 'Green' } elseif ($totalOk -gt $totalFail) { 'Yellow' } else { 'Red' })

$critical = @(
  'admin_overview', 'resource_catalog', 'resource_settings', 'revenue_summary',
  'admin_html', 'health_atina', 'health_web'
)
$critFail = $false
foreach ($c in $critical) {
  if ($global:StressStats.ContainsKey($c)) {
    $s = $global:StressStats[$c]
    $realFail = $s.fail
    if ($global:StressFailures.Count -gt 0) {
      $rateLimited = @($global:StressFailures | Where-Object { $_ -match $c -and $_ -match '429' }).Count
      $realFail = [math]::Max(0, $s.fail - $rateLimited)
    }
    if ($s.ok -eq 0 -and $realFail -gt 0) { $critFail = $true }
  }
}

if ($critFail) {
  Write-Host 'Critical scenarios failed completely.' -ForegroundColor Red
  exit 1
}

if ($totalFail -gt 0) {
  Write-Host 'Some failures (429 rate limit on checkout burst is OK).' -ForegroundColor Yellow
  $global:StressFailures | Select-Object -Unique | Select-Object -First 8 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
}

Write-Host ''
Write-Host 'stress-platform-full: PASS' -ForegroundColor Green
