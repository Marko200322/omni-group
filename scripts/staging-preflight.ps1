<#
.SYNOPSIS
  Lokalni preduslov pre staging deploya — status, disk, build, smoke.

.DESCRIPTION
  Pokreni pre nego sto deploy-ujes isti commit na staging URL.
  Ne zamenjuje staging smoke sa remote hostovima — vidi docs/STAGING-RELEASE-CHECKLIST.md.

.EXAMPLE
  .\scripts\staging-preflight.ps1
.EXAMPLE
  .\scripts\staging-preflight.ps1 -SkipAtinaTestCi -MinDiskGb 1
.EXAMPLE
  .\scripts\staging-preflight.ps1 -SkipAtinaTestCi -SkipDiskCheck
.EXAMPLE
  .\scripts\staging-preflight.ps1 -SkipAtinaTestCi -SkipDiskCheck -SkipAtinaSmoke
.EXAMPLE
  .\scripts\staging-preflight.ps1 -SkipAtinaTestCi -SkipDiskCheck -SkipAtinaSmoke -SkipWebBuild
#>
#Requires -Version 5.1
param(
  [switch]$SkipAtinaTestCi,
  [switch]$SkipAtinaSmoke,
  [switch]$SkipWebBuild,
  [switch]$SkipDiskCheck,
  [int]$MinDiskGb = 2
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '=== staging-preflight (lokalno, pre deploya) ===' -ForegroundColor Cyan
Write-Host ''

& (Join-Path $scriptsDir 'owner-status.ps1')
Write-Host ''

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)
if (-not $SkipDiskCheck -and $freeGb -lt $MinDiskGb) {
  Write-Host "FAIL: C: ima ${freeGb} GB slobodno (minimum ${MinDiskGb} GB)." -ForegroundColor Red
  Write-Host '  Pokreni: .\scripts\free-disk-space.ps1 -SkipDocker -CleanTemp' -ForegroundColor Yellow
  Write-Host '  Ili (posle owner-smoke-all): -SkipDiskCheck' -ForegroundColor Yellow
  exit 1
}
if ($SkipDiskCheck -and $freeGb -lt 1) {
  Write-Host ("NAPOMENA: disk ${freeGb} GB - preskocena provera (-SkipDiskCheck).") -ForegroundColor Yellow
}

$dirty = git status --short
if ($dirty) {
  Write-Host 'FAIL: working tree nije cist - commit/stash pre staging deploya.' -ForegroundColor Red
  exit 1
}

$goLive = Join-Path $scriptsDir 'go-live-verify.ps1'
$goLiveSplat = @{ SkipVerifyMonorepo = $true }
if ($SkipAtinaTestCi) { $goLiveSplat.SkipAtinaTestCi = $true }
if ($SkipAtinaSmoke) { $goLiveSplat.SkipAtinaSmoke = $true }
if ($SkipWebBuild) { $goLiveSplat.SkipWebBuild = $true }
& $goLive @goLiveSplat
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'staging-preflight: PASS (lokalno)' -ForegroundColor Green
Write-Host ''
Write-Host 'Vlasnik - sledece na staging hostu:' -ForegroundColor Cyan
Write-Host '  1. Deploy commit/tag na staging (Atina + web + Nest po planu)' -ForegroundColor DarkGray
Write-Host '  2. npm run migrate na staging DB (backup pre migracija)' -ForegroundColor DarkGray
Write-Host '  3. staging-smoke-remote.ps1 (STAGING_ATINA_NODE_BASE=https://<STAGING_HOST>)' -ForegroundColor DarkGray
Write-Host '     ili smoke-stack + smoke:all - vidi scripts/README.md Staging URL' -ForegroundColor DarkGray
Write-Host '  4. Popuni docs/STAGING-EXECUTION-LOG.template.md' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Runbook: docs/STAGING-RELEASE-CHECKLIST.md | docs/VLASNIK-PAKET.md' -ForegroundColor DarkGray
