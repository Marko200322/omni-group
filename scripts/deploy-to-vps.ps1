# Deploy Omni Group na VPS (SSH + Docker Compose prod + Caddy TLS)
#Requires -Version 5.1
param(
  [Parameter(Mandatory)]
  [string]$VpsHost,
  [Parameter(Mandatory)]
  [string]$SiteDomain,
  [string]$VpsUser = 'root',
  [string]$ApiDomain = '',
  [string]$RemotePath = '/opt/omni-group',
  [string]$SshKey = '',
  [string]$SshPassword = '',
  [switch]$SkipBuild,
  [switch]$SkipPrepare,
  [switch]$FreshWipe,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'
. (Join-Path $PSScriptRoot 'vps-remote.ps1')

if (-not $ApiDomain) {
  if ($SiteDomain -match '^api\.') { $ApiDomain = $SiteDomain }
  else { $ApiDomain = "api.$SiteDomain" }
}

if (-not $SshKey -and -not $SshPassword) {
  Write-Host 'Napomena: bez sshKeyPath i sshPassword — SSH ce traziti lozinku interaktivno.' -ForegroundColor Yellow
}

$session = $null

try {
  Write-Host '=== Deploy to VPS ===' -ForegroundColor Cyan
  Write-Host "  Host: $VpsUser@$VpsHost"
  Write-Host "  Auth: $(if ($SshKey) { 'SSH kljuc' } elseif ($SshPassword) { 'lozinka (Posh-SSH)' } else { 'interaktivno' })"
  Write-Host "  Site: https://$SiteDomain"
  Write-Host "  API:  https://$ApiDomain"
  Write-Host ''

  if (-not $SkipPrepare) {
    & (Join-Path $PSScriptRoot 'prepare-vps-prod.ps1') -SiteDomain $SiteDomain -ApiDomain $ApiDomain -Phase v6
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  $adminPass = $null
  foreach ($line in Get-Content (Join-Path $atinaRoot '.env.vps.prod')) {
    if ($line -match '^ADMIN_PASSWORD=(.*)$') { $adminPass = $Matches[1].Trim(); break }
  }

  if ($FreshWipe) {
    Write-Host '== Fresh wipe (stop stack, remove images/volumes, delete remote dir) ==' -ForegroundColor Yellow
    $wipeCmd = @"
set -e
if [ -d '$RemotePath' ] && [ -f '$RemotePath/docker-compose.prod.yml' ]; then
  cd '$RemotePath'
  if [ -f .env.docker.prod ]; then
    docker compose -f docker-compose.prod.yml --env-file .env.docker.prod down --rmi all -v --remove-orphans || true
  else
    docker compose -f docker-compose.prod.yml down --rmi all -v --remove-orphans || true
  fi
fi
rm -rf '$RemotePath'
mkdir -p '$RemotePath'
echo 'Fresh wipe done: $RemotePath'
"@
    $session = Invoke-VpsRemoteCommand -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
      -SshPassword $SshPassword -Command $wipeCmd -TimeOutSeconds 600 -DryRun:$DryRun -Session $session
  }

  $session = Invoke-VpsRemoteCommand -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
    -SshPassword $SshPassword -Command "mkdir -p $RemotePath" -DryRun:$DryRun -Session $session

  $session = Sync-VpsRemoteDirectory -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
    -SshPassword $SshPassword -LocalRoot $repoRoot -RemotePath $RemotePath -DryRun:$DryRun -Session $session

  $envCopy = @"
cd $RemotePath
cp -f .env.vps.prod .env.docker.prod
cp -f atina-platform/atina/.env.vps.prod atina-platform/atina/.env.docker.prod
cp -f apps/omnigroup-web/.env.vps.production apps/omnigroup-web/.env.production
"@
  $session = Invoke-VpsRemoteCommand -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
    -SshPassword $SshPassword -Command $envCopy -DryRun:$DryRun -Session $session

  $deployCmd = @"
cd $RemotePath
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod build atina-api web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile setup run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile setup run --rm seed
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d postgres redis atina-api web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile tls up -d caddy
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps
"@
  if ($SkipBuild) {
    $deployCmd = $deployCmd -replace 'docker compose -f docker-compose.prod.yml --env-file .env.docker.prod build atina-api web\r?\n', ''
  }
  $session = Invoke-VpsRemoteCommand -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
    -SshPassword $SshPassword -Command $deployCmd -TimeOutSeconds 7200 -DryRun:$DryRun -Session $session

  Write-Host ''
  Write-Host '=== VPS deploy zavrsen ===' -ForegroundColor Green
  Write-Host "  Web:  https://$SiteDomain"
  Write-Host "  API:  https://$ApiDomain/health"
  if ($adminPass) { Write-Host "  Admin: admin@atina.io / $adminPass" }
  Write-Host ''
  Write-Host 'Smoke (posle DNS propagacije, TTL 1800 = do ~30 min):' -ForegroundColor Cyan
  Write-Host "  .\scripts\staging-smoke-remote.ps1 -AtinaNodeBase https://$ApiDomain"
  Write-Host "  .\scripts\smoke-platform-full.ps1 -WebBase https://$SiteDomain -Password <admin-pass>"
} finally {
  Close-VpsSession -Session $session
}
