#Requires -Version 5.1
<#
.SYNOPSIS
  Delete failed rows from outbound_messages on production Postgres.

.EXAMPLE
  .\scripts\purge-failed-outbound.ps1
  .\scripts\purge-failed-outbound.ps1 -DryRun
#>
param(
  [string]$ConfigPath = '',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'vps-remote.ps1')

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
}
$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$remote = if ($cfg.remotePath) { "$($cfg.remotePath)".Trim() } else { '/opt/omni-group' }

$sqlCount = "SELECT status, COUNT(*) FROM outbound_messages GROUP BY status ORDER BY status;"
$sqlDelete = "DELETE FROM outbound_messages WHERE status = 'failed';"

$remoteCmd = if ($DryRun) {
  @"
set -e
cd '$remote'
echo '=== outbound counts (before) ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod exec -T postgres \
  psql -U atina_user -d atina_saas_db -c "$sqlCount"
echo DRY_RUN_OK
"@
} else {
  @"
set -e
cd '$remote'
echo '=== outbound counts (before) ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod exec -T postgres \
  psql -U atina_user -d atina_saas_db -c "$sqlCount"
echo '=== deleting failed ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod exec -T postgres \
  psql -U atina_user -d atina_saas_db -c "$sqlDelete"
echo '=== outbound counts (after) ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod exec -T postgres \
  psql -U atina_user -d atina_saas_db -c "$sqlCount"
echo PURGE_OK
"@
}

Write-Host '=== purge-failed-outbound ===' -ForegroundColor Cyan
$session = Connect-VpsSession -VpsHost $cfg.vpsHost -VpsUser $cfg.vpsUser -SshPassword $cfg.sshPassword
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remoteCmd -TimeOut 180
if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow } }
Close-VpsSession -Session $session
if ($result.ExitStatus -ne 0) { throw "Purge failed exit=$($result.ExitStatus)" }
Write-Host '=== purge done ===' -ForegroundColor Green
