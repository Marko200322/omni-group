<#
.SYNOPSIS
  HTTP smoke protiv staging URL-ova (posle deploya).

.DESCRIPTION
  Podrazumevano: Atina Node GET /health + npm run smoke:all.
  Sa -IncludeStack: i smoke-stack (Astra + Nest + Atina) — postavi STAGING_* env ili parametre.

.EXAMPLE
  $env:STAGING_ATINA_NODE_BASE='https://staging-api.example.com'
  .\scripts\staging-smoke-remote.ps1

.EXAMPLE
  .\scripts\staging-smoke-remote.ps1 -IncludeStack `
    -AtinaNodeBase 'https://staging-api.example.com' `
    -NestBase 'https://staging-nest.example.com' `
    -AstraBase 'https://staging-astra.example.com'
#>
#Requires -Version 5.1
param(
  [string]$AtinaNodeBase = '',
  [string]$NestBase = '',
  [string]$AstraBase = '',
  [switch]$IncludeStack
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$atina = if ($AtinaNodeBase) { $AtinaNodeBase } else { $env:STAGING_ATINA_NODE_BASE }
$nest = if ($NestBase) { $NestBase } else { $env:STAGING_NEST_BASE }
$astra = if ($AstraBase) { $AstraBase } else { $env:STAGING_ASTRA_BASE }

if ([string]::IsNullOrWhiteSpace($atina)) {
  Write-Host 'FAIL: postavi -AtinaNodeBase ili env STAGING_ATINA_NODE_BASE' -ForegroundColor Red
  exit 1
}

$atina = $atina.Trim().TrimEnd('/')

Write-Host '=== staging-smoke-remote ===' -ForegroundColor Cyan
Write-Host "  Atina Node: $atina" -ForegroundColor DarkGray
Write-Host ''

Write-Host "Checking Atina Node /health : $atina/health"
$r = Invoke-WebRequest -Uri "$atina/health" -UseBasicParsing -TimeoutSec 30
if ($r.StatusCode -lt 200 -or $r.StatusCode -ge 300) {
  Write-Host "FAIL: Atina /health HTTP $($r.StatusCode)" -ForegroundColor Red
  exit 1
}
Write-Host "  OK Atina Node health length=$($r.Content.Length)"

if ($IncludeStack) {
  if ([string]::IsNullOrWhiteSpace($nest) -or [string]::IsNullOrWhiteSpace($astra)) {
    Write-Host 'FAIL: -IncludeStack zahteva Nest i Astra (param ili STAGING_NEST_BASE / STAGING_ASTRA_BASE)' -ForegroundColor Red
    exit 1
  }
  Write-Host ''
  Write-Host '== smoke-stack (Astra + Nest + Atina) ==' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'smoke-stack.ps1') `
    -SkipNode:$false `
    -AtinaNodeBase $atina `
    -NestBase $nest.Trim().TrimEnd('/') `
    -AstraBase $astra.Trim().TrimEnd('/')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ''
Write-Host '== Atina bundled smoke (login / forge / admin) ==' -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'atina-platform\atina')
npm.cmd run smoke:all -- -BaseUrl $atina
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { exit $code }

Write-Host ''
Write-Host 'staging-smoke-remote: PASS' -ForegroundColor Green
