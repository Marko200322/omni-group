#Requires -Version 5.1
<#
.SYNOPSIS
  Install keep-warm cron on VPS (every 5 min) — fixes cold-start UX.

.EXAMPLE
  .\scripts\install-keep-warm-cron.ps1
  .\scripts\install-keep-warm-cron.ps1 -RunOnceNow
#>
param(
  [string]$ConfigPath = '',
  [string]$CronExpr = '*/5 * * * *',
  [switch]$DryRun,
  [switch]$RunOnceNow
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'vps-remote.ps1')

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
}
if (-not (Test-Path $ConfigPath)) { throw "Missing $ConfigPath" }
$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$remote = if ($cfg.remotePath) { "$($cfg.remotePath)".Trim() } else { '/opt/omni-group' }
$site = if ($cfg.siteDomain) { "$($cfg.siteDomain)".Trim() } else { 'omnigrouptech.com' }
$api = if ($cfg.apiDomain -and "$($cfg.apiDomain)".Trim()) { "$($cfg.apiDomain)".Trim() } else { "api.$site" }

$shLocal = Join-Path $scriptsDir 'keep-warm-prod.sh'
if (-not (Test-Path $shLocal)) { throw "Missing $shLocal" }

Write-Host '=== install-keep-warm-cron ===' -ForegroundColor Cyan
Write-Host "  remote=$remote cron='$CronExpr'"

if ($DryRun) {
  Write-Host '[dry-run]' -ForegroundColor Yellow
  exit 0
}

Ensure-PoshSshModule
$cred = Get-VpsCredential -User $cfg.vpsUser -Password $cfg.sshPassword

Set-SCPItem -ComputerName $cfg.vpsHost -Credential $cred -AcceptKey -Path $shLocal -Destination "$remote/scripts" -ErrorAction Stop

$installCmd = @"
set -e
cd '$remote'
chmod 700 scripts/keep-warm-prod.sh
sed -i 's/\r$//' scripts/keep-warm-prod.sh
mkdir -p /var/log
CRON_LINE='$CronExpr KEEP_WARM_SITE_URL=https://$site KEEP_WARM_API_URL=https://$api $remote/scripts/keep-warm-prod.sh >> /var/log/keep-warm-prod.log 2>&1'
(crontab -l 2>/dev/null | grep -v 'keep-warm-prod' || true; echo "`$CRON_LINE") | crontab -
crontab -l | grep keep-warm-prod || true
echo INSTALL_OK
"@

$session = Connect-VpsSession -VpsHost $cfg.vpsHost -VpsUser $cfg.vpsUser -SshPassword $cfg.sshPassword
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command $installCmd -TimeOut 120
if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.ExitStatus -ne 0) {
  Close-VpsSession -Session $session
  throw "Install failed exit=$($result.ExitStatus)"
}

if ($RunOnceNow) {
  $run = Invoke-SSHCommand -SessionId $session.SessionId -Command "KEEP_WARM_SITE_URL=https://$site KEEP_WARM_API_URL=https://$api bash $remote/scripts/keep-warm-prod.sh" -TimeOut 120
  if ($run.Output) { $run.Output | ForEach-Object { Write-Host $_ } }
  if ($run.Error) { $run.Error | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow } }
  if ($run.ExitStatus -ne 0) {
    Write-Host "WARN: RunOnceNow exit=$($run.ExitStatus) (cron still installed)" -ForegroundColor Yellow
  }
}

Close-VpsSession -Session $session
Write-Host '=== keep-warm cron installed ===' -ForegroundColor Green
Write-Host '  log: /var/log/keep-warm-prod.log'
