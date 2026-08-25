# Full platform smoke - marketing, dashboard, admin, BFF routes
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$Email = 'admin@atina.io',
  [string]$Password = ''
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path $scriptsDir -Parent
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')

if (-not $Password) {
  $creds = Get-AdminCredentials -RepoRoot $repoRoot
  $Email = $creds.Email
  $Password = $creds.Password
}

& (Join-Path $scriptsDir 'ensure-web-dev.ps1') | Out-Null
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$passed = 0
$failed = 0

function Test-Route {
  param(
    [string]$Label,
    [string]$Uri,
    [int]$TimeoutSec = 90,
    [switch]$ExpectRedirect,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session
  )
  try {
    $params = @{ Uri = $Uri; UseBasicParsing = $true; TimeoutSec = $TimeoutSec }
    if ($Session) { $params.WebSession = $Session }
    if ($ExpectRedirect) { $params.MaximumRedirection = 0 }
    $r = Invoke-WebRequest @params
    if ($ExpectRedirect -and $r.StatusCode -notin 301, 302, 307, 308) {
      throw "expected redirect, got $($r.StatusCode)"
    }
    Write-Host "  PASS $Label ($($r.StatusCode))" -ForegroundColor Green
    $script:passed++
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.value__ }
    if ($ExpectRedirect -and $code -in 301, 302, 307, 308) {
      Write-Host "  PASS $Label (redirect $code)" -ForegroundColor Green
      $script:passed++
    } else {
      Write-Host "  FAIL $Label - $($_.Exception.Message)" -ForegroundColor Red
      $script:failed++
    }
  }
}

function Test-BffPostJson {
  param(
    [string]$Label,
    [string]$Uri,
    [object]$Body,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [int]$TimeoutSec = 45
  )
  try {
    $json = $Body | ConvertTo-Json -Compress
    $result = Invoke-WithRateLimitRetry -Label $Label -Action {
      $params = @{
        Uri = $Uri
        Method = 'POST'
        ContentType = 'application/json'
        Body = $json
        UseBasicParsing = $true
        TimeoutSec = $TimeoutSec
      }
      if ($Session) { $params.WebSession = $Session }
      $r = Invoke-WebRequest @params
      $j = $r.Content | ConvertFrom-Json
      if (-not $j.ok) {
        $snippet = $r.Content.Substring(0, [Math]::Min(200, $r.Content.Length))
        throw "ok=false: $snippet"
      }
      return $j
    }
    Write-Host "  PASS $Label" -ForegroundColor Green
    $script:passed++
    return $result
  } catch {
    Write-Host "  FAIL $Label - $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
    return $null
  }
}

function Test-BffJson {
  param(
    [string]$Label,
    [string]$Uri,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [int]$TimeoutSec = 45
  )
  try {
    $result = Invoke-WithRateLimitRetry -Label $Label -Action {
      $params = @{ Uri = $Uri; UseBasicParsing = $true; TimeoutSec = $TimeoutSec }
      if ($Session) { $params.WebSession = $Session }
      $r = Invoke-WebRequest @params
      $j = $r.Content | ConvertFrom-Json
      if (-not $j.ok) {
        $snippet = $r.Content.Substring(0, [Math]::Min(200, $r.Content.Length))
        throw "ok=false: $snippet"
      }
      return $j
    }
    Write-Host "  PASS $Label" -ForegroundColor Green
    $script:passed++
    return $result
  } catch {
    Write-Host "  FAIL $Label - $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
    return $null
  }
}

Write-Host '== Marketing pages ==' -ForegroundColor Cyan
@('/', '/services', '/pricing', '/products', '/contact', '/login', '/invoices/preview') | ForEach-Object {
  Test-Route -Label $_ -Uri "$web$_"
}

Write-Host '== Auth-gated pages (guest redirect) ==' -ForegroundColor Cyan
@('/dashboard', '/admin', '/admin/mobile', '/dev/docs') | ForEach-Object {
  Test-Route -Label "$_ guest" -Uri "$web$_" -ExpectRedirect
}

Write-Host '== BFF login ==' -ForegroundColor Cyan
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -Action {
  $login = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing -TimeoutSec 45
  $parsed = $login.Content | ConvertFrom-Json
  if (-not $parsed.ok) { throw 'login failed' }
  return $parsed
}
Write-Host "  PASS login -> $($lj.redirectTo)" -ForegroundColor Green
$passed++

Write-Host '== Authenticated pages ==' -ForegroundColor Cyan
@('/dashboard', '/admin', '/admin/mobile') | ForEach-Object {
  Test-Route -Label "$_ auth" -Uri "$web$_" -Session $session -TimeoutSec 120
}

Write-Host '== Billing pages ==' -ForegroundColor Cyan
@('/dashboard/billing/success', '/dashboard/billing/cancel', '/dashboard/billing/paypal/success') | ForEach-Object {
  Test-Route -Label $_ -Uri "$web$_" -Session $session
}

Write-Host '== BFF API routes (authenticated) ==' -ForegroundColor Cyan
$bffRoutes = @(
  '/api/atina/billing/summary'
  '/api/atina/billing/category-pricing?category=web-development'
  '/api/atina/billing/industry-catalog'
  '/api/atina/payments/methods'
  '/api/atina/admin/overview'
  '/api/atina/admin/payments?status=processing&limit=5'
  '/api/atina/admin/push/vapid-public-key'
  '/api/atina/autonomy-loop/status'
  '/api/atina/autonomy-loop/verticals'
  '/api/atina/autonomy-loop/categories/status'
  '/api/atina/product-factory/stats'
  '/api/atina/ai-memory/recall?namespace=global&key=smoke'
)
foreach ($route in $bffRoutes) {
  Test-BffJson -Label $route -Uri "$web$route" -Session $session | Out-Null
  Start-Sleep -Milliseconds 250
}
Test-BffPostJson -Label '/api/atina/billing/quote (POST)' -Uri "$web/api/atina/billing/quote" -Session $session -Body @{
  deliverableId = 'setup-quick'
  industryCategory = 'marketing'
} | Out-Null

Write-Host '== Public BFF ==' -ForegroundColor Cyan
Test-BffJson -Label '/api/atina/video-meetings/support/agents' -Uri "$web/api/atina/video-meetings/support/agents" | Out-Null

Write-Host ''
$color = if ($failed -eq 0) { 'Green' } else { 'Red' }
Write-Host "smoke-platform-full: $passed passed, $failed failed" -ForegroundColor $color
if ($failed -gt 0) { exit 1 }
