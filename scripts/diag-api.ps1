#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'vps-remote.ps1')
$cfg = Get-Content 'C:\dev\omni group\deploy-secrets.local\deploy.config.json' -Raw | ConvertFrom-Json
$cmd = @'
cd /opt/omni-group
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod logs --tail 40 atina-api
curl -fsS http://127.0.0.1:3002/health || echo local_fail
'@
$session = $null
try {
  Invoke-VpsRemoteCommand -VpsHost $cfg.vpsHost -VpsUser $cfg.vpsUser -SshPassword $cfg.sshPassword -Command $cmd -TimeOutSeconds 120 -Session $session
} finally { Close-VpsSession -Session $session }
