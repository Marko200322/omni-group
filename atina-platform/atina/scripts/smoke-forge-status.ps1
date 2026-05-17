# npm: npm run smoke:forge:status
# Optional: -BaseUrl, -Email, -Password, -AccessToken (skip login when set — e.g. smoke-all.ps1)
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [string]$AccessToken = ''
)

$ErrorActionPreference = 'Stop'

$base = $BaseUrl.Trim().TrimEnd('/')
$t15 = @{}; $t30 = @{}
if ($PSVersionTable.PSVersion.Major -ge 6) { $t15.TimeoutSec = 15; $t30.TimeoutSec = 30 }

if ([string]::IsNullOrWhiteSpace($AccessToken)) {
  $loginBody = @{
    email = $Email
    password = $Password
  } | ConvertTo-Json -Compress

  $login = Invoke-RestMethod @t30 -Method POST -Uri "$base/api/v1/auth/login" -ContentType 'application/json' -Body $loginBody
  $token = $login.data.accessToken
} else {
  $token = $AccessToken.Trim()
}

if (-not $token) {
  throw 'Smoke forge status failed: access token missing.'
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$retryHelper = Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $here))) 'scripts\rate-limit-retry.ps1'
. $retryHelper

$status = Invoke-WithRateLimitRetry -Label 'forge status' -Action {
  Invoke-RestMethod @t15 -Method GET -Uri "$base/api/v1/forge/status" -Headers @{ Authorization = "Bearer $token" }
}
$data = $status.data

if (-not $data) {
  throw 'Smoke forge status failed: response data missing.'
}

if (-not $data.nextProvider) {
  throw 'Smoke forge status failed: nextProvider missing.'
}

if (-not $data.budgetRsd) {
  throw 'Smoke forge status failed: budgetRsd missing.'
}

[pscustomobject]@{
  ok = $true
  baseUrl = $base
  nextProvider = $data.nextProvider
  providersCount = @($data.providers).Count
  budgetInitialRsd = $data.budgetRsd.initial
  budgetRemainingRsd = $data.budgetRsd.remaining
  budgetSpentRsd = $data.budgetRsd.spent
  recentEventsCount = @($data.recentEvents).Count
} | ConvertTo-Json -Compress
