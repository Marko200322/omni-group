# One command: finish local prep + full smoke (no VPS purchase required).
#Requires -Version 5.1
param(
  [switch]$SkipAtinaSmoke,
  [switch]$SkipBillingE2e
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host '=== finish-local-prep ===' -ForegroundColor Cyan

& (Join-Path $repoRoot 'scripts\apply-admin-config.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Push-Location (Join-Path $repoRoot 'atina-platform\atina')
npm run migrate
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

& (Join-Path $repoRoot 'scripts\restart-atina-dev.ps1')
& (Join-Path $repoRoot 'scripts\restart-web-dev.ps1')

$creds = & {
  . (Join-Path $repoRoot 'scripts\resolve-admin-credentials.ps1')
  Get-AdminCredentials -RepoRoot $repoRoot
}

Write-Host ''
Write-Host "Admin login: $($creds.Email) / (see ADMIN-CREDENTIALS.local.txt)" -ForegroundColor DarkGray
Write-Host ''

& (Join-Path $repoRoot 'scripts\smoke-platform-full.ps1') -Email $creds.Email -Password $creds.Password
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipBillingE2e) {
  & (Join-Path $repoRoot 'scripts\e2e-billing-manual.ps1') -Email $creds.Email -Password $creds.Password
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not $SkipAtinaSmoke) {
  & (Join-Path $repoRoot 'scripts\owner-smoke-all.ps1') -SkipRegisterE2e
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ''
Write-Host 'finish-local-prep: ALL LOCAL CHECKS PASSED' -ForegroundColor Green
Write-Host 'Live on internet: run deploy-to-vps.ps1 after you have VPS IP + domain.' -ForegroundColor Yellow
