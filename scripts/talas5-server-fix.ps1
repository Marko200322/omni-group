#Requires -Version 5.1
# Talas 5 — server P0 fixes (Agent 1)
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'vps-remote.ps1')

$configPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
$cfg = Get-Content $configPath -Raw | ConvertFrom-Json
$remote = if ($cfg.remotePath) { $cfg.remotePath.Trim() } else { '/opt/omni-group' }
$adminEmail = [string]$cfg.adminEmail
$adminPass = [string]$cfg.adminPassword

$bash = @"
set -e
cd '$remote'

echo '=== T5.0 repair bad env lines ==='
for f in .env.docker.prod atina-platform/atina/.env.docker.prod; do
  [ -f "`$f" ] || continue
  sed -i '/^`$k=`$v/d' "`$f" || true
  grep -v '^`$k=`$v' "`$f" > "`$f.bak" && mv "`$f.bak" "`$f" || true
done

echo '=== T5.1 chmod m4-daily-hunt.sh ==='
sed -i 's/\r`$//' scripts/m4-daily-hunt.sh 2>/dev/null || true
chmod 700 scripts/m4-daily-hunt.sh
ls -la scripts/m4-daily-hunt.sh

echo '=== T5.2 M4_OUTBOUND_SEND=0 ==='
ENVF=deploy-secrets.local/m4-daily-hunt.env
mkdir -p deploy-secrets.local
if [ ! -f "`$ENVF" ]; then
  printf '%s\n' \
    'API_BASE=https://api.omnigrouptech.com' \
    'ADMIN_EMAIL=$adminEmail' \
    'ADMIN_PASSWORD=$adminPass' \
    'VERTICAL_SLUG=marketing' \
    'INTENSITY=40' \
    'M4_OUTBOUND_SEND=0' > "`$ENVF"
elif grep -q '^M4_OUTBOUND_SEND=' "`$ENVF"; then
  sed -i 's/^M4_OUTBOUND_SEND=.*/M4_OUTBOUND_SEND=0/' "`$ENVF"
else
  echo 'M4_OUTBOUND_SEND=0' >> "`$ENVF"
fi
chmod 600 "`$ENVF"
grep M4_OUTBOUND_SEND "`$ENVF"

echo '=== T5.3 autonomy OFF for M4 ==='
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
grep -E '^AUTONOMY_(ENABLED|AUTO_START_SCHEDULER|MARKETING_ENABLED)=' .env.docker.prod


echo '=== T5.3b ensure SITE/API domains ==='
for f in .env.docker.prod; do
  [ -f "`$f" ] || continue
  if ! grep -q '^SITE_DOMAIN=' "`$f"; then echo 'SITE_DOMAIN=omnigrouptech.com' >> "`$f"; else sed -i 's/^SITE_DOMAIN=.*/SITE_DOMAIN=omnigrouptech.com/' "`$f"; fi
  if ! grep -q '^API_DOMAIN=' "`$f"; then echo 'API_DOMAIN=api.omnigrouptech.com' >> "`$f"; else sed -i 's/^API_DOMAIN=.*/API_DOMAIN=api.omnigrouptech.com/' "`$f"; fi
done
grep -E '^(SITE_DOMAIN|API_DOMAIN)=' .env.docker.prod

echo '=== T5.4 restart atina-api + caddy ==='
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod config >/dev/null
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d --force-recreate atina-api
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile tls up -d --force-recreate caddy
sleep 10
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod ps

set +e
echo '=== T5.5 TLS smoke ==='
curl -fsSI -o /dev/null -w 'apex=%{http_code} t=%{time_total}\n' https://omnigrouptech.com/ || echo apex_fail
curl -fsSI -o /dev/null -w 'www=%{http_code} t=%{time_total}\n' https://www.omnigrouptech.com/ || echo www_fail
curl -fsS -o /dev/null -w 'api=%{http_code} t=%{time_total}\n' https://api.omnigrouptech.com/health || echo api_fail

echo '=== T5.6 cron ==='
crontab -l 2>/dev/null | grep m4-daily-hunt || echo 'no cron'

set -e
echo '=== T5.7 outbound diagnostics ==='
LOGIN=`$(curl -fsS -X POST https://api.omnigrouptech.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"$adminEmail","password":"$adminPass"}')
TOKEN=`$(echo "`$LOGIN" | jq -r '.data.accessToken // empty')
if [ -n "`$TOKEN" ]; then
  curl -fsS -H "Authorization: Bearer `$TOKEN" https://api.omnigrouptech.com/api/v1/autonomy-loop/outbound/stats | jq .
else
  echo 'login failed'
fi

echo '=== T5.8 hunt run (send=0) ==='
M4_CRON_ENV=`$ENVF '$remote'/scripts/m4-daily-hunt.sh

echo '=== T5 DONE ==='
"@

$bash = ($bash -replace "`r", '')

Write-Host '== Talas 5: server P0 fixes ==' -ForegroundColor Cyan
$session = $null
try {
  $session = Invoke-VpsRemoteBashScript -VpsHost $cfg.vpsHost.Trim() -VpsUser $cfg.vpsUser.Trim() `
    -SshPassword $cfg.sshPassword -ScriptContent $bash -TimeOutSeconds 600 -Session $session
  Write-Host 'Talas 5 completed.' -ForegroundColor Green
} finally {
  Close-VpsSession -Session $session
}
