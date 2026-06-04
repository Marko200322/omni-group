<#
.SYNOPSIS
  Dnevni vlasnicki prolaz — status, CI gate, smoke (auto Docker/Atina).

.DESCRIPTION
  Bez punog staging-preflight build-a (koristi -WithPreflight za to).
  Kada Docker/Atina nije dostupan, pokrece owner-smoke-all -SkipAtinaSmoke.

.EXAMPLE
  .\scripts\owner-daily.ps1
.EXAMPLE
  .\scripts\owner-daily.ps1 -WithPreflight
.EXAMPLE
  .\scripts\owner-daily.ps1 -SkipSmoke
.EXAMPLE
  .\scripts\owner-daily.ps1 -Quiet
#>
#Requires -Version 5.1
param(
  [switch]$SkipSmoke,
  [switch]$WithPreflight,
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

if (-not $Quiet) {
  Write-Host '=== owner-daily ===' -ForegroundColor Cyan
  Write-Host ''
}

& (Join-Path $scriptsDir 'owner-status.ps1')
Write-Host ''

$failed = $false

if (-not $Quiet) { Write-Host '-- branch-protection-ready --' -ForegroundColor Cyan }
& (Join-Path $scriptsDir 'branch-protection-ready.ps1')
if ($LASTEXITCODE -ne 0) { $failed = $true }

$dockerOk = $false
try {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch { }

$atinaUp = $false
if ($dockerOk) {
  try {
    $h = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/health' -UseBasicParsing -TimeoutSec 5
    $atinaUp = ($h.StatusCode -eq 200)
  } catch { }
}

if (-not $SkipSmoke) {
  if (-not $Quiet) { Write-Host '' }
  if ($atinaUp) {
    if (-not $Quiet) { Write-Host '-- owner-smoke-all (puni stack) --' -ForegroundColor Cyan }
    & (Join-Path $scriptsDir 'owner-smoke-all.ps1')
  } else {
    if (-not $Quiet) {
      Write-Host '-- owner-smoke-all -SkipAtinaSmoke --' -ForegroundColor Cyan
      if (-not $dockerOk) {
        Write-Host '  NAPOMENA: Docker down - pun smoke posle start-local-stack.ps1' -ForegroundColor Yellow
      }
    }
    & (Join-Path $scriptsDir 'owner-smoke-all.ps1') -SkipAtinaSmoke
  }
  if ($LASTEXITCODE -ne 0) { $failed = $true }
}

if (-not $Quiet) { Write-Host '' }
if (-not $Quiet) { Write-Host '-- audit-doc-gate-references --' -ForegroundColor Cyan }
& (Join-Path $scriptsDir 'audit-doc-gate-references.ps1')
if ($LASTEXITCODE -ne 0) { $failed = $true }

if ($WithPreflight) {
  if (-not $Quiet) { Write-Host '' }
  if (-not $Quiet) { Write-Host '-- staging-preflight --' -ForegroundColor Cyan }
  $preflightSplat = @{ SkipAtinaTestCi = $true }
  if (-not $atinaUp) {
    $preflightSplat.SkipAtinaSmoke = $true
    $preflightSplat.SkipDiskCheck = $true
    $preflightSplat.SkipWebBuild = $true
  }
  & (Join-Path $scriptsDir 'staging-preflight.ps1') @preflightSplat
  if ($LASTEXITCODE -ne 0) { $failed = $true }
}

Write-Host ''
if ($failed) {
  if (-not $Quiet) {
    Write-Host 'owner-daily: FAIL (vidi gore)' -ForegroundColor Red
    Write-Host 'Pomoc: staging-owner-next.ps1 | docker-repair.ps1' -ForegroundColor DarkGray
  }
  exit 1
}

if (-not $Quiet) {
  Write-Host 'owner-daily: PASS' -ForegroundColor Green
  Write-Host 'Sledece (vlasnik): staging-owner-next.ps1' -ForegroundColor DarkGray
  if (-not $dockerOk) {
    Write-Host 'Docker: .\scripts\docker-repair.ps1 pa start-local-stack.ps1' -ForegroundColor Yellow
  }
}
exit 0
