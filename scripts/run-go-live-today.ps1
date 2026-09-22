#Requires -Version 5.1
<#
  Deploy + prod gates for same-day sales (manual checkout, catalog 50×20).
.EXAMPLE
  .\scripts\run-go-live-today.ps1 -SkipDeploy
  .\scripts\run-go-live-today.ps1 -StartFullFulfillmentMatrixBackground
#>
param(
  [switch]$SkipDeploy,
  [switch]$SkipMatrixVerify,
  [switch]$SkipLaunchGate,
  [switch]$StartFullFulfillmentMatrixBackground,
  [switch]$SkipSlowPackages
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '=== GO LIVE TODAY ===' -ForegroundColor Cyan

if (-not $SkipDeploy) {
  Write-Host '>> SafeDeploy to prod...' -ForegroundColor Yellow
  & (Join-Path $scriptsDir 'deploy-from-local-secrets.ps1') -SafeDeploy
  if ($LASTEXITCODE -ne 0) { throw "Deploy failed exit=$LASTEXITCODE" }
}

if (-not $SkipMatrixVerify) {
  Write-Host '>> Verify 50×20 catalog matrix (API)...' -ForegroundColor Yellow
  & (Join-Path $scriptsDir 'verify-industry-package-matrix-prod.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Matrix verify failed' }
}

if (-not $SkipLaunchGate) {
  Write-Host '>> M4 launch gate (incl. 20×1 fulfillment)...' -ForegroundColor Yellow
  $gateArgs = @('-File', (Join-Path $scriptsDir 'm4-launch-gate.ps1'), '-FullPackagesMatrix')
  if ($SkipSlowPackages) { $gateArgs += '-SkipSlowPackages' }
  & powershell @gateArgs
  if ($LASTEXITCODE -ne 0) { throw 'Launch gate failed' }
}

if ($StartFullFulfillmentMatrixBackground) {
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $csv = Join-Path $repoRoot "docs\evidence\fulfillment-matrix-prod-$stamp.csv"
  $log = "$csv.run.log"
  Write-Host ">> Starting full fulfillment matrix in background -> $log" -ForegroundColor Yellow
  $matrixArgs = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', (Join-Path $scriptsDir 'e2e-fulfillment-matrix-prod.ps1'),
    '-ReportCsv', $csv,
    '-PollSec', '180',
    '-SleepBetweenSec', '8',
    '-Resume'
  )
  if ($SkipSlowPackages) { $matrixArgs += '-SkipSlow' }
  Start-Process -FilePath 'powershell.exe' -ArgumentList $matrixArgs -RedirectStandardOutput $log -RedirectStandardError ($log + '.err') -WindowStyle Hidden
  Write-Host "Monitor: Get-Content '$log' -Tail 20 -Wait"
}

Write-Host ''
Write-Host 'GO LIVE gates PASS. You can sell via /pricing (manual bank + Stripe after login).' -ForegroundColor Green
Write-Host 'Cold mass outbound stays OFF until outreachSendEnabled=true in deploy.config (P3-A04).' -ForegroundColor DarkYellow
