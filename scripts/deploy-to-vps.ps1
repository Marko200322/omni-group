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
  [switch]$SkipBuild,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'

if (-not $ApiDomain) {
  if ($SiteDomain -match '^api\.') { $ApiDomain = $SiteDomain }
  else { $ApiDomain = "api.$SiteDomain" }
}

function Invoke-Ssh([string]$Cmd) {
  $sshArgs = @()
  if ($SshKey) { $sshArgs += @('-i', $SshKey) }
  $sshArgs += @("${VpsUser}@${VpsHost}", $Cmd)
  if ($DryRun) {
    Write-Host "[dry-run] ssh $($sshArgs -join ' ')" -ForegroundColor Yellow
    return
  }
  & ssh @sshArgs
  if ($LASTEXITCODE -ne 0) { throw "SSH failed: $Cmd" }
}

function Invoke-Rsync() {
  $rsync = Get-Command rsync -ErrorAction SilentlyContinue
  if (-not $rsync) {
    throw 'rsync nije instaliran. Instaliraj Git for Windows / WSL rsync ili kopiraj repo rucno na VPS.'
  }
  $excludes = @(
    '--exclude', 'node_modules',
    '--exclude', '.git',
    '--exclude', '.tmp',
    '--exclude', 'TMP~1',
    '--exclude', '.npm-cache',
    '--exclude', 'dist',
    '--exclude', '.next'
  )
  $sshOpt = if ($SshKey) { "ssh -i $SshKey" } else { 'ssh' }
  $args = @('-avz', '--delete', '-e', $sshOpt) + $excludes + @(
    "$repoRoot/",
    "${VpsUser}@${VpsHost}:${RemotePath}/"
  )
  if ($DryRun) {
    Write-Host "[dry-run] rsync $($args -join ' ')" -ForegroundColor Yellow
    return
  }
  & rsync @args
  if ($LASTEXITCODE -ne 0) { throw 'rsync failed' }
}

Write-Host '=== Deploy to VPS ===' -ForegroundColor Cyan
Write-Host "  Host: $VpsUser@$VpsHost"
Write-Host "  Site: https://$SiteDomain"
Write-Host "  API:  https://$ApiDomain"
Write-Host ''

# 1) Generisi prod env sa lokalnim kljucevima
& (Join-Path $PSScriptRoot 'prepare-vps-prod.ps1') -SiteDomain $SiteDomain -ApiDomain $ApiDomain
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$adminPass = $null
foreach ($line in Get-Content (Join-Path $atinaRoot '.env.vps.prod')) {
  if ($line -match '^ADMIN_PASSWORD=(.*)$') { $adminPass = $Matches[1].Trim(); break }
}

# 2) Priprema remote dir
Invoke-Ssh "mkdir -p $RemotePath"

# 3) Sync repo
Invoke-Rsync

# 4) Kopiraj env na VPS
$envCopy = @"
cd $RemotePath
cp -f .env.vps.prod .env.docker.prod
cp -f atina-platform/atina/.env.vps.prod atina-platform/atina/.env.docker.prod
cp -f apps/omnigroup-web/.env.vps.production apps/omnigroup-web/.env.production
"@
Invoke-Ssh $envCopy

# 5) Docker deploy
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
Invoke-Ssh $deployCmd

Write-Host ''
Write-Host '=== VPS deploy zavrsen ===' -ForegroundColor Green
Write-Host "  Web:  https://$SiteDomain"
Write-Host "  API:  https://$ApiDomain/health"
Write-Host "  Admin: admin@atina.io / $adminPass"
Write-Host ''
Write-Host 'Smoke (lokalno posle DNS propagacije):' -ForegroundColor Cyan
Write-Host "  .\scripts\staging-smoke-remote.ps1 -AtinaNodeBase https://$ApiDomain"
Write-Host "  .\scripts\smoke-platform-full.ps1 -WebBase https://$SiteDomain -Password <admin-pass>"
