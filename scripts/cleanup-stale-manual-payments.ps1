<#
.SYNOPSIS
  Dev helper: mark stale manual test payments as failed.

.DESCRIPTION
  Clears pending/processing manual payments older than -MinAgeHours (default 1h).
  Does not touch completed payments. Requires atina_postgres container.

.EXAMPLE
  .\scripts\cleanup-stale-manual-payments.ps1
  .\scripts\cleanup-stale-manual-payments.ps1 -MinAgeHours 0 -WhatIf
#>
#Requires -Version 5.1
param(
  [int]$MinAgeHours = 1,
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$container = 'atina_postgres'
$sql = @"
UPDATE payments
SET status = 'failed', updated_at = NOW()
WHERE provider = 'manual'
  AND status IN ('pending', 'processing')
  AND created_at < NOW() - INTERVAL '$MinAgeHours hours'
RETURNING id, status, created_at;
"@

Write-Host "== cleanup stale manual payments (older than ${MinAgeHours}h) ==" -ForegroundColor Cyan
if ($WhatIf) {
  docker exec $container psql -U atina_user -d atina_saas_db -c @"
SELECT id, status, created_at FROM payments
WHERE provider = 'manual'
  AND status IN ('pending', 'processing')
  AND created_at < NOW() - INTERVAL '$MinAgeHours hours'
ORDER BY created_at;
"@
  Write-Host 'WhatIf only — no rows updated.' -ForegroundColor Yellow
  exit 0
}

docker exec $container psql -U atina_user -d atina_saas_db -c $sql
Write-Host 'cleanup-stale-manual-payments: done' -ForegroundColor Green
