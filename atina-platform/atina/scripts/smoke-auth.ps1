# Smoke: login + /auth/me; optional -BaseUrl / -Email / -Password / -AccessToken
# When -AccessToken is set, skips POST /auth/login (use from smoke-all.ps1 to avoid auth rate limits).
# Nivo 1: docs/operations/NIVO-1-GATE.md
# Ceo monorepo: ../../../NIVO-1-START.md
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [string]$AccessToken = ''
)

$ErrorActionPreference = 'Stop'

$base = $BaseUrl.Trim().TrimEnd('/')
$t30 = @{}
if ($PSVersionTable.PSVersion.Major -ge 6) { $t30.TimeoutSec = 30 }

if ([string]::IsNullOrWhiteSpace($AccessToken)) {
  $body = @{
    email = $Email
    password = $Password
  } | ConvertTo-Json -Compress

  $login = Invoke-RestMethod @t30 -Method POST -Uri "$base/api/v1/auth/login" -ContentType 'application/json' -Body $body
  $token = $login.data.accessToken
} else {
  $token = $AccessToken.Trim()
}

if (-not $token) {
  throw 'Smoke auth failed: access token missing.'
}

$me = Invoke-RestMethod @t30 -Method GET -Uri "$base/api/v1/auth/me" -Headers @{ Authorization = "Bearer $token" }

[pscustomobject]@{
  ok = $true
  baseUrl = $base
  userId = $me.data.id
  email = $me.data.email
  role = $me.data.role
} | ConvertTo-Json -Compress
