#Requires -Version 5.1
# Emergency API recovery — diagnose + fix env + bring stack up (no hunt run)
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'vps-remote.ps1')

$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$remote = if ($cfg.remotePath) { $cfg.remotePath.Trim() } else { '/opt/omni-group' }
$adminEmail = [string]$cfg.adminEmail
$adminPass = [string]$cfg.adminPassword

$bash = @"
set -e
cd '$remote'

echo '=== DIAG: docker ps ==='
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true

echo '=== DIAG: env sanity ==='
for f in .env.docker.prod atina-platform/atina/.env.docker.prod; do
  echo "--- `$f ---"
  [ -f "`$f" ] || { echo MISSING; continue; }
  grep -nE '^\$|\\\$k=' "`$f" && echo 'BAD_LINES_FOUND' || echo 'no bad lines'
  head -n 15 "`$f"
done

echo '=== FIX: strip corrupt env lines ==='
for f in .env.docker.prod atina-platform/atina/.env.docker.prod; do
  [ -f "`$f" ] || continue
  sed -i '/^\$k=\$v/d' "`$f" || true
  sed -i '/^\\\$k=/d' "`$f" || true
done

echo '=== FIX: autonomy OFF (M4) ==='
for f in .env.docker.prod atina-platform/atina/.env.docker.prod; do
  [ -f "`$f" ] || continue
  for key in AUTONOMY_ENABLED AUTONOMY_AUTO_START_SCHEDULER AUTONOMY_MARKETING_ENABLED; do
    if grep -q "^`${key}=" "`$f"; then
      sed -i "s/^`${key}=.*/`${key}=false/" "`$f"
    else
      echo "`${key}=false" >> "`$f"
    fi
  done
done

echo '=== FIX: compose domains ==='
if [ -f .env.docker.prod ]; then
  grep -q '^SITE_DOMAIN=' .env.docker.prod && sed -i 's/^SITE_DOMAIN=.*/SITE_DOMAIN=omnigrouptech.com/' .env.docker.prod || echo 'SITE_DOMAIN=omnigrouptech.com' >> .env.docker.prod
  grep -q '^API_DOMAIN=' .env.docker.prod && sed -i 's/^API_DOMAIN=.*/API_DOMAIN=api.omnigrouptech.com/' .env.docker.prod || echo 'API_DOMAIN=api.omnigrouptech.com' >> .env.docker.prod
fi

echo '=== UP: full stack ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod config >/dev/null
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d postgres redis
sleep 5
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d atina-api web
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile tls up -d caddy
sleep 12

echo '=== STATUS ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps

echo '=== LOGS atina-api (tail) ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod logs --tail 30 atina-api 2>&1 || true

echo '=== LOGS caddy (tail) ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod logs --tail 15 caddy 2>&1 || true

set +e
echo '=== SMOKE ==='
curl -fsS -o /dev/null -w 'api_health=%{http_code} t=%{time_total}\n' https://api.omnigrouptech.com/health || echo api_fail
curl -fsSI -o /dev/null -w 'web=%{http_code} t=%{time_total}\n' https://omnigrouptech.com/ || echo web_fail

LOGIN=`$(curl -fsS -X POST https://api.omnigrouptech.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"$adminEmail","password":"$adminPass"}' 2>/dev/null)
TOKEN=`$(echo "`$LOGIN" | jq -r '.data.accessToken // empty' 2>/dev/null)
if [ -n "`$TOKEN" ]; then
  echo login=ok
  curl -fsS -H "Authorization: Bearer `$TOKEN" https://api.omnigrouptech.com/api/v1/autonomy-loop/outbound/stats | jq '{sentToday: .data.sentToday, failed: .data.byStatus.failed, warmup: .data.warmupComplete}' 2>/dev/null || true
else
  echo login=fail
fi
echo '=== RECOVER DONE ==='
"@

$bash = ($bash -replace "`r", '')
Write-Host '== Recover API on VPS ==' -ForegroundColor Cyan
$session = $null
try {
  $session = Invoke-VpsRemoteBashScript -VpsHost $cfg.vpsHost.Trim() -VpsUser $cfg.vpsUser.Trim() `
    -SshPassword $cfg.sshPassword -ScriptContent $bash -TimeOutSeconds 300 -Session $session
} finally {
  Close-VpsSession -Session $session
}
