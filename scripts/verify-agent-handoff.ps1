<#
.SYNOPSIS
  Jedan prolaz pre GitHub push-a — status, lint, web smoke (bez punog owner-smoke-all).

.EXAMPLE
  .\scripts\verify-agent-handoff.ps1
.EXAMPLE
  .\scripts\verify-agent-handoff.ps1 -SkipSmoke
#>
#Requires -Version 5.1
param([switch]$SkipSmoke)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '=== verify-agent-handoff ===' -ForegroundColor Cyan
Write-Host ''

& (Join-Path $scriptsDir 'owner-status.ps1')
Write-Host ''

& (Join-Path $scriptsDir 'pre-push-check.ps1') -SkipSmoke
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipSmoke) {
  Write-Host ''
  & (Join-Path $scriptsDir 'smoke-web-integration.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ''
Write-Host 'verify-agent-handoff: PASS — spremno za git-push-first-time.ps1 -RepoUrl ...' -ForegroundColor Green
