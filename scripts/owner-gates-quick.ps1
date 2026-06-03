<#
.SYNOPSIS
  Brzi lokalni gate-ovi pre branch protection / staging deploya.

.EXAMPLE
  .\scripts\owner-gates-quick.ps1
.EXAMPLE
  .\scripts\owner-gates-quick.ps1 -RefreshHandoff
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

$failed = $false

Write-Host '-- branch-protection-ready --' -ForegroundColor Cyan
& (Join-Path $scriptsDir 'branch-protection-ready.ps1')
if ($LASTEXITCODE -ne 0) { $failed = $true }

if (-not $SkipSmoke) {
  Write-Host ''
  Write-Host '-- staging-smoke-remote (local) --' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'staging-smoke-remote.ps1') -AtinaNodeBase 'http://127.0.0.1:3000'
  if ($LASTEXITCODE -ne 0) { $failed = $true }
}

Write-Host ''
Write-Host '-- audit-doc-gate-references --' -ForegroundColor Cyan
& (Join-Path $scriptsDir 'audit-doc-gate-references.ps1')
if ($LASTEXITCODE -ne 0) { $failed = $true }

if ($RefreshHandoff) {
  Write-Host ''
  Write-Host '-- refresh-staging-handoff --' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'refresh-staging-handoff.ps1')
  Write-Host ''
  Write-Host '-- sync-ci-evidence --' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'sync-ci-evidence.ps1')
}

Write-Host ''
if ($failed) {
  Write-Host 'owner-gates-quick: FAIL (vidi gore)' -ForegroundColor Red
  exit 1
}

Write-Host 'owner-gates-quick: PASS' -ForegroundColor Green
Write-Host 'Sledece (vlasnik): staging-owner-next.ps1' -ForegroundColor DarkGray
exit 0
