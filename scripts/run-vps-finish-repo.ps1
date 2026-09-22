#Requires -Version 5.1
<#
.SYNOPSIS
  Pokrece finish-repo-test-vps.sh na VPS (test:ci, hunt, smoke-stack).
.EXAMPLE
  .\scripts\run-vps-finish-repo.ps1 -FollowLog
#>
param(
  [switch]$FollowLog,
  [switch]$UseProdDeployPath,
  [string]$Branch = 'feat/phase10-outreach-send-enabled',
  [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
if (-not $ConfigPath) {
  $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
}
if (-not (Test-Path $ConfigPath)) { throw "Nema $ConfigPath" }

$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$key = $cfg.sshKeyPath.Trim()
$vpsHost = $cfg.vpsHost.Trim()
if (-not $key -or -not (Test-Path $key)) { throw 'sshKeyPath u deploy.config.json' }

$finishSh = Join-Path $scriptsDir 'finish-repo-test-vps.sh'
$nestYml = Join-Path $repoRoot 'docker-compose.nest-vps-verify.yml'
$remoteRepo = if ($UseProdDeployPath) { '/opt/omni-group' } else { '/opt/omni-group-ci-verify' }

scp -o StrictHostKeyChecking=accept-new -i $key $finishSh "root@${vpsHost}:/tmp/finish-repo-test-vps.sh" | Out-Null
scp -o StrictHostKeyChecking=accept-new -i $key $nestYml "root@${vpsHost}:/tmp/docker-compose.nest-vps-verify.yml" | Out-Null

$gitSync = if ($UseProdDeployPath) {
"echo 'UseProdDeployPath: skip git sync on prod tree'"
} else {
@"
git fetch origin '$Branch'
git checkout '$Branch' 2>/dev/null || git checkout -B '$Branch' "origin/$Branch"
git reset --hard "origin/$Branch"
"@
}

$remote = @"
set -e
cd '${remoteRepo}'
$gitSync
cp /tmp/finish-repo-test-vps.sh ${remoteRepo}/scripts/finish-repo-test-vps.sh
cp /tmp/docker-compose.nest-vps-verify.yml ${remoteRepo}/docker-compose.nest-vps-verify.yml
chmod +x ${remoteRepo}/scripts/finish-repo-test-vps.sh
pkill -f 'finish-repo-test-vps.sh' 2>/dev/null || true
export REPO='${remoteRepo}'
export BRANCH='$Branch'
export SKIP_GIT_SYNC=1
nohup bash ${remoteRepo}/scripts/finish-repo-test-vps.sh >/dev/null 2>&1 &
echo "Started finish-repo branch=$Branch"
echo "Log: /var/log/omni-finish-repo-test.log"
sleep 3
tail -n 12 /var/log/omni-finish-repo-test.log
"@

$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remote))
ssh -o StrictHostKeyChecking=accept-new -i $key "root@$vpsHost" "echo $b64 | base64 -d | bash"

if ($FollowLog) {
  Write-Host 'Following finish log (Ctrl+C to stop)...' -ForegroundColor Cyan
  ssh -i $key "root@$vpsHost" 'tail -f /var/log/omni-finish-repo-test.log'
}
