#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'vps-remote.ps1')
$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$key = if ($cfg.sshKeyPath) { [string]$cfg.sshKeyPath.Trim() } else { '' }
$pass = if ($cfg.sshPassword) { [string]$cfg.sshPassword } else { '' }
$cmd = @'
docker logs --tail 80 omni-group-atina-api-1 2>&1 | grep -iE 'notification|error|read_at|Internal' | tail -40
'@
$session = $null
try {
  if ($key) {
    $session = Invoke-VpsRemoteCommand -VpsHost $cfg.vpsHost.Trim() -VpsUser $cfg.vpsUser.Trim() -SshKey $key -Command $cmd -TimeOutSeconds 60 -Session $session
  } else {
    $session = Invoke-VpsRemoteCommand -VpsHost $cfg.vpsHost.Trim() -VpsUser $cfg.vpsUser.Trim() -SshPassword $pass -Command $cmd -TimeOutSeconds 60 -Session $session
  }
} finally {
  Close-VpsSession -Session $session
}
