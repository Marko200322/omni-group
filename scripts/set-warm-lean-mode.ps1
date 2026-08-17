#Requires -Version 5.1
<#
.SYNOPSIS
  Warm prodaja + lean inbound — gasi M4 hunt cron, cuva kontakt/CRM/Telegram.

.EXAMPLE
  .\scripts\set-warm-lean-mode.ps1
  .\scripts\set-warm-lean-mode.ps1 -DryRun
#>
param(
  [switch]$DryRun,
  [int]$MonthlyBudgetEur = 150,
  [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir

. (Join-Path $scriptsDir 'vps-remote.ps1')
. (Join-Path $scriptsDir 'prod-budget-profile.ps1')
. (Join-Path $scriptsDir 'prod-factory-phase.ps1')
. (Join-Path $scriptsDir 'deploy-config-env.ps1')
. (Join-Path $scriptsDir 'warm-lean-profile.ps1')

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
}
if (-not (Test-Path $ConfigPath)) { throw "Missing $ConfigPath" }

$config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$siteDomain = [string]$config.siteDomain
$apiDomain = if ($config.apiDomain -and "$($config.apiDomain)".Trim()) {
  "$($config.apiDomain)".Trim()
} else {
  "api.$siteDomain"
}
$remote = if ($config.remotePath) { "$($config.remotePath)".Trim() } else { '/opt/omni-group' }
$budget = Resolve-MonthlyBudgetEur $MonthlyBudgetEur

Write-Host '=== set-warm-lean-mode ===' -ForegroundColor Cyan
Write-WarmLeanPlanSummary $budget

if (-not $DryRun) {
  $config.monthlyBudgetEur = $budget
  $config.factoryPhase = 'M3'
  $config.prodMode = 'lean'
  $config.factoryPhaseAuto = $false
  $config | ConvertTo-Json -Depth 8 | Set-Content -Path $ConfigPath -Encoding UTF8
  Write-Host '  deploy.config.json -> M3, lean, budget updated' -ForegroundColor Green
}

function Set-EnvLineLocal([string]$FilePath, [string]$Key, [string]$Value) {
  if (-not (Test-Path $FilePath)) { return }
  if ([string]::IsNullOrWhiteSpace($Value)) { return }
  Set-EnvLineInFile $FilePath $Key $Value
}

Write-Host '== prepare env (local) ==' -ForegroundColor Cyan
$phase = if ($config.phase) { "$($config.phase)".Trim() } else { 'v2' }
& (Join-Path $scriptsDir 'prepare-vps-prod.ps1') `
  -SiteDomain $siteDomain `
  -ApiDomain $apiDomain `
  -Phase $phase `
  -ProdMode 'lean' `
  -FactoryPhase 'M3' `
  -MonthlyBudgetEur $budget
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$atinaEnv = Join-Path $repoRoot 'atina-platform\atina\.env.vps.prod'
$webEnv = Join-Path $repoRoot 'apps\omnigroup-web\.env.vps.production'
$rootEnv = Join-Path $repoRoot '.env.vps.prod'

foreach ($entry in (Get-DeployConfigAtinaEnvPatches $config).GetEnumerator()) {
  Set-EnvLineLocal $atinaEnv $entry.Key $entry.Value
}
foreach ($entry in (Get-DeployConfigWebEnvPatches $config $siteDomain).GetEnumerator()) {
  Set-EnvLineLocal $webEnv $entry.Key $entry.Value
}
if ($config.paymentNotifyEmail) {
  Set-EnvLineLocal $atinaEnv 'PAYMENT_NOTIFY_EMAIL' "$($config.paymentNotifyEmail)".Trim()
}
Apply-WarmLeanInboundEnvFiles $repoRoot $budget
Apply-BudgetProdEnvFiles $repoRoot $budget
Write-Host '  local .env.vps.* patched' -ForegroundColor Green

if ($DryRun) {
  Write-Host '[dry-run] would upload env + disable cron + restart web/atina-api' -ForegroundColor Yellow
  exit 0
}

Write-Host '== upload env to VPS (preserve DB password) ==' -ForegroundColor Cyan
Ensure-PoshSshModule
$cred = Get-VpsCredential -User $config.vpsUser -Password $config.sshPassword

$localRootEnv = Join-Path $repoRoot '.env.vps.prod'
$localAtinaEnv = Join-Path $repoRoot 'atina-platform\atina\.env.vps.prod'
$localWebEnv = Join-Path $repoRoot 'apps\omnigroup-web\.env.vps.production'

Set-SCPItem -ComputerName $config.vpsHost -Credential $cred -AcceptKey -Path $localRootEnv -Destination $remote -ErrorAction Stop
Set-SCPItem -ComputerName $config.vpsHost -Credential $cred -AcceptKey -Path $localAtinaEnv -Destination "$remote/atina-platform/atina" -ErrorAction Stop
Set-SCPItem -ComputerName $config.vpsHost -Credential $cred -AcceptKey -Path $localWebEnv -Destination "$remote/apps/omnigroup-web" -ErrorAction Stop

$remoteCmd = @"
set -e
cd '$remote'
echo '=== warm lean: preserve DB password ==='
ROOT_PW=`$(grep '^DB_PASSWORD=' .env.docker.prod 2>/dev/null | head -1 | cut -d= -f2- || true)
cp -f .env.vps.prod .env.docker.prod
cp -f atina-platform/atina/.env.vps.prod atina-platform/atina/.env.docker.prod
if [ -f apps/omnigroup-web/.env.vps.production ]; then
  cp -f apps/omnigroup-web/.env.vps.production apps/omnigroup-web/.env.production
fi
if [ -n "`$ROOT_PW" ]; then
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=`$ROOT_PW|" .env.docker.prod
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=`$ROOT_PW|" atina-platform/atina/.env.docker.prod
fi
sed -i 's/\r$//' .env.docker.prod atina-platform/atina/.env.docker.prod apps/omnigroup-web/.env.production

echo '=== warm lean: disable M4 daily hunt cron ==='
(crontab -l 2>/dev/null | grep -v 'm4-daily-hunt' || true) | crontab -
crontab -l 2>/dev/null | grep m4-daily-hunt && echo 'WARN cron still present' || echo 'cron removed OK'

echo '=== warm lean: key flags ==='
grep -E '^(FACTORY_PHASE|ENABLE_SCRAPER|LEAD_DATABASE_ENABLED|LEAD_ENRICH_ON_HUNT|OUTREACH_DAILY_CAP|AUTONOMY_ENABLED|OWNER_MONTHLY_BUDGET_EUR)=' atina-platform/atina/.env.docker.prod | head -20

echo '=== restart web + atina-api ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod config >/dev/null
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d --force-recreate atina-api web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile tls up -d caddy
sleep 8
curl -fsS -o /dev/null -w 'api_health=%{http_code}\n' https://api.omnigrouptech.com/health || true
curl -fsS -o /dev/null -w 'web_home=%{http_code}\n' https://omnigrouptech.com/ || true
echo WARM_LEAN_OK
"@

$session = Connect-VpsSession -VpsHost $config.vpsHost -VpsUser $config.vpsUser -SshPassword $config.sshPassword
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remoteCmd -TimeOut 300
if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow } }
Close-VpsSession -Session $session
if ($result.ExitStatus -ne 0) { throw "Remote warm-lean failed exit=$($result.ExitStatus)" }

Write-Host '== contact smoke ==' -ForegroundColor Cyan
try {
  & (Join-Path $scriptsDir 'test-contact-resend.ps1') -WebBase "https://$siteDomain" -Prod
} catch {
  throw "Contact smoke failed after warm-lean apply: $($_.Exception.Message)"
}

Write-Host ''
Write-Host '=== Warm lean mode ACTIVE ===' -ForegroundColor Green
Write-Host '  Inbound: contact -> Resend + Telegram + CRM'
Write-Host '  Spend:   ~EUR 50/mo (VPS + minimal AI on fulfillment only)'
Write-Host '  OFF:     daily hunt cron, Apify/Hunter auto, outbound send'
Write-Host '  Sales:   warm poruke rucno — sistem skuplja kontakte sa sajta'
