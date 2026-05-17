# Smoke: GET /health; optional -BaseUrl
# Nivo 1 (ovaj servis): docs/operations/NIVO-1-GATE.md
# Ceo monorepo (pytest + Nest): ../../../NIVO-1-START.md
param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$retryHelper = Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $here))) 'scripts\rate-limit-retry.ps1'
. $retryHelper

$health = Invoke-WithRateLimitRetry -Label 'GET /health' -Action {
  Invoke-RestMethod -Method GET -Uri "$BaseUrl/health"
}

[pscustomobject]@{
  ok = ($health.status -eq 'ok')
  baseUrl = $BaseUrl
  status = $health.status
  version = $health.version
  environment = $health.environment
  uptime = $health.uptime
  timestamp = $health.timestamp
} | ConvertTo-Json -Compress
