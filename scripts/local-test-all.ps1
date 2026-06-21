<#
.SYNOPSIS
  Pun lokalni test suite — API prvo, web na kraju.

.EXAMPLE
  .\scripts\local-test-all.ps1
  .\scripts\local-test-all.ps1 -SkipTestCi
  .\scripts\local-test-all.ps1 -UseDockerProd
#>
#Requires -Version 5.1
param(
  [switch]$SkipTestCi,
  [switch]$SkipWebBuild,
  [switch]$UseDockerProd
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'
$webRoot = Join-Path $repoRoot 'apps\omnigroup-web'
Set-Location $repoRoot

$apiBase = if ($UseDockerProd) { 'http://127.0.0.1:3002' } else { 'http://127.0.0.1:3000' }
$webBase = if ($UseDockerProd) { 'http://127.0.0.1:3012' } else { 'http://localhost:3010' }
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')
$creds = Get-AdminCredentials -RepoRoot $repoRoot
$adminEmail = $creds.Email
$adminPass = $creds.Password
$dockerEnv = Join-Path $atinaRoot '.env.docker.prod'
if ($UseDockerProd -and (Test-Path $dockerEnv)) {
  foreach ($line in Get-Content $dockerEnv) {
    if ($line -match '^ADMIN_PASSWORD=(.*)$') { $adminPass = $Matches[1].Trim(); break }
  }
}

$results = @()

function Step($name, [scriptblock]$block) {
  Write-Host "`n=== $name ===" -ForegroundColor Cyan
  try {
    & $block
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw "exit $LASTEXITCODE" }
    $script:results += [pscustomobject]@{ Test = $name; Status = 'PASS' }
    Write-Host "$name : PASS" -ForegroundColor Green
  } catch {
    $script:results += [pscustomobject]@{ Test = $name; Status = "FAIL: $($_.Exception.Message)" }
    Write-Host "$name : FAIL" -ForegroundColor Red
    throw
  }
}

Step '0-preduslov' {
  $d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  $free = [math]::Round($d.FreeSpace / 1GB, 2)
  if ($free -lt 2) { throw "Premalo diska (${free} GB). Pokreni free-disk-space.ps1" }
  if (-not $UseDockerProd) {
    & (Join-Path $scriptsDir 'restart-docker-stack.ps1')
  } else {
    if (-not (Test-Path (Join-Path $repoRoot '.env.docker.prod'))) {
      & (Join-Path $scriptsDir 'prepare-docker-prod.ps1')
    }
    docker compose -f docker-compose.prod.yml -p omni-prod --env-file .env.docker.prod up -d postgres redis atina-api web
    Start-Sleep 20
  }
  $h = Invoke-RestMethod -Uri "$apiBase/health" -TimeoutSec 30
  if ($h.status -ne 'ok') { throw 'API health not ok' }
}

Step '1-admin-audit' {
  & (Join-Path $atinaRoot 'scripts\audit-admin-checklist.ps1')
}

if (-not $SkipTestCi) {
  Step '2-atina-test-ci' {
    Push-Location $atinaRoot
    $env:JEST_CACHE_DIRECTORY = Join-Path $repoRoot '.tmp\jest'
    npm run test:ci
    Pop-Location
  }
}

Step '3-unit-avatar-resource' {
  Push-Location $atinaRoot
  npx jest --no-cache --runInBand --testPathPattern='resource-procurement|avatar-agent'
  Pop-Location
}

Step '4-readiness-100' {
  Push-Location $atinaRoot
  npm run check:readiness-100
  Pop-Location
}

Step '5-smoke-all' {
  & (Join-Path $atinaRoot 'scripts\smoke-all.ps1') -BaseUrl $apiBase -Email $adminEmail -Password $adminPass
}

Step '6-smoke-hunting-quick' {
  & (Join-Path $atinaRoot 'scripts\smoke-hunting.ps1') -BaseUrl $apiBase -Email $adminEmail -Password $adminPass -SkipPipeline
}

Step '7-smoke-product-factory' {
  & (Join-Path $atinaRoot 'scripts\smoke-product-factory.ps1') -BaseUrl $apiBase -Email $adminEmail -Password $adminPass
}

# --- WEB (na kraju) ---
if (-not $SkipWebBuild) {
  Step '8-web-lint' {
    Push-Location $webRoot
    npm run lint
    Pop-Location
  }
  Step '9-web-build' {
    Push-Location $webRoot
    npm run build
    Pop-Location
  }
}

if (-not $UseDockerProd) {
  Step '10-web-dev-restart' {
    & (Join-Path $scriptsDir 'restart-web-dev.ps1')
  }
}

Step '11-smoke-web-integration' {
  if ($UseDockerProd) {
    & (Join-Path $scriptsDir 'smoke-web-integration.ps1') -WebBase $webBase -AtinaBase $apiBase -Email $adminEmail -Password $adminPass -SkipEnsureWeb
  } else {
    & (Join-Path $scriptsDir 'smoke-web-integration.ps1') -Email $adminEmail -Password $adminPass
  }
}

Step '12-smoke-platform-full' {
  & (Join-Path $scriptsDir 'smoke-platform-full.ps1') -WebBase $webBase -Email $adminEmail -Password $adminPass
}

Step '13-smoke-hunting-bff' {
  & (Join-Path $scriptsDir 'smoke-hunting-integration.ps1') -WebBase $webBase -AtinaBase $apiBase -Email $adminEmail -Password $adminPass
}

Step '14-contact-resend' {
  & (Join-Path $scriptsDir 'test-contact-resend.ps1')
}

Write-Host "`nSve proslo." -ForegroundColor Green
