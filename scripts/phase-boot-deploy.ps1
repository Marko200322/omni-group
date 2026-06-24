#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy ritual: PDF legal sign-off → PHASE=v6 → phase boot via Atina API.

.EXAMPLE
  .\scripts\phase-boot-deploy.ps1
  .\scripts\phase-boot-deploy.ps1 -AtinaBase http://127.0.0.1:3000 -SkipApi
#>
param(
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [string]$TrackerVersion = 'FAZA-6-PDF-ALIGNMENT-TRACKER.md@2026-06-24',
  [switch]$SkipApi
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$atinaEnv = Join-Path $root 'atina-platform\atina\.env'
. (Join-Path $root 'scripts\resolve-admin-credentials.ps1')
. (Join-Path $root 'scripts\rate-limit-retry.ps1')

$creds = Get-AdminCredentials -RepoRoot $root
if ($Email -eq 'admin@atina.io') { $Email = $creds.Email }
if ($Password -eq 'Admin@123456') { $Password = $creds.Password }

Write-Host '== Phase boot deploy (v6) ==' -ForegroundColor Cyan

# 1) PHASE=v6 in .env
function Set-EnvLine([string]$Path, [string]$Key, [string]$Value) {
  $lines = @()
  $found = $false
  if (Test-Path $Path) { $lines = Get-Content $Path }
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($line in $lines) {
    if ($line -match "^\s*$([regex]::Escape($Key))\s*=") {
      $out.Add("$Key=$Value")
      $found = $true
    } else {
      $out.Add($line)
    }
  }
  if (-not $found) { $out.Add("$Key=$Value") }
  Set-Content -Path $Path -Value $out -Encoding UTF8
}

if (-not (Test-Path $atinaEnv)) {
  Copy-Item (Join-Path $root 'atina-platform\atina\.env.example') $atinaEnv
}
Set-EnvLine $atinaEnv 'PHASE' 'v6'
Write-Host '  [OK] PHASE=v6 in atina .env' -ForegroundColor Green

if ($SkipApi) {
  Write-Host '  [SKIP] API sign-off + phase set (restart Atina to boot from env)' -ForegroundColor Yellow
  Write-Host 'phase-boot-deploy: PASS (env only)' -ForegroundColor Green
  exit 0
}

$base = $AtinaBase.TrimEnd('/')

# Login (Atina API)
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$login = $null
Invoke-WithRateLimitRetry -Label 'phase-boot Atina login' -Action {
  $script:login = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody
} | Out-Null
$token = $login.data.accessToken
if (-not $token) { throw 'Login failed — no accessToken' }
$headers = @{ Authorization = "Bearer $token" }

# PDF legal sign-off
$signBody = @{ trackerVersion = $TrackerVersion; notes = 'Pre-deploy owner sign-off' } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "$base/api/v1/phase-launch/pdf-signoff" -Method POST -Headers $headers -ContentType 'application/json' -Body $signBody | Out-Null
Write-Host '  [OK] PDF legal sign-off recorded' -ForegroundColor Green

# Set phase v6 + boot
$phaseBody = @{ phase = 'v6'; notes = 'Server deploy - full vision boot' } | ConvertTo-Json -Compress
$phaseRes = Invoke-RestMethod -Uri "$base/api/v1/phase-launch" -Method POST -Headers $headers -ContentType 'application/json' -Body $phaseBody
Write-Host "  [OK] Phase=$($phaseRes.data.currentPhase) boot edge=$($phaseRes.data.boot.edgeSwarmEnabled)" -ForegroundColor Green

$boot = Invoke-RestMethod -Uri "$base/api/v1/phase-launch/boot-status" -Method GET -Headers $headers
if (-not $boot.data.boot.edgeSwarmEnabled) { throw 'boot-status: edgeSwarmEnabled=false' }

Write-Host ''
Write-Host 'phase-boot-deploy: PASS' -ForegroundColor Green
