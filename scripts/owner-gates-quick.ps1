<#
.SYNOPSIS
  Brzi lokalni gate-ovi pre branch protection / staging deploya.

.DESCRIPTION
  Delegira status + CI + doc audit na owner-daily -SkipSmoke.
  Pun Atina smoke (staging-smoke-remote) samo bez -SkipSmoke.

.EXAMPLE
  .\scripts\owner-gates-quick.ps1
.EXAMPLE
  .\scripts\owner-gates-quick.ps1 -RefreshHandoff
.EXAMPLE
  .\scripts\owner-gates-quick.ps1 -SkipSmoke
#>
#Requires -Version 5.1
param(
  [switch]$RefreshHandoff,
  [switch]$SkipSmoke
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '=== owner-gates-quick ===' -ForegroundColor Cyan
Write-Host ''

& (Join-Path $scriptsDir 'owner-daily.ps1') -SkipSmoke -Quiet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipSmoke) {
  Write-Host ''
  Write-Host '-- staging-smoke-remote (local) --' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'staging-smoke-remote.ps1') -AtinaNodeBase 'http://127.0.0.1:3000'
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if ($RefreshHandoff) {
  Write-Host ''
  Write-Host '-- refresh-staging-handoff --' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'refresh-staging-handoff.ps1')
  Write-Host ''
  Write-Host '-- sync-ci-evidence --' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'sync-ci-evidence.ps1') -AppendDryRunLog -SkipIfEvidenceOnlyHead
}

Write-Host ''
Write-Host 'owner-gates-quick: PASS' -ForegroundColor Green
Write-Host 'Sledece (vlasnik): staging-owner-next.ps1' -ForegroundColor DarkGray
exit 0
