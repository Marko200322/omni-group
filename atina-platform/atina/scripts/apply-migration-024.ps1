# Apply migration 024_resource_procurement.sql via Docker postgres
$ErrorActionPreference = 'Stop'
$atinaRoot = Split-Path -Parent $PSScriptRoot
$sql = Join-Path $atinaRoot 'src\database\migrations\024_resource_procurement.sql'
if (-not (Test-Path $sql)) { throw "Missing $sql" }

Get-Content $sql -Raw | docker exec -i atina_postgres psql -U atina_user -d atina_saas_db -v ON_ERROR_STOP=1
docker exec -i atina_postgres psql -U atina_user -d atina_saas_db -c "INSERT INTO schema_migrations (version) VALUES ('024_resource_procurement') ON CONFLICT DO NOTHING;"
Write-Host 'Migration 024 applied (resource shop + auto procurement).' -ForegroundColor Green
