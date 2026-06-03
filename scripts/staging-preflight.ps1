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
#>
#Requires -Version 5.1
param(
  [switch]$SkipAtinaTestCi,
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
if ($freeGb -lt $MinDiskGb) {
  Write-Host "FAIL: C: ima ${freeGb} GB slobodno (minimum ${MinDiskGb} GB)." -ForegroundColor Red
  Write-Host '  Pokreni: .\scripts\free-disk-space.ps1 -SkipDocker -CleanTemp' -ForegroundColor Yellow
  exit 1
}

$dirty = git status --short
if ($dirty) {
  Write-Host 'FAIL: working tree nije cist — commit/stash pre staging deploya.' -ForegroundColor Red
  exit 1
}

$goLive = Join-Path $scriptsDir 'go-live-verify.ps1'
if ($SkipAtinaTestCi) {
  & $goLive -SkipVerifyMonorepo -SkipAtinaTestCi
} else {
  & $goLive -SkipVerifyMonorepo
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'staging-preflight: PASS (lokalno)' -ForegroundColor Green
Write-Host ''
Write-Host 'Vlasnik — sledece na staging hostu:' -ForegroundColor Cyan
Write-Host '  1. Deploy commit/tag na staging (Atina + web + Nest po planu)' -ForegroundColor DarkGray
Write-Host '  2. npm run migrate na staging DB (backup pre migracija)' -ForegroundColor DarkGray
Write-Host '  3. smoke-stack.ps1 -AtinaNodeBase https://<STAGING_HOST> -SkipNode:$false' -ForegroundColor DarkGray
Write-Host '  4. npm run smoke:all -- -BaseUrl https://<STAGING_HOST> (atina-platform/atina)' -ForegroundColor DarkGray
Write-Host '  5. Popuni docs/STAGING-EXECUTION-LOG.template.md' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Runbook: docs/STAGING-RELEASE-CHECKLIST.md · docs/VLASNIK-PAKET.md' -ForegroundColor DarkGray
