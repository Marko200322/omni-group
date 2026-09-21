#Requires -Version 5.1
<#
.SYNOPSIS
  Kompletan sistemski test na VPS (repo + docker-prod smoke + prod HTTP).

.DESCRIPTION
  Parity with scripts/verify-monorepo.ps1 and GitHub CI (monorepo): Python (Doslednost dok + pytest),
  apps/omnigroup-web build unless -SkipOmnigroupWeb, atina-system verify:ci.
  Bundled Atina HTTP gate: atina-platform/atina npm run smoke:all via docker-prod-test.ps1.
  See docs/GIT-BRANCH-PROTECTION.md.
#>
param(
  [switch]$FollowLog,
  [switch]$RunProdAudit,
  [string]$Branch = 'feat/phase10-outreach-send-enabled'
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$configPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
if (-not (Test-Path $configPath)) { throw "Nema $configPath" }
$cfg = Get-Content $configPath -Raw | ConvertFrom-Json
$key = $cfg.sshKeyPath.Trim()
$vpsHost = $cfg.vpsHost.Trim()

$localScript = Join-Path $scriptsDir 'verify-system-vps.sh'
scp -o StrictHostKeyChecking=accept-new -i $key $localScript "root@${vpsHost}:/tmp/run-omni-system-verify.sh" | Out-Null
scp -o StrictHostKeyChecking=accept-new -i $key (Join-Path $scriptsDir 'verify-monorepo-vps.sh') "root@${vpsHost}:/tmp/verify-monorepo-vps.sh" | Out-Null

$remote = @"
chmod +x /tmp/run-omni-system-verify.sh /tmp/verify-monorepo-vps.sh
pkill -f run-omni-system-verify.sh 2>/dev/null || true
export BRANCH='$Branch'
export REPO=/opt/omni-group-ci-verify
export MONO_SCRIPT=/tmp/verify-monorepo-vps.sh
nohup bash /tmp/run-omni-system-verify.sh >/dev/null 2>&1 &
echo 'System verify started. Log: /var/log/omni-verify-system.log'
sleep 3
tail -n 15 /var/log/omni-verify-system.log
"@
ssh -o StrictHostKeyChecking=accept-new -i $key "root@$vpsHost" $remote

if ($RunProdAudit) {
  Write-Host '== Local: prod audit (Resend/Slack/DMARC checks) ==' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'audit-prod-autonomous.ps1')
}

if ($FollowLog) {
  ssh -i $key "root@$vpsHost" 'tail -f /var/log/omni-verify-system.log'
}
