# npm: npm run smoke:all
# Runs health, then a single POST /auth/login and reuses the JWT for all bearer smokes (reduces AUTH_RATE_LIMIT hits).
# Parent monorepo scripts/smoke-stack.ps1: multi-stack HTTP (Astra + Nest + optional Atina Node GET /health only) — not a substitute for this bundled gate. Formalni Atina release gate: ../docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
# Full monorepo gate from repo root: ../../../scripts/verify-monorepo.ps1 (prvi korak Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u ../../../scripts/README.md; uklj. apps/omnigroup-web osim -SkipOmnigroupWeb). Bundled Atina HTTP gate (formalni Atina release gate): npm run smoke:all (ovaj script). GitHub job `python` required-check label: Python (Doslednost dok + pytest) — ../../../docs/GIT-BRANCH-PROTECTION.md.
# Any child script called with -AccessToken must declare [string]$AccessToken in its param(); otherwise the token is
# dropped, login runs twice, and Postgres may return duplicate key on refresh_tokens_token_hash.
#
# Pass-through from npm (everything after -- goes to this script):
#   npm run smoke:all -- -BaseUrl "http://127.0.0.1:3001"
#   npm run smoke:all -- -Email "user@x.com" -Password "secret"
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456'
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = $BaseUrl.Trim().TrimEnd('/')
$t30 = @{}
if ($PSVersionTable.PSVersion.Major -ge 6) { $t30.TimeoutSec = 30 }

Write-Host '==> smoke: health'
& "$here/smoke-health.ps1" -BaseUrl $base

Write-Host '==> smoke: login once'
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-RestMethod @t30 -Method POST -Uri "$base/api/v1/auth/login" -ContentType 'application/json' -Body $loginBody
$token = $login.data.accessToken
if (-not $token) {
  throw 'smoke:all: login returned no access token'
}

Write-Host '==> smoke: auth/me (reuse token)'
& "$here/smoke-auth.ps1" -BaseUrl $base -AccessToken $token

Write-Host '==> smoke: forge status'
& "$here/smoke-forge-status.ps1" -BaseUrl $base -AccessToken $token

Write-Host '==> smoke: atina-forge workflow-template'
& "$here/smoke-atina-forge-workflow-template.ps1" -BaseUrl $base -AccessToken $token

Write-Host '==> smoke: forge-admin'
& "$here/smoke-forge-admin.ps1" -BaseUrl $base -AccessToken $token

Write-Host 'smoke:all OK'
