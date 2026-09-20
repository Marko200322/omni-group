#!/usr/bin/env bash
# Full repo verify on VPS — mirrors GitHub ci-monorepo.yml + extra in-repo tests (integration, sistem_naplate, outreach).
# Laptop trigger: scripts/run-vps-verify.ps1
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
PG_NEST_NAME="${PG_NEST_NAME:-omni-verify-pg-nest}"
PG_ATINA_NAME="${PG_ATINA_NAME:-omni-verify-pg-atina}"
PG_NEST_PORT="${PG_NEST_PORT:-55432}"
PG_ATINA_PORT="${PG_ATINA_PORT:-55433}"

declare -A SUMMARY=()

record() {
  SUMMARY["$1"]="$2"
}

cleanup() {
  docker rm -f "$PG_NEST_NAME" "$PG_ATINA_NAME" 2>/dev/null || true
}
trap cleanup EXIT

wait_pg() {
  local name=$1
  local user=$2
  local tries=${3:-40}
  for ((i = 1; i <= tries; i++)); do
    if docker exec "$name" pg_isready -U "$user" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "Postgres $name not ready" >&2
  return 1
}

atina_node() {
  docker run --rm --add-host=host.docker.internal:host-gateway \
    -v "$REPO/atina-platform/atina:/app" -w /app "$NODE_IMAGE" \
    bash -lc "$1"
}

: >"$LOG"
exec > >(tee -a "$LOG") 2>&1
echo "=== omni FULL repo verify VPS $(date -Is) branch=$BRANCH ==="

rm -rf "$REPO"
git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$REPO"
cd "$REPO"

echo "== Doslednost dok (audit-doc-gate-references.ps1 — same as CI job python) =="
docker run --rm -v "$REPO:/repo" -w /repo mcr.microsoft.com/powershell:lts-alpine-3.17 \
  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/audit-doc-gate-references.ps1
record doc_gate PASS

echo "== pytest (repo root) =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3-venv python3-pip git ca-certificates curl >/dev/null
python3 -m venv .ci-venv
# shellcheck disable=SC1091
. .ci-venv/bin/activate
pip install -q -r requirements.txt pytest
root_py=$(python -m pytest -q 2>&1 | tee /dev/stderr | tail -n 1)
record pytest_root "$root_py"

echo "== pytest (sistem_naplate) =="
pip install -q -r sistem_naplate/requirements.txt
naplata_py=$(cd sistem_naplate && python -m pytest -q 2>&1 | tee /dev/stderr | tail -n 1)
record pytest_sistem_naplate "$naplata_py"
deactivate

echo "== Postgres for Nest verify:ci + Atina integration =="
docker rm -f "$PG_NEST_NAME" "$PG_ATINA_NAME" 2>/dev/null || true
docker run -d --name "$PG_NEST_NAME" \
  -e POSTGRES_USER=atina -e POSTGRES_PASSWORD=atina -e POSTGRES_DB=atina \
  -p "${PG_NEST_PORT}:5432" postgres:15-alpine >/dev/null
docker run -d --name "$PG_ATINA_NAME" \
  -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db \
  -p "${PG_ATINA_PORT}:5432" postgres:16-alpine >/dev/null
wait_pg "$PG_NEST_NAME" atina
wait_pg "$PG_ATINA_NAME" atina_user
record postgres_sidecars OK

echo "== Atina SaaS — CI mirror (build + lint + ci-unit-tests.sh) =="
atina_node "apt-get update -qq && apt-get install -y -qq python3 make g++ >/dev/null && npm ci && npm run build && npx eslint src --ext .ts && bash scripts/ci-unit-tests.sh"
atina_unit=$(grep -E '^(Test Suites:|All [0-9]+ tests passed|Jest:)' "$LOG" | tail -n 3 | tr '\n' ' ')
record atina_unit_ci "${atina_unit:-PASS}"

echo "== Atina SaaS — integration (migrate + jest integration) =="
atina_node "apt-get update -qq && apt-get install -y -qq python3 make g++ >/dev/null && npm ci && \
  export DB_HOST=host.docker.internal DB_PORT=${PG_ATINA_PORT} DB_USER=atina_user DB_PASSWORD=atina_password DB_NAME=atina_saas_db && \
  npm run migrate && npm run test:integration"
int_line=$(grep 'Test Suites:' "$LOG" | tail -n 1)
record atina_integration "${int_line:-PASS}"

echo "== omnigroup-web (npm ci + build + test:atina) =="
docker run --rm -v "$REPO/apps/omnigroup-web:/app" -w /app \
  -e NODE_OPTIONS=--max-old-space-size=8192 "$NODE_IMAGE" \
  bash -lc "npm ci && npm run build && npm run test:atina"
record omnigroup_web PASS

echo "== atina-system verify:ci (unit + migrations + e2e — same as CI) =="
docker run --rm --add-host=host.docker.internal:host-gateway \
  -v "$REPO/atina-system:/app" -w /app "$NODE_IMAGE" \
  bash -lc "npm ci && export POSTGRES_HOST=host.docker.internal POSTGRES_PORT=${PG_NEST_PORT} POSTGRES_USER=atina POSTGRES_PASSWORD=atina POSTGRES_DB=atina NODE_ENV=test JWT_SECRET=ci-jwt-secret-at-least-32-characters-long E2E_WITH_DB=1 && npm run verify:ci"
nest_lines=$(grep 'Test Suites:' "$LOG" | tail -n 2 | tr '\n' ' ')
record atina_system_verify_ci "${nest_lines:-PASS}"

echo "== tools/outreach-engine (test:guardrails) =="
docker run --rm -v "$REPO/tools/outreach-engine:/app" -w /app "$NODE_IMAGE" \
  bash -lc "npm ci && npm run test:guardrails"
record outreach_guardrails PASS

echo "== docker compose config (CI job compose ×3 + prod stack) =="
export DB_PASSWORD=ci_verify_only DB_USER=atina_user DB_NAME=atina_saas_db
cp -n atina-platform/atina/.env.docker.prod.example atina-platform/atina/.env.docker.prod
cp -n apps/omnigroup-web/.env.production.example apps/omnigroup-web/.env.production
docker compose -f docker-compose.atina.yml -f docker-compose.nest-port-3001.yml config --quiet
docker compose -f docker-compose.yml config --quiet
cp -n atina-platform/atina/.env.example atina-platform/atina/.env || true
docker compose -f atina-platform/atina/docker-compose.yml config --quiet
docker compose -f docker-compose.prod.yml config --quiet
record compose_config PASS

echo "== prod smoke (live deploy; not unit tests) =="
curl -sf -o /dev/null -w 'web_health=%{http_code}\n' https://omnigrouptech.com/api/health
curl -sf -o /dev/null -w 'api_health=%{http_code}\n' https://api.omnigrouptech.com/health
record prod_smoke "web+api 200"

echo ""
echo "=== REPO TEST SUMMARY $(date -Is) ==="
for key in doc_gate pytest_root pytest_sistem_naplate postgres_sidecars atina_unit_ci atina_integration omnigroup_web atina_system_verify_ci outreach_guardrails compose_config prod_smoke; do
  echo "  ${key}: ${SUMMARY[$key]:-?}"
done
echo ""
echo "NOT in this script (live API / running stacks / Windows-only):"
echo "  - atina test:hunt-pipeline (OpenRouter/Gemini live)"
echo "  - atina npm run smoke:all, smoke:* and scripts/smoke-stack.ps1"
echo "  - apps/omnigroup-web npm run test:contact (Resend live)"
echo ""
echo "=== VPS FULL repo verify FINISHED OK $(date -Is) ==="
