# Smoke: GET /health; optional -BaseUrl
# Nivo 1 (ovaj servis): docs/operations/NIVO-1-GATE.md
# Ceo monorepo (pytest + Nest): ../../../NIVO-1-START.md
param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'

$health = Invoke-RestMethod -Method GET -Uri "$BaseUrl/health"

[pscustomobject]@{
  ok = ($health.status -eq 'ok')
  baseUrl = $BaseUrl
  status = $health.status
  version = $health.version
  environment = $health.environment
  uptime = $health.uptime
  timestamp = $health.timestamp
} | ConvertTo-Json -Compress
