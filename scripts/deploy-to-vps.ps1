# Deploy Omni Group na VPS (SSH + Docker Compose prod + Caddy TLS)
#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy na VPS. Ako postoji deploy-secrets.local/deploy.config.json, ucitava host/domene/SSH i patch-uje env.

.EXAMPLE
  # Prod-safe (bez migrate/seed/postgres recreate):
  .\scripts\deploy-to-vps.ps1 -VpsHost 5.189.184.103 -SiteDomain omnigrouptech.com -SafeDeploy

  # Sa config fajlom (auto-detect):
  .\scripts\deploy-to-vps.ps1 -SafeDeploy -SkipSeed

  # Pun first-time deploy (migrate + seed):
  .\scripts\deploy-to-vps.ps1 -VpsHost ... -SiteDomain ...
#>
param(
  [string]$VpsHost = '',
  [string]$SiteDomain = '',
  [string]$VpsUser = 'root',
  [string]$ApiDomain = '',
  [string]$RemotePath = '/opt/omni-group',
  [string]$SshKey = '',
  [string]$SshPassword = '',
  [string]$ConfigPath = '',
  [ValidateSet('v2', 'v3', 'v4', 'v5', 'v6')]
  [string]$Phase = 'v2',
  [ValidateSet('lean', 'full')]
  [string]$ProdMode = 'lean',
  [ValidateSet('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6')]
  [string]$FactoryPhase = 'M0',
  [int]$MonthlyBudgetEur = 0,
  [switch]$SkipBuild,
  [switch]$SkipPrepare,
  [switch]$SkipSeed,
  [switch]$SafeDeploy,
  [switch]$FreshWipe,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'
$secretsDir = Join-Path $repoRoot 'deploy-secrets.local'
. (Join-Path $PSScriptRoot 'vps-remote.ps1')

$deployConfig = $null
if (-not $ConfigPath) {
  $defaultConfig = Join-Path $secretsDir 'deploy.config.json'
  if (Test-Path $defaultConfig) { $ConfigPath = $defaultConfig }
}

if ($ConfigPath -and (Test-Path $ConfigPath)) {
  . (Join-Path $PSScriptRoot 'prod-lean-profile.ps1')
  . (Join-Path $PSScriptRoot 'prod-budget-profile.ps1')
  . (Join-Path $PSScriptRoot 'prod-factory-phase.ps1')
  . (Join-Path $PSScriptRoot 'deploy-config-env.ps1')
  . (Join-Path $PSScriptRoot 'warm-lean-profile.ps1')

  $deployConfig = Get-Content $ConfigPath -Raw | ConvertFrom-Json

  if ($deployConfig.vpsHost) { $VpsHost = $deployConfig.vpsHost.Trim() }
  if ($deployConfig.vpsUser) { $VpsUser = $deployConfig.vpsUser.Trim() }
  if ($deployConfig.siteDomain) { $SiteDomain = $deployConfig.siteDomain.Trim() }
  if ($deployConfig.remotePath) { $RemotePath = $deployConfig.remotePath.Trim() }
  if ($deployConfig.sshKeyPath) { $SshKey = $deployConfig.sshKeyPath.Trim() }
  if ($deployConfig.sshPassword) { $SshPassword = $deployConfig.sshPassword }
  if ($deployConfig.phase) { $Phase = "$($deployConfig.phase)".Trim() }
  if ($deployConfig.prodMode -and $deployConfig.prodMode.Trim()) {
    $ProdMode = $deployConfig.prodMode.Trim().ToLower()
  }

  $factoryPhaseRaw = if ($deployConfig.factoryPhase) { $deployConfig.factoryPhase } else { $FactoryPhase }
  $factoryAuto = $false
  if ($deployConfig.factoryPhaseAuto -eq $true) { $factoryAuto = $true }
  if ("$($deployConfig.factoryPhase)".Trim().ToUpper() -eq 'AUTO') { $factoryAuto = $true; $factoryPhaseRaw = 'M6' }
  $FactoryPhase = Resolve-FactoryPhase $factoryPhaseRaw
  if ($FactoryPhase -eq 'AUTO') { $FactoryPhase = 'M6'; $factoryAuto = $true }
  if (($FactoryPhase -eq 'M6' -or $factoryAuto) -and $ProdMode -eq 'lean') {
    Write-Host 'M6/AUTO factory: auto-switch prodMode lean -> full' -ForegroundColor Yellow
    $ProdMode = 'full'
  }

  if ($MonthlyBudgetEur -le 0) {
    $MonthlyBudgetEur = Resolve-MonthlyBudgetEur $deployConfig.monthlyBudgetEur
  }
}

if ([string]::IsNullOrWhiteSpace($VpsHost)) {
  throw 'Obavezno: -VpsHost ili deploy-secrets.local/deploy.config.json sa vpsHost'
}
if ([string]::IsNullOrWhiteSpace($SiteDomain)) {
  throw 'Obavezno: -SiteDomain ili deploy.config.json sa siteDomain'
}

if (-not $ApiDomain) {
  if ($deployConfig -and $deployConfig.apiDomain -and $deployConfig.apiDomain.Trim()) {
    $ApiDomain = $deployConfig.apiDomain.Trim()
  } elseif ($SiteDomain -match '^api\.') {
    $ApiDomain = $SiteDomain
  } else {
    $ApiDomain = "api.$SiteDomain"
  }
}

if (-not $SshKey -and -not $SshPassword) {
  Write-Host 'Napomena: bez sshKeyPath i sshPassword — SSH ce traziti lozinku interaktivno.' -ForegroundColor Yellow
}

$session = $null

try {
  Write-Host '=== Deploy to VPS ===' -ForegroundColor Cyan
  if ($deployConfig) { Write-Host "  Config: $ConfigPath" -ForegroundColor DarkGray }
  Write-Host "  Host: $VpsUser@$VpsHost"
  Write-Host "  Auth: $(if ($SshKey) { 'SSH kljuc' } elseif ($SshPassword) { 'lozinka (Posh-SSH)' } else { 'interaktivno' })"
  Write-Host "  Site: https://$SiteDomain"
  Write-Host "  API:  https://$ApiDomain"
  if ($SafeDeploy) { Write-Host '  Mode: SAFE (web + atina-api only, no migrate/seed)' -ForegroundColor Green }
  Write-Host ''

  if (-not $SkipPrepare) {
    $prepArgs = @{
      SiteDomain       = $SiteDomain
      ApiDomain        = $ApiDomain
      Phase            = $Phase
      ProdMode         = $ProdMode
      FactoryPhase     = $FactoryPhase
    }
    if ($MonthlyBudgetEur -gt 0) { $prepArgs.MonthlyBudgetEur = $MonthlyBudgetEur }
    if ($DryRun) { $prepArgs.DryRun = $true }
    & (Join-Path $PSScriptRoot 'prepare-vps-prod.ps1') @prepArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if ($deployConfig -and -not $DryRun) {
      Invoke-DeployConfigProdPipeline -Config $deployConfig -RepoRoot $repoRoot -SiteDomain $SiteDomain `
        -ApiDomain $ApiDomain -Phase $Phase -ProdMode $ProdMode -FactoryPhase $FactoryPhase `
        -MonthlyBudgetEur $(if ($MonthlyBudgetEur -gt 0) { $MonthlyBudgetEur } else { Resolve-MonthlyBudgetEur $deployConfig.monthlyBudgetEur })
    }
  }

  $adminPass = $null
  $atinaEnvPath = Join-Path $atinaRoot '.env.vps.prod'
  if (Test-Path $atinaEnvPath) {
    foreach ($line in Get-Content $atinaEnvPath) {
      if ($line -match '^ADMIN_PASSWORD=(.*)$') { $adminPass = $Matches[1].Trim(); break }
    }
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

  # Caddy requires real domains in .env.docker.prod (missing → localhost → crash loop)
  $domainGuard = @"
cd $RemotePath
for kv in SITE_DOMAIN=$SiteDomain API_DOMAIN=$ApiDomain; do
  key=`${kv%%=*}; val=`${kv#*=}
  if grep -q "^`${key}=" .env.docker.prod 2>/dev/null; then
    sed -i "s/^`${key}=.*/`${key}=`${val}/" .env.docker.prod
  else
    echo "`${key}=`${val}" >> .env.docker.prod
  fi
done
"@
  $session = Invoke-VpsRemoteCommand -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
    -SshPassword $SshPassword -Command $domainGuard -DryRun:$DryRun -Session $session

  # tar extract strips +x on shell scripts — restore all scripts/*.sh
  $chmodCmd = @"
cd $RemotePath
if [ -d scripts ]; then
  sed -i 's/\r$//' scripts/*.sh 2>/dev/null || true
  chmod +x scripts/*.sh 2>/dev/null || true
fi
"@
  $session = Invoke-VpsRemoteCommand -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
    -SshPassword $SshPassword -Command $chmodCmd -DryRun:$DryRun -Session $session

  if ($SafeDeploy) {
    $deployCmd = @"
cd $RemotePath
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod build atina-api web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d --no-deps --force-recreate atina-api web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps atina-api web postgres caddy
"@
  } else {
    $deployCmd = @"
cd $RemotePath
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod build atina-api web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod run --rm --user root --no-deps atina-api sh -c "mkdir -p /var/omni/forge && chown -R atina:atina /var/omni/forge"
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile setup run --rm migrate
"@
    if (-not $SkipSeed) {
      $deployCmd += @"

docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile setup run --rm seed
"@
    }
    $deployCmd += @"

docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d postgres redis atina-api web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile tls up -d caddy
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps
"@
  }

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
