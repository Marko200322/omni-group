# Apply migration 025_autonomy_budget_topup.sql via Docker postgres
$ErrorActionPreference = 'Stop'
$atinaRoot = Split-Path -Parent $PSScriptRoot
$sql = Join-Path $atinaRoot 'src\database\migrations\025_autonomy_budget_topup.sql'
if (-not (Test-Path $sql)) { throw "Missing $sql" }

Get-Content $sql -Raw | docker exec -i atina_postgres psql -U atina_user -d atina_saas_db -v ON_ERROR_STOP=1
docker exec -i atina_postgres psql -U atina_user -d atina_saas_db -c "INSERT INTO schema_migrations (version) VALUES ('025_autonomy_budget_topup') ON CONFLICT DO NOTHING;"
Write-Host 'Migration 025 applied (topup ledger type).' -ForegroundColor Green
