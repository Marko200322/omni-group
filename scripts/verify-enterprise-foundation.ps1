#Requires -Version 5.1
<#
.SYNOPSIS
  Local, credential-free enterprise foundation gate.

.EXAMPLE
  .\scripts\verify-enterprise-foundation.ps1
  .\scripts\verify-enterprise-foundation.ps1 -Full
#>
param([switch]$Full)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$passed = 0

function Invoke-GateStep {
  param([string]$Name, [scriptblock]$Action)
  Write-Host "== $Name ==" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
  $script:passed++
  Write-Host "PASS $Name" -ForegroundColor Green
}

Push-Location $repoRoot
try {
  Invoke-GateStep 'Billing catalog parity' {
    & (Join-Path $PSScriptRoot 'verify-billing-catalog-mirror.ps1')
  }

  Invoke-GateStep 'Production Compose render' {
    $old = $env:DB_PASSWORD
    try {
      $env:DB_PASSWORD = 'enterprise-gate-placeholder'
      docker compose -f docker-compose.prod.yml --profile tls config --quiet
    } finally {
      $env:DB_PASSWORD = $old
    }
  }

  Invoke-GateStep 'Kubernetes staging render' {
    kubectl kustomize infra/k8s/overlays/staging | Out-Null
  }
  Invoke-GateStep 'Kubernetes production render' {
    $rendered = kubectl kustomize infra/k8s/overlays/prod | Out-String
    foreach ($required in @('kind: PersistentVolumeClaim', 'name: redis-data', 'readinessProbe:', 'livenessProbe:')) {
      if ($rendered -notmatch [regex]::Escape($required)) {
        throw "Production K8s render missing '$required'"
      }
    }
  }

  Invoke-GateStep 'Enterprise migrations present' {
    foreach ($migration in @(
      'atina-platform\atina\src\database\migrations\038_stripe_webhook_idempotency.sql',
      'atina-platform\atina\src\database\migrations\039_outbound_retry_dead_letter.sql',
      'atina-platform\atina\src\database\migrations\040_organizations_and_tenant_scope.sql',
      'atina-platform\atina\src\database\migrations\041_dual_currency_price_book.sql',
      'atina-platform\atina\src\database\migrations\042_organization_rbac_permissions.sql'
    )) {
      if (-not (Test-Path $migration)) { throw "Missing $migration" }
    }
  }

  Invoke-GateStep 'SaaS price book present' {
    foreach ($artifact in @(
      'apps\omnigroup-web\src\lib\saas-plans.ts',
      'apps\omnigroup-web\src\components\marketing\SaaSPlanPricing.tsx',
      'atina-platform\atina\src\modules\billing\lib\saas-price-book.ts'
    )) {
      if (-not (Test-Path $artifact)) { throw "Missing $artifact" }
    }
  }

  Invoke-GateStep 'Enterprise admin surface present' {
    foreach ($artifact in @(
      'apps\omnigroup-web\src\components\platform\AdminEnterpriseControls.tsx',
      'apps\omnigroup-web\src\lib\admin-enterprise-bff.ts',
      'apps\omnigroup-web\src\app\api\atina\admin\users\route.ts',
      'apps\omnigroup-web\src\app\api\atina\admin\plans\route.ts',
      'apps\omnigroup-web\src\app\api\atina\admin\modules\route.ts',
      'apps\omnigroup-web\src\app\api\atina\admin\onboarding-status\route.ts'
    )) {
      if (-not (Test-Path $artifact)) { throw "Missing $artifact" }
    }
  }

  Invoke-GateStep 'Workspace routes present' {
    foreach ($artifact in @(
      'apps\omnigroup-web\src\lib\workspace-routes.ts',
      'apps\omnigroup-web\src\lib\dashboard-page-data.ts',
      'apps\omnigroup-web\src\lib\admin-page-data.ts',
      'apps\omnigroup-web\src\app\dashboard\billing\page.tsx',
      'apps\omnigroup-web\src\app\dashboard\order\page.tsx',
      'apps\omnigroup-web\src\app\admin\customers\page.tsx',
      'apps\omnigroup-web\src\app\admin\billing\page.tsx',
      'apps\omnigroup-web\src\app\admin\factory\page.tsx',
      'apps\omnigroup-web\src\app\api\health\live\route.ts',
      'apps\omnigroup-web\src\lib\org-permissions.ts',
      'apps\omnigroup-web\src\lib\vertical-landing-copy.ts',
      'atina-platform\atina\src\modules\auth\lib\org-permissions.ts'
    )) {
      if (-not (Test-Path $artifact)) { throw "Missing $artifact" }
    }
  }

  Invoke-GateStep 'Backup and restore scripts parse' {
    $bash = @(
      'C:\Program Files\Git\bin\bash.exe',
      'C:\Program Files\Git\usr\bin\bash.exe',
      'bash'
    ) | Where-Object { $_ -eq 'bash' -or (Test-Path $_) } | Select-Object -First 1
    & $bash -n scripts/vps-atina-pg-backup.sh scripts/vps-atina-restore-drill.sh scripts/keep-warm-prod.sh
  }

  if ($Full) {
    Invoke-GateStep 'Atina TypeScript build' {
      Push-Location atina-platform\atina
      try { npm.cmd run build } finally { Pop-Location }
    }
    Invoke-GateStep 'Omnigroup web production build' {
      Push-Location apps\omnigroup-web
      try { npm.cmd run build } finally { Pop-Location }
    }
  }

  Write-Host "ENTERPRISE_FOUNDATION_PASS steps=$passed full=$Full" -ForegroundColor Green
} finally {
  Pop-Location
}
