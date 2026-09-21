#!/usr/bin/env bash
# Complete system verify on VPS: full repo tests + isolated docker-prod stack + HTTP smokes.
# Log: /var/log/omni-verify-system.log
set -euo pipefail
exec 8>/var/lock/omni-verify-system.lock
if ! flock -n 8; then
  echo "Another system verify is running." >&2
  exit 0
fi

LOG="${LOG:-/var/log/omni-verify-system.log}"
BRANCH="${BRANCH:-feat/phase10-outreach-send-enabled}"
REPO="${REPO:-/opt/omni-group-ci-verify}"
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONO_SCRIPT="${MONO_SCRIPT:-$SELF_DIR/verify-monorepo-vps.sh}"

: >"$LOG"
exec > >(tee -a "$LOG") 2>&1
echo "=== SYSTEM VERIFY START $(date -Is) branch=$BRANCH ==="

echo "== Phase 1/3: repo tests (verify-monorepo-vps.sh) =="
export LOG=/var/log/omni-verify-monorepo-phase1.log
export BRANCH REPO
bash "$MONO_SCRIPT"
echo "Phase 1 log: /var/log/omni-verify-monorepo-phase1.log"

echo "== Phase 2/3: isolated docker-prod stack (smoke:all + web integration) =="
if ! command -v pwsh >/dev/null 2>&1; then
  echo "Installing PowerShell (pwsh) for smoke scripts..."
  apt-get update -qq
  apt-get install -y -qq wget apt-transport-https software-properties-common gnupg
  wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb
  dpkg -i /tmp/packages-microsoft-prod.deb
  apt-get update -qq
  apt-get install -y -qq powershell
fi

cd "$REPO"
if [[ ! -f .env.docker.prod ]]; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-docker-prod.ps1
fi

# Non-conflicting ports vs live prod (Caddy on 443)
export ATINA_PORT=13002
export WEB_PORT=13012
grep -q '^ATINA_PORT=' .env.docker.prod && sed -i "s/^ATINA_PORT=.*/ATINA_PORT=${ATINA_PORT}/" .env.docker.prod || echo "ATINA_PORT=${ATINA_PORT}" >>.env.docker.prod
grep -q '^WEB_PORT=' .env.docker.prod && sed -i "s/^WEB_PORT=.*/WEB_PORT=${WEB_PORT}/" .env.docker.prod || echo "WEB_PORT=${WEB_PORT}" >>.env.docker.prod

docker compose -f docker-compose.prod.yml -p omni-prod-ci --env-file .env.docker.prod down -v 2>/dev/null || true
docker compose -f docker-compose.prod.yml -p omni-prod --env-file .env.docker.prod down -v 2>/dev/null || true

# Use dedicated project name so we never collide with live omni-group stack
export COMPOSE_PROJECT_NAME=omni-prod-ci
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/docker-prod-test.ps1 -ResetVolumes -KeepRunning
echo "Phase 2: docker-prod-test PASS"

echo "== Phase 3/3: live production HTTP smoke (read-only) =="
WEB_BASE="${PROD_WEB_BASE:-https://omnigrouptech.com}"
API_BASE="${PROD_API_BASE:-https://api.omnigrouptech.com}"
check() {
  local label=$1
  local url=$2
  local code
  code=$(curl -sf -o /dev/null -w '%{http_code}' --max-time 30 "$url" || echo "000")
  if [[ "$code" =~ ^(200|301|302|307|308)$ ]]; then
    echo "  PASS $label HTTP $code"
  else
    echo "  FAIL $label HTTP $code ($url)" >&2
    return 1
  fi
}
check "prod web health" "$WEB_BASE/api/health"
check "prod api health" "$API_BASE/health"
check "prod web home" "$WEB_BASE/"
check "prod web pricing" "$WEB_BASE/pricing"
check "prod web login" "$WEB_BASE/login"
check "prod web robots" "$WEB_BASE/robots.txt" || true

echo "=== SYSTEM VERIFY FINISHED OK $(date -Is) ==="
