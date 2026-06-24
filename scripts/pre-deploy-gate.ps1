#Requires -Version 5.1
<#
.SYNOPSIS
  Mandatory pre-deploy gate — avatars, F4-6, PDF, K8s manifests.

.EXAMPLE
  .\scripts\pre-deploy-gate.ps1
  .\scripts\pre-deploy-gate.ps1 -SkipK8s -SkipUploadSmoke
#>
param(
  [switch]$SkipK8s,
  [switch]$SkipUploadSmoke,
  [switch]$SkipAvatarCheck,
  [switch]$StrictAvatar,
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [string]$WebBase = 'http://127.0.0.1:3010'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$fail = 0

function Step([string]$Name, [scriptblock]$Action) {
  Write-Host "`n== $Name ==" -ForegroundColor Cyan
  try {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $Action
    $code = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
    $ErrorActionPreference = $prevEap
    if ($code -ne 0) { throw "exit code $code" }
    Write-Host "  PASS" -ForegroundColor Green
  } catch {
    Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

Step '1/6 PDF invoice unit tests' {
  Push-Location (Join-Path $root 'atina-platform\atina')
  npm test -- --testPathPattern=invoice-pdf.service.test --silent 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'invoice-pdf tests failed' }
  npm test -- --testPathPattern=payment-notifications.service.test --silent 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'payment-notifications tests failed' }
  Pop-Location
}

Step '2/6 F4-6 unread-count wired in dashboard' {
  $bff = Join-Path $root 'apps\omnigroup-web\src\lib\atina-bff.ts'
  $dash = Join-Path $root 'apps\omnigroup-web\src\app\dashboard\page.tsx'
  if (-not (Select-String -Path $bff -Pattern 'unread-count' -Quiet)) { throw 'atina-bff missing unread-count' }
  if (-not (Select-String -Path $dash -Pattern 'unreadCount' -Quiet)) { throw 'dashboard missing unreadCount' }
}

Step '3/6 F4-6 upload route + UI' {
  $route = Join-Path $root 'apps\omnigroup-web\src\app\api\upload\route.ts'
  $ui = Join-Path $root 'apps\omnigroup-web\src\components\platform\FileUploadPanel.tsx'
  if (-not (Test-Path $route)) { throw 'upload route missing' }
  if (-not (Test-Path $ui)) { throw 'FileUploadPanel missing' }
  if (-not (Select-String -Path $route -Pattern 'getServerSession' -Quiet)) { throw 'upload route not authenticated' }
  if (-not $SkipUploadSmoke) {
    & (Join-Path $root 'scripts\test-upload-spike.ps1') -WebBase $WebBase
    if ($LASTEXITCODE -ne 0) { throw 'upload smoke failed' }
  }
}

if (-not $SkipAvatarCheck) {
  Step '4/6 Premium avatars' {
    $avatarParams = @{ AtinaBase = $AtinaBase }
    if ($StrictAvatar) { $avatarParams.Strict = $true }
    & (Join-Path $root 'scripts\check-avatar-premium.ps1') @avatarParams
    if ($LASTEXITCODE -ne 0) { throw 'avatar check failed' }
  }
} else {
  Write-Host "`n== 4/6 Premium avatars == SKIPPED" -ForegroundColor DarkGray
}

if (-not $SkipK8s) {
  Step '5/6 K8s manifests (kustomize dry-run)' {
    & (Join-Path $root 'scripts\deploy-k8s.ps1') -Overlay staging -DryRun | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'kustomize staging failed' }
    $migrateJob = Join-Path $root 'infra\k8s\base\atina-saas\migrate-job.yaml'
    if (-not (Test-Path $migrateJob)) { throw 'migrate job manifest missing' }
  }
} else {
  Write-Host "`n== 5/6 K8s manifests == SKIPPED" -ForegroundColor DarkGray
}

Step '6/6 Faza 6 repo artifacts' {
  $required = @(
    'infra\k8s\README.md',
    'docs\FAZA-6-START.md',
    'atina-platform\atina\src\modules\ai-rag\ai-rag.module.ts',
    'atina-platform\atina\src\core\phase-boot-manifest.ts',
    'atina-platform\atina\src\modules\phase-launch\service\phase-boot.service.ts',
    'scripts\build-k8s-images.ps1',
    'scripts\deploy-k8s.ps1',
    'scripts\phase-boot-deploy.ps1'
  )
  foreach ($rel in $required) {
    if (-not (Test-Path (Join-Path $root $rel))) { throw "missing $rel" }
  }
}

Step '7/8 Phase boot + PDF legal (unit tests)' {
  Push-Location (Join-Path $root 'atina-platform\atina')
  npm test -- --testPathPattern="phase-boot.service|dominus-swarm.runner" --silent 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'phase boot / edge swarm tests failed' }
  Pop-Location
}

Step '8/8 Phase manifest v6 includes edge-swarm + pdf-legal' {
  $manifest = Join-Path $root 'atina-platform\atina\src\core\phase-boot-manifest.ts'
  if (-not (Select-String -Path $manifest -Pattern 'edge-swarm' -Quiet)) { throw 'manifest missing edge-swarm' }
  if (-not (Select-String -Path $manifest -Pattern 'pdf-legal-alignment' -Quiet)) { throw 'manifest missing pdf-legal' }
  if (-not (Select-String -Path $manifest -Pattern '125_000' -Quiet)) { throw 'manifest missing 125k cap' }
}

Write-Host ''
if ($fail -gt 0) {
  Write-Host "pre-deploy-gate: FAIL ($fail steps)" -ForegroundColor Red
  exit 1
}
Write-Host 'pre-deploy-gate: ALL PASS — ready for server deploy ritual' -ForegroundColor Green
Write-Host 'Next: .\scripts\phase-boot-deploy.ps1   # PDF sign-off + PHASE=v6 boot'
Write-Host '       .\scripts\build-k8s-images.ps1 -Tag staging -Push'
Write-Host '       .\scripts\deploy-k8s.ps1 -Overlay staging'
