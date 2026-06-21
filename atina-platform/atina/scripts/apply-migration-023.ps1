# Apply migration 023_avatar_agent_roster.sql via Docker postgres
$ErrorActionPreference = 'Stop'
$atinaRoot = Split-Path -Parent $PSScriptRoot
$sql = Join-Path $atinaRoot 'src\database\migrations\023_avatar_agent_roster.sql'
if (-not (Test-Path $sql)) { throw "Missing $sql" }

Get-Content $sql -Raw | docker exec -i atina_postgres psql -U atina_user -d atina_saas_db -v ON_ERROR_STOP=1
docker exec -i atina_postgres psql -U atina_user -d atina_saas_db -c "INSERT INTO schema_migrations (version) VALUES ('023_avatar_agent_roster') ON CONFLICT DO NOTHING;"
Write-Host 'Migration 023 applied (11 avatar agents seeded).' -ForegroundColor Green
