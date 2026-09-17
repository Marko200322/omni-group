#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'vps-remote.ps1')
$cfg = Get-Content 'C:\dev\omni group\deploy-secrets.local\deploy.config.json' -Raw | ConvertFrom-Json

$bash = @'
set -e
cd /opt/omni-group
ROOT_PW=$(grep '^DB_PASSWORD=' .env.docker.prod | head -1 | cut -d= -f2-)
echo "root_pw_len=${#ROOT_PW}"
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${ROOT_PW}|" atina-platform/atina/.env.docker.prod
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod exec -T postgres \
  psql -U atina_user -d atina_saas_db -c "ALTER USER atina_user WITH PASSWORD '${ROOT_PW}';"
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d --force-recreate atina-api
sleep 20
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps atina-api
curl -fsS http://127.0.0.1:3002/health | head -c 120 || echo local_fail
curl -fsS -o /dev/null -w 'public=%{http_code}\n' https://api.omnigrouptech.com/health || echo public_fail
'@

Write-Host '== Fix DB auth (atina_user) ==' -ForegroundColor Cyan
$session = $null
try {
  $session = Invoke-VpsRemoteBashScript -VpsHost $cfg.vpsHost.Trim() -VpsUser $cfg.vpsUser.Trim() `
    -SshPassword $cfg.sshPassword -ScriptContent $bash -TimeOutSeconds 300 -Session $session
} finally { Close-VpsSession -Session $session }
