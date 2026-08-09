#Requires -Version 5.1
<#
.SYNOPSIS
  Install M4 daily hunt cron on VPS (REDOM 6b).

.DESCRIPTION
  Uploads m4-daily-hunt.sh + env file, installs crontab entry.
  Default: hunt only (M4_OUTBOUND_SEND=0). Set -EnableOutboundSend after real domain warmup.

  Outbound gate: keep M4_OUTBOUND_SEND=0 until ≥1 week of draft-only cron runs with 0 failed
  outbound messages (inspect /var/log/m4-daily-hunt.log and outbound/stats byStatus.failed).
  install-m4-daily-cron.ps1 never sets send=1 unless -EnableOutboundSend is passed explicitly.

.EXAMPLE
  .\scripts\install-m4-daily-cron.ps1
  .\scripts\install-m4-daily-cron.ps1 -EnableOutboundSend -CronExpr '0 8 * * *'
  .\scripts\install-m4-daily-cron.ps1 -DryRun
#>
param(
  [string]$ConfigPath = '',
  [string]$CronExpr = '0 8 * * *',
  [string]$VerticalSlug = 'marketing',
  [int]$Intensity = 40,
  [switch]$EnableOutboundSend,
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
$remote = if ($cfg.remotePath) { $cfg.remotePath.Trim() } else { '/opt/omni-group' }
$apiDomain = if ($cfg.apiDomain) { $cfg.apiDomain.Trim() } else { "api.$($cfg.siteDomain)" }
$apiBase = "https://$apiDomain"
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($pass)) {
  throw 'adminEmail/adminPassword required in deploy.config.json'
}

$sendFlag = if ($EnableOutboundSend) { '1' } else { '0' }
$shLocal = Join-Path $scriptsDir 'm4-daily-hunt.sh'
if (-not (Test-Path $shLocal)) { throw "Missing $shLocal" }

$envBody = @"
API_BASE=$apiBase
ADMIN_EMAIL=$email
ADMIN_PASSWORD=$pass
VERTICAL_SLUG=$VerticalSlug
INTENSITY=$Intensity
TEMPLATE_KEY=nurture-loop
M4_OUTBOUND_SEND=$sendFlag
"@

Write-Host '=== install-m4-daily-cron ===' -ForegroundColor Cyan
Write-Host "  remote=$remote"
Write-Host "  cron='$CronExpr'"
Write-Host "  outboundSend=$sendFlag (0=hunt/drafts only)"
Write-Host "  vertical=$VerticalSlug intensity=$Intensity"

if ($DryRun) {
  Write-Host '[dry-run] would upload script+env and install crontab' -ForegroundColor Yellow
  exit 0
}

Ensure-PoshSshModule
$cred = Get-VpsCredential -User $cfg.vpsUser -Password $cfg.sshPassword

$tmpEnv = Join-Path $env:TEMP ("m4-daily-hunt-{0}.env" -f (Get-Date -Format 'yyyyMMddHHmmss'))
Set-Content -Path $tmpEnv -Value $envBody -Encoding ASCII

Set-SCPItem -ComputerName $cfg.vpsHost -Credential $cred -AcceptKey -Path $shLocal -Destination "$remote/scripts" -ErrorAction Stop
# env goes to deploy-secrets.local (gitignored on VPS tree if present)
$session = Connect-VpsSession -VpsHost $cfg.vpsHost -VpsUser $cfg.vpsUser -SshPassword $cfg.sshPassword
$null = Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p $remote/scripts $remote/deploy-secrets.local /var/log" -TimeOut 60
Close-VpsSession -Session $session

$localEnvName = Split-Path -Leaf $tmpEnv
Set-SCPItem -ComputerName $cfg.vpsHost -Credential $cred -AcceptKey -Path $tmpEnv -Destination "$remote/deploy-secrets.local" -ErrorAction Stop
Remove-Item $tmpEnv -Force -ErrorAction SilentlyContinue

# Rename uploaded env to fixed name (SCP keeps local filename)
$installCmd = @"
set -e
cd $remote
if [ -f deploy-secrets.local/$localEnvName ]; then
  mv -f deploy-secrets.local/$localEnvName deploy-secrets.local/m4-daily-hunt.env
fi
test -f deploy-secrets.local/m4-daily-hunt.env
chmod 700 scripts/m4-daily-hunt.sh
chmod 600 deploy-secrets.local/m4-daily-hunt.env
# ensure LF line endings
sed -i 's/\r$//' scripts/m4-daily-hunt.sh deploy-secrets.local/m4-daily-hunt.env
# install jq if missing
if ! command -v jq >/dev/null 2>&1; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq jq
fi
CRON_LINE='$CronExpr M4_CRON_ENV=$remote/deploy-secrets.local/m4-daily-hunt.env $remote/scripts/m4-daily-hunt.sh >> /var/log/m4-daily-hunt.log 2>&1'
# replace previous m4-daily-hunt entries
(crontab -l 2>/dev/null | grep -v 'm4-daily-hunt' || true; echo "`$CRON_LINE") | crontab -
echo '--- crontab ---'
crontab -l | grep m4-daily-hunt || true
echo INSTALL_OK
"@

$session = Connect-VpsSession -VpsHost $cfg.vpsHost -VpsUser $cfg.vpsUser -SshPassword $cfg.sshPassword
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command $installCmd -TimeOut 300
if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ } }
if ($result.ExitStatus -ne 0) {
  Close-VpsSession -Session $session
  throw "Install failed exit=$($result.ExitStatus)"
}

if ($RunOnceNow) {
  Write-Host '=== RunOnceNow ===' -ForegroundColor Cyan
  $run = Invoke-SSHCommand -SessionId $session.SessionId -Command "M4_CRON_ENV=$remote/deploy-secrets.local/m4-daily-hunt.env $remote/scripts/m4-daily-hunt.sh" -TimeOut 300
  if ($run.Output) { $run.Output | ForEach-Object { Write-Host $_ } }
  if ($run.Error) { $run.Error | ForEach-Object { Write-Host $_ } }
  if ($run.ExitStatus -ne 0) {
    Close-VpsSession -Session $session
    throw "RunOnceNow failed exit=$($run.ExitStatus)"
  }
}

Close-VpsSession -Session $session
Write-Host '=== m4 daily cron installed ===' -ForegroundColor Green
Write-Host "  log: /var/log/m4-daily-hunt.log"
Write-Host "  enable send later: set M4_OUTBOUND_SEND=1 in deploy-secrets.local/m4-daily-hunt.env (after real warmup)"
