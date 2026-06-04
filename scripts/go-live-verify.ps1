<#
.SYNOPSIS
  Jedan prolaz — gate + smoke + E2E billing za Omni Group monorepo.
  verify-monorepo.ps1 parity: job Python (Doslednost dok + pytest) — docs/GIT-BRANCH-PROTECTION.md;
  apps/omnigroup-web build osim -SkipOmnigroupWeb; posle servisa npm run smoke:all u atina-platform/atina.

.EXAMPLE
  .\scripts\go-live-verify.ps1
  .\scripts\go-live-verify.ps1 -SkipAtinaTestCi
  .\scripts\go-live-verify.ps1 -SkipAtinaTestCi -SkipAtinaSmoke
#>
#Requires -Version 5.1
param(
  [switch]$SkipAtinaTestCi,
  [switch]$SkipAtinaSmoke,
  [switch]$SkipWebBuild,
  [switch]$SkipVerifyMonorepo
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host '== GO-LIVE VERIFY ==' -ForegroundColor Cyan

if (-not $SkipAtinaTestCi) {
  Write-Host '== Atina test:ci ==' -ForegroundColor Cyan
  Push-Location (Join-Path $root 'atina-platform\atina')
  npm run test:ci
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
  Write-Host '  PASS' -ForegroundColor Green
}

if (-not $SkipWebBuild) {
  Write-Host '== Web build ==' -ForegroundColor Cyan
  Push-Location (Join-Path $root 'apps\omnigroup-web')
  foreach ($p in @('.next', 'node_modules\.cache')) {
    if (Test-Path $p) {
      Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
    }
  }
  npm run build
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
  Write-Host '  PASS' -ForegroundColor Green

  Write-Host '== Web dev restart (post-build cache) ==' -ForegroundColor Cyan
  & (Join-Path $root 'scripts\restart-web-dev.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host '  PASS' -ForegroundColor Green
}

Write-Host '== Web smoke integration ==' -ForegroundColor Cyan
if ($SkipAtinaSmoke) {
  Write-Host '  SKIP (-SkipAtinaSmoke; Atina/Docker nije dostupan)' -ForegroundColor Yellow
} else {
  & (Join-Path $root 'scripts\smoke-web-integration.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host '== Upload spike ==' -ForegroundColor Cyan
  & (Join-Path $root 'scripts\test-upload-spike.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host '== E2E billing manual ==' -ForegroundColor Cyan
  Push-Location (Join-Path $root 'apps\omnigroup-web')
  npm run e2e:billing
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
}

if (-not $SkipVerifyMonorepo) {
  Write-Host '== verify-monorepo ==' -ForegroundColor Cyan
  & (Join-Path $root 'scripts\verify-monorepo.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ''
Write-Host 'go-live-verify: ALL PASS' -ForegroundColor Green
