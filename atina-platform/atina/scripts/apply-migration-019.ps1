$ErrorActionPreference = 'Stop'
$sqlPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'src\database\migrations\019_platform_evolution.sql'
Get-Content $sqlPath -Raw | docker exec -i atina_postgres psql -U atina_user -d atina_saas_db
Write-Host 'Migration 019 applied (if not exists).'
