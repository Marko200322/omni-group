#Requires -Version 5.1
<#
.SYNOPSIS
  Pokrece pun verify-monorepo na VPS (bez opterecenja laptopa).

.EXAMPLE
  .\scripts\run-vps-verify.ps1
  .\scripts\run-vps-verify.ps1 -FollowLog
#>
param(
  [switch]$FollowLog,
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
$host = $cfg.vpsHost.Trim()
if (-not $key -or -not (Test-Path $key)) { throw 'sshKeyPath u deploy.config.json' }

$localScript = Join-Path $scriptsDir 'verify-monorepo-vps.sh'
scp -o StrictHostKeyChecking=accept-new -i $key $localScript "root@${host}:/tmp/run-omni-verify.sh" | Out-Null

$remote = @"
chmod +x /tmp/run-omni-verify.sh
pkill -f '/tmp/run-omni-verify.sh' 2>/dev/null || true
export BRANCH='$Branch'
nohup bash /tmp/run-omni-verify.sh >/dev/null 2>&1 &
echo "Started VPS verify branch=$Branch"
echo "Log: /var/log/omni-verify-monorepo.log"
sleep 2
tail -n 8 /var/log/omni-verify-monorepo.log
"@

ssh -o StrictHostKeyChecking=accept-new -i $key "root@$host" $remote

if ($FollowLog) {
  Write-Host 'Following log (Ctrl+C to stop)...' -ForegroundColor Cyan
  ssh -i $key "root@$host" 'tail -f /var/log/omni-verify-monorepo.log'
}
