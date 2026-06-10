# Apply migration 020_product_factory.sql via Docker postgres
$ErrorActionPreference = 'Stop'
$atinaRoot = Split-Path -Parent $PSScriptRoot
$sql = Join-Path $atinaRoot 'src\database\migrations\020_product_factory.sql'
if (-not (Test-Path $sql)) { throw "Missing $sql" }

Get-Content $sql -Raw | docker exec -i atina_postgres psql -U atina_user -d atina_saas_db -v ON_ERROR_STOP=1
Write-Host 'Migration 020 applied.' -ForegroundColor Green
