#!/usr/bin/env bash
# Full monorepo verify on VPS (Linux). Laptop only triggers: scripts/run-vps-verify.ps1
# Log: /var/log/omni-verify-monorepo.log
set -euo pipefail
exec 9>/var/lock/omni-verify.lock
if ! flock -n 9; then
  echo "Another verify is already running; exit." >&2
  exit 0
fi
REPO="${REPO:-/opt/omni-group-ci-verify}"
LOG="${LOG:-/var/log/omni-verify-monorepo.log}"
BRANCH="${BRANCH:-feat/phase10-outreach-send-enabled}"
REPO_URL="${REPO_URL:-https://github.com/Marko200322/omni-group.git}"
NODE_IMAGE="${NODE_IMAGE:-node:20-bookworm}"

: >"$LOG"
exec > >(tee -a "$LOG") 2>&1
echo "=== omni verify VPS $(date -Is) branch=$BRANCH ==="

rm -rf "$REPO"
git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$REPO"
cd "$REPO"

echo "== pytest (root, venv) =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3-venv python3-pip git ca-certificates curl >/dev/null
python3 -m venv .ci-venv
# shellcheck disable=SC1091
. .ci-venv/bin/activate
pip install -q -r requirements.txt pytest
pytest -q
deactivate

echo "== atina test:gate (docker; no coverage threshold — same tests as CI) =="
docker run --rm -v "$REPO/atina-platform/atina:/app" -w /app "$NODE_IMAGE" \
  bash -lc "apt-get update -qq && apt-get install -y -qq python3 make g++ >/dev/null && npm ci && npm run test:gate"

echo "== omnigroup-web build (docker) =="
docker run --rm -v "$REPO/apps/omnigroup-web:/app" -w /app \
  -e NODE_OPTIONS=--max-old-space-size=8192 "$NODE_IMAGE" \
  bash -lc "npm ci && npm run build"

echo "== atina-system verify:n1 (docker) =="
docker run --rm -v "$REPO/atina-system:/app" -w /app "$NODE_IMAGE" \
  bash -lc "npm ci && npm run verify:n1"

echo "== docker compose config =="
export DB_PASSWORD=ci_verify_only DB_USER=atina_user DB_NAME=atina_saas_db
cp -n atina-platform/atina/.env.docker.prod.example atina-platform/atina/.env.docker.prod
cp -n apps/omnigroup-web/.env.production.example apps/omnigroup-web/.env.production
docker compose -f docker-compose.prod.yml config --quiet
cp -n atina-platform/atina/.env.example atina-platform/atina/.env || true
docker compose -f atina-platform/atina/docker-compose.yml config --quiet
docker compose -f docker-compose.yml config --quiet

echo "== prod smoke (HTTP) =="
curl -sf -o /dev/null -w 'web_health=%{http_code}\n' https://omnigrouptech.com/api/health
curl -sf -o /dev/null -w 'api_health=%{http_code}\n' https://api.omnigrouptech.com/health

echo "=== VPS verify FINISHED OK $(date -Is) ==="
