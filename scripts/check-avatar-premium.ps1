#Requires -Version 5.1
<#
.SYNOPSIS
  Verify premium avatar env + media-stack readiness before server deploy.

.EXAMPLE
  .\scripts\check-avatar-premium.ps1
  .\scripts\check-avatar-premium.ps1 -AtinaBase http://127.0.0.1:3000 -Strict
#>
param(
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$atinaEnv = Join-Path $root 'atina-platform\atina\.env'
$secretsJson = Join-Path $root 'atina-platform\atina\config\avatar-premium.local.json'

function Read-EnvMap([string]$Path) {
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  Get-Content $Path | ForEach-Object {
    $t = $_.Trim()
    if (-not $t -or $t.StartsWith('#')) { return }
    $eq = $t.IndexOf('=')
    if ($eq -lt 1) { return }
    $map[$t.Substring(0, $eq).Trim()] = $t.Substring($eq + 1).Trim()
  }
  return $map
}

$envMap = Read-EnvMap $atinaEnv
$warn = 0
$fail = 0

function Test-Key([string]$Label, [string[]]$Keys, [switch]$Required) {
  $missing = @($Keys | Where-Object { -not $envMap[$_] -or [string]::IsNullOrWhiteSpace($envMap[$_]) })
  if ($missing.Count -eq 0) {
    Write-Host "  [OK] $Label" -ForegroundColor Green
    return
  }
  if ($Required) {
    Write-Host "  [FAIL] $Label — missing: $($missing -join ', ')" -ForegroundColor Red
    $script:fail++
  } else {
    Write-Host "  [WARN] $Label — missing: $($missing -join ', ')" -ForegroundColor Yellow
    $script:warn++
  }
}

Write-Host '== Avatar premium pre-deploy ==' -ForegroundColor Cyan

Test-Key 'Public asset URL' @('AVATAR_PUBLIC_BASE_URL', 'WEB_APP_URL') -Required:$Strict
Test-Key 'Avatar flags' @('SUPPORT_AVATAR_ENABLED', 'SALES_AVATAR_ENABLED')
Test-Key 'ElevenLabs TTS' @('ELEVENLABS_API_KEY')
Test-Key 'HeyGen video' @('HEYGEN_API_KEY')
Test-Key 'D-ID video (fallback)' @('DID_API_KEY')
Test-Key 'AI brain (OpenRouter)' @('AI_URL', 'AI_KEY') -Required:$Strict

if (Test-Path $secretsJson) {
  Write-Host "  [OK] avatar-premium.local.json present" -ForegroundColor Green
} else {
  Write-Host "  [WARN] avatar-premium.local.json missing — copy from .example" -ForegroundColor Yellow
  $warn++
}

$migrationScripts = @(
  'apply-migration-023.ps1',
  'apply-migration-024.ps1',
  'apply-migration-025.ps1'
)
foreach ($m in $migrationScripts) {
  $p = Join-Path $root "atina-platform\atina\scripts\$m"
  if (Test-Path $p) {
    Write-Host "  [OK] script $m" -ForegroundColor Green
  } else {
    Write-Host "  [WARN] missing $m" -ForegroundColor Yellow
    $warn++
  }
}

$base = $AtinaBase.TrimEnd('/')
try {
  $health = Invoke-RestMethod -Uri "$base/health" -TimeoutSec 8
  if ($health.status -eq 'ok' -or $health.ok -eq $true) {
    Write-Host "  [OK] GET /health" -ForegroundColor Green
  } else {
    Write-Host "  [WARN] GET /health unexpected body" -ForegroundColor Yellow
    $warn++
  }
} catch {
  Write-Host "  [WARN] Atina not reachable at $base — start stack first" -ForegroundColor Yellow
  $warn++
}

try {
  $stack = Invoke-RestMethod -Uri "$base/api/v1/video-meetings/avatar/media-stack" -TimeoutSec 8
  $tts = @($stack.configured.tts) -join ', '
  $video = @($stack.configured.video) -join ', '
  Write-Host "  [INFO] media-stack TTS=[$tts] VIDEO=[$video]" -ForegroundColor Cyan
  if ($Strict -and -not $stack.configured.video.Count) {
    Write-Host "  [FAIL] Strict: no video provider configured" -ForegroundColor Red
    $fail++
  }
} catch {
  Write-Host "  [WARN] media-stack endpoint unavailable" -ForegroundColor Yellow
  $warn++
}

Write-Host ''
if ($fail -gt 0) {
  Write-Host "check-avatar-premium: FAIL ($fail fail, $warn warn)" -ForegroundColor Red
  exit 1
}
Write-Host "check-avatar-premium: PASS ($warn warn)" -ForegroundColor Green
exit 0
