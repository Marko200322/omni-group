#Requires -Version 5.1
<#
  Prod matrix cells for Marketing Intelligence engine (new surfaces).
  Admin-auth BFF + public Resend webhook probe. Does not invent ads spend / Stripe LIVE.

.EXAMPLE
  .\scripts\verify-marketing-engine-matrix-prod.ps1
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$ApiBase = 'https://api.omnigrouptech.com'
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$api = $ApiBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$fail = 0
function Write-AssertResult {
  param([bool]$Ok, [string]$Name, [string]$Detail)
  if ($Ok) {
    Write-Host "PASS $Name - $Detail" -ForegroundColor Green
  } else {
    Write-Host "FAIL $Name - $Detail" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host '== Marketing engine matrix verify ==' -ForegroundColor Cyan
Write-Host "Web=$web Api=$api"

$useProd = $web -match 'omnigrouptech\.com' -or ($web -like 'https://*' -and $web -notmatch '127\.0\.0\.1|localhost')
$creds = if ($useProd) { Get-AdminCredentials -RepoRoot $repoRoot -Prod } else { Get-AdminCredentials -RepoRoot $repoRoot }
$email = $creds.Email
$pass = $creds.Password

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
  $lj = Invoke-WithRateLimitRetry -Label 'marketing-matrix-login' -Action {
    $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' `
      -Body (@{ email = $email; password = $pass } | ConvertTo-Json -Compress) `
      -WebSession $session -UseBasicParsing -TimeoutSec 60
    return ($r.Content | ConvertFrom-Json)
  }
  Write-AssertResult ($lj.ok -eq $true) 'Admin login' $email
} catch {
  Write-AssertResult $false 'Admin login' $_.Exception.Message
  if ($fail -gt 0) { exit 1 }
}

$csrf = $session.Cookies.GetCookies($web) | Where-Object { $_.Name -eq 'og_csrf' } | Select-Object -First 1
Write-AssertResult ($null -ne $csrf) 'CSRF cookie' $(if ($csrf) { 'og_csrf' } else { 'missing' })
$csrfHdr = @{}
if ($csrf) { $csrfHdr = @{ 'x-csrf-token' = $csrf.Value } }

function Get-MarketingBff {
  param([string]$Path, [string]$Name)
  try {
    $j = Invoke-WithRateLimitRetry -Label $Name -Action {
      $r = Invoke-WebRequest -Uri "$web/api/atina/marketing$Path" -WebSession $session -UseBasicParsing -TimeoutSec 60
      return ($r.Content | ConvertFrom-Json)
    }
    $ok = ($j.ok -eq $true) -and ($null -ne $j.data)
    Write-AssertResult $ok $Name $(if ($ok) { "kind=$($j.data.kind)" } else { 'missing ok/data' })
    return $j
  } catch {
    Write-AssertResult $false $Name $_.Exception.Message
    return $null
  }
}

# Core observer surfaces
$overview = Get-MarketingBff '/overview' 'Marketing overview'
Get-MarketingBff '/health' 'Marketing health' | Out-Null
Get-MarketingBff '/channels' 'Marketing channels' | Out-Null
Get-MarketingBff '/attribution' 'Marketing attribution' | Out-Null
Get-MarketingBff '/economics' 'Marketing economics' | Out-Null
Get-MarketingBff '/reconciliation' 'Marketing reconciliation' | Out-Null

$emailJ = Get-MarketingBff '/email-engagement' 'Email engagement engine'
if ($emailJ -and $emailJ.data) {
  $kind = [string]$emailJ.data.kind
  Write-AssertResult ($kind -in @('ACTUAL', 'UNAVAILABLE')) 'Email engagement kind' $kind
  Write-AssertResult ($null -ne $emailJ.data.opened -or $kind -eq 'UNAVAILABLE') 'Email open counter present' ("opened=$($emailJ.data.opened)")
}

$pkgJ = Get-MarketingBff '/package-matrix' 'Package x channel matrix'
if ($pkgJ -and $pkgJ.data) {
  $kind = [string]$pkgJ.data.kind
  Write-AssertResult ($kind -in @('ACTUAL', 'UNAVAILABLE')) 'Package matrix kind' $kind
  $rows = @($pkgJ.data.rows)
  Write-AssertResult ($null -ne $pkgJ.data.rows) 'Package matrix rows array' ("count={0}" -f $rows.Count)
}

# LIVE adapters sync — must respond; UNAVAILABLE without creds/LIVE flag is OK (no invented spend)
try {
  $sync = Invoke-WithRateLimitRetry -Label 'adapters-sync' -Action {
    $r = Invoke-WebRequest -Uri "$web/api/atina/marketing/adapters/sync" -Method POST `
      -ContentType 'application/json' -Body '{}' -WebSession $session -Headers $csrfHdr `
      -UseBasicParsing -TimeoutSec 90
    return ($r.Content | ConvertFrom-Json)
  }
  $results = @($sync.data.results)
  Write-AssertResult ($sync.ok -eq $true -and $results.Count -ge 2) 'Ads LIVE adapters sync' ("adapters={0}" -f $results.Count)
  $names = @($results | ForEach-Object { [string]$_.adapter })
  Write-AssertResult ($names -contains 'google_ads') 'Google adapter present' (($names -join ','))
  Write-AssertResult ($names -contains 'meta_ads') 'Meta adapter present' (($names -join ','))
  foreach ($row in $results) {
    $st = [string]$row.status
    Write-AssertResult ($st -in @('success', 'unavailable', 'failed')) ("Adapter $($row.adapter) status") $st
  }
} catch {
  Write-AssertResult $false 'Ads LIVE adapters sync' $_.Exception.Message
}

# Engine run (observe + recommend only)
try {
  $eng = Invoke-WithRateLimitRetry -Label 'engine-run' -Action {
    $r = Invoke-WebRequest -Uri "$web/api/atina/marketing/engine/run" -Method POST `
      -ContentType 'application/json' -Body '{}' -WebSession $session -Headers $csrfHdr `
      -UseBasicParsing -TimeoutSec 90
    return ($r.Content | ConvertFrom-Json)
  }
  Write-AssertResult ($eng.ok -eq $true) 'Marketing engine run' ("version=$($eng.data.engineVersion)")
} catch {
  Write-AssertResult $false 'Marketing engine run' $_.Exception.Message
}

# Admin surface
try {
  $page = Invoke-WebRequest -Uri "$web/admin/marketing" -WebSession $session -UseBasicParsing -TimeoutSec 90
  Write-AssertResult ($page.StatusCode -eq 200) 'Admin /admin/marketing' ("HTTP $($page.StatusCode)")
} catch {
  Write-AssertResult $false 'Admin /admin/marketing' $_.Exception.Message
}

# Resend webhook — unauthenticated on API (signature gate)
try {
  $wh = Invoke-WebRequest -Uri "$api/api/v1/marketing/webhooks/resend" -Method POST `
    -ContentType 'application/json' `
    -Body (@{ type = 'email.opened'; id = "matrix_$([guid]::NewGuid().ToString('N').Substring(0,12))"; data = @{ to = @('matrix-probe@example.com') } } | ConvertTo-Json -Compress -Depth 5) `
    -UseBasicParsing -TimeoutSec 45
  $wj = $wh.Content | ConvertFrom-Json
  $ok = ($wh.StatusCode -ge 200 -and $wh.StatusCode -lt 300) -and (($wj.success -eq $true) -or ($wj.ok -eq $true) -or ($null -ne $wj.data))
  Write-AssertResult $ok 'Resend webhook ingest' ("HTTP $($wh.StatusCode)")
} catch {
  $code = $null
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
  # 401/503 acceptable when secret configured / missing in prod
  Write-AssertResult ($code -in 401, 503) 'Resend webhook gated' ("HTTP $code (expected 401/503 without/with secret)")
}

# Autonomy still LEVEL 1 — no spend authority claim in overview
if ($overview -and $overview.data) {
  $lvl = [int]($overview.data.autonomyLevel)
  if (-not $lvl) { $lvl = 1 }
  Write-AssertResult ($lvl -le 1) 'Autonomy LEVEL <= 1' ("level=$lvl")
}

if ($fail -gt 0) {
  Write-Host "MARKETING MATRIX FAILED ($fail)" -ForegroundColor Red
  exit 1
}
Write-Host 'ALL PASS (marketing engine matrix cells)' -ForegroundColor Green
exit 0
