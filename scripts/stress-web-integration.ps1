<#
.SYNOPSIS
  Stress / load smoke for Omni Group web BFF + Atina API (PowerShell 5.1+).

.EXAMPLE
  .\scripts\stress-web-integration.ps1 -Concurrent 10 -Rounds 2
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [int]$Concurrent = 10,
  [int]$Rounds = 2,
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456'
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$atina = $AtinaBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

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
    Invoke-WebRequest -Uri "$Web/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing -TimeoutSec 30 | Out-Null
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
  Write-Host "== Stress: $Name (x$Count) ==" -ForegroundColor Cyan
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
  $color = if ($fail -eq 0) { 'Green' } else { 'Yellow' }
  Write-Host "  $ok/$Count OK" -ForegroundColor $color
}

$workerHealthAtina = {
  param($web, $atina, $email, $password)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    Invoke-RestMethod -Uri "$atina/health" -TimeoutSec 15 | Out-Null
    $sw.Stop()
    return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
  } catch {
    $sw.Stop()
    return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
  }
}

$workerLogin = {
  param($web, $atina, $email, $password)
  Start-Sleep -Milliseconds (Get-Random -Minimum 50 -Maximum 400)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $body = @{ email = $email; password = $password } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing -TimeoutSec 30
    if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }
    $sw.Stop()
    return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
  } catch {
    $sw.Stop()
    return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
  }
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

$workerMarketing = {
  param($web, $atina, $email, $password)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $paths = @('/pricing', '/products', '/services', '/contact', '/')
    $p = $paths | Get-Random
    $r = Invoke-WebRequest -Uri "$web$p" -UseBasicParsing -TimeoutSec 45
    if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode) $p" }
    $sw.Stop()
    return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
  } catch {
    $sw.Stop()
    return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
  }
}

Write-Host "stress-web-integration: concurrent=$Concurrent rounds=$Rounds" -ForegroundColor Magenta
Write-Host "Fetching shared session cookie..." -ForegroundColor DarkGray
$cookieValue = Get-SessionCookieValue -Web $web -Em $Email -Pw $Password
Write-Host "  OK" -ForegroundColor Green

for ($round = 1; $round -le $Rounds; $round++) {
  Write-Host "`n--- Round $round/$Rounds ---" -ForegroundColor Magenta

  Invoke-ParallelJobs -Name 'health_atina' -Worker $workerHealthAtina -Count 6
  Invoke-ParallelJobs -Name 'health_web' -Worker {
    param($web, $atina, $email, $password)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      Invoke-RestMethod -Uri "$web/api/health" -TimeoutSec 15 | Out-Null
      $sw.Stop()
      return @{ ok = $true; ms = $sw.ElapsedMilliseconds; err = '' }
    } catch {
      $sw.Stop()
      return @{ ok = $false; ms = $sw.ElapsedMilliseconds; err = $_.Exception.Message }
    }
  } -Count 6

  Invoke-ParallelJobs -Name 'login_bff' -Worker $workerLogin -Count 5

  Invoke-ParallelJobs -Name 'payments_methods' -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/payments/methods', 'GET', '', 25)
  Invoke-ParallelJobs -Name 'billing_summary' -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/billing/summary', 'GET', '', 25)
  Invoke-ParallelJobs -Name 'manual_checkout' -Worker $workerWithCookie -Count 5 -ExtraArgs @($cookieValue, '/api/atina/payments/manual/checkout', 'POST', '{"planSlug":"starter","billingCycle":"monthly"}', 45)
  Invoke-ParallelJobs -Name 'admin_overview' -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/api/atina/admin/overview', 'GET', '', 35)
  Invoke-ParallelJobs -Name 'dashboard_html' -Worker $workerWithCookie -ExtraArgs @($cookieValue, '/dashboard', 'GET', '', 60)
  Invoke-ParallelJobs -Name 'marketing_pages' -Worker $workerMarketing -Count 8
}

Write-Host "`n== Summary ==" -ForegroundColor Cyan
foreach ($k in ($global:StressStats.Keys | Sort-Object)) {
  $s = $global:StressStats[$k]
  $total = $s.ok + $s.fail
  $avg = if ($total -gt 0) { [math]::Round($s.totalMs / $total) } else { 0 }
  Write-Host ("  {0,-22} ok={1} fail={2} avg={3}ms max={4}ms" -f $k, $s.ok, $s.fail, $avg, $s.maxMs)
}

$hardFails = $global:StressFailures | Where-Object {
  $_ -notmatch '429' -and $_ -notmatch '401.*login'
}
if ($global:StressFailures.Count -gt 0) {
  Write-Host "`nNotes:" -ForegroundColor DarkGray
  $global:StressFailures | Select-Object -Unique | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
}

$critical = @('payments_methods', 'billing_summary', 'manual_checkout', 'admin_overview', 'dashboard_html')
$critFail = $false
foreach ($c in $critical) {
  if ($global:StressStats.ContainsKey($c) -and $global:StressStats[$c].fail -gt 0 -and $global:StressStats[$c].ok -eq 0) {
    $critFail = $true
  }
}

if ($critFail) {
  Write-Host "`nCritical authed scenarios failed completely." -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host 'stress-web-integration: passed (429 on burst login is expected).' -ForegroundColor Green
