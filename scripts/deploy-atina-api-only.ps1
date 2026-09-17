#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'vps-remote.ps1')
$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$remote = if ($cfg.remotePath) { $cfg.remotePath.Trim() } else { '/opt/omni-group' }

Write-Host '== Sync + rebuild atina-api only ==' -ForegroundColor Cyan
$session = $null
try {
  $session = Sync-VpsRemoteDirectory -VpsHost $cfg.vpsHost.Trim() -VpsUser $cfg.vpsUser.Trim() `
    -SshPassword $cfg.sshPassword -LocalRoot $repoRoot -RemotePath $remote -Session $session
  $cmd = @"
cd $remote
sed -i 's/\r$//' .env.docker.prod atina-platform/atina/.env.docker.prod 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod build atina-api
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d --force-recreate atina-api
sleep 8
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps atina-api
curl -fsS -o /dev/null -w 'health=%{http_code}\n' https://api.omnigrouptech.com/health
"@
  $session = Invoke-VpsRemoteCommand -VpsHost $cfg.vpsHost.Trim() -VpsUser $cfg.vpsUser.Trim() `
    -SshPassword $cfg.sshPassword -Command $cmd -TimeOutSeconds 7200 -Session $session
} finally {
  Close-VpsSession -Session $session
}
