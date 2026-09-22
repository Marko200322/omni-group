#!/usr/bin/env bash
# Full finish: test:ci+coverage, hunt-pipeline (prod .env), smoke-stack on alt Nest ports.
set -euo pipefail
LOG="${LOG:-/var/log/omni-finish-repo-test.log}"
REPO="${REPO:-/opt/omni-group-ci-verify}"
BRANCH="${BRANCH:-feat/phase10-outreach-send-enabled}"
NODE_IMAGE="${NODE_IMAGE:-node:20-bookworm}"
PROD_ENV="${PROD_ENV:-/opt/omni-group/atina-platform/atina/.env}"

: >"$LOG"
exec > >(tee -a "$LOG") 2>&1
echo "=== FINISH REPO TEST $(date -Is) ==="
cd "$REPO"
if [[ "${SKIP_GIT_SYNC:-}" != "1" ]]; then
  git fetch origin "$BRANCH"
  git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH" "origin/$BRANCH"
  if ! git pull --ff-only origin "$BRANCH"; then
    echo "git pull blocked (local edits on CI clone); reset to origin/$BRANCH"
    git reset --hard "origin/$BRANCH"
  fi
else
  echo "SKIP_GIT_SYNC=1 (caller synced repo + overlay scripts)"
fi

echo "== test:ci + coverage =="
set +e
docker run --rm -v "$REPO/atina-platform/atina:/app" -w /app -e CI=true -e NODE_OPTIONS=--max-old-space-size=8192 "$NODE_IMAGE" \
  bash -lc "apt-get update -qq && apt-get install -y -qq python3 make g++ >/dev/null && npm ci && npm run test:ci"
CI_EXIT=$?
set -e
echo "test:ci exit=$CI_EXIT"

echo "== hunt-pipeline =="
if [[ -f "$PROD_ENV" ]]; then
  docker run --rm -v "$REPO/atina-platform/atina:/app" -w /app --env-file "$PROD_ENV" "$NODE_IMAGE" \
    bash -lc "apt-get update -qq && apt-get install -y -qq python3 python3-venv >/dev/null && python3 -m venv /tmp/hunt-venv && /tmp/hunt-venv/bin/pip install -q requests && /tmp/hunt-venv/bin/python test_pipeline.py" \
    && echo "hunt-pipeline: PASS" || echo "hunt-pipeline: FAIL"
else
  echo "hunt-pipeline: SKIP no $PROD_ENV"
fi

echo "== Astra (root compose, skip if :8080 already up) =="
ASTRA_OK=0
set +e
if curl -sf http://127.0.0.1:8080/api/status >/dev/null 2>&1; then
  echo "Astra already listening on :8080"
  ASTRA_OK=0
else
  docker compose -f docker-compose.yml -p omni-ci-astra up -d --build
  ASTRA_OK=$?
  sleep 15
  curl -sf http://127.0.0.1:8080/api/status >/dev/null 2>&1 || ASTRA_OK=1
fi

echo "== Nest (standalone verify compose, API :13001) =="
docker compose -f docker-compose.nest-vps-verify.yml -p omni-ci-nest down 2>/dev/null || true
docker compose -f docker-compose.nest-vps-verify.yml -p omni-ci-nest up -d --build
NEST_UP=$?
NEST_HTTP=1
for _ in $(seq 1 24); do
  if curl -sf http://127.0.0.1:13001/ >/dev/null 2>&1; then
    NEST_HTTP=0
    break
  fi
  sleep 5
done
echo "nest compose exit=$NEST_UP nest_http=$NEST_HTTP"

SMOKE_EXIT=1
if command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-stack.ps1 \
    -AstraBase "http://127.0.0.1:8080" -NestBase "http://127.0.0.1:13001" \
    -AtinaNodeBase "https://api.omnigrouptech.com" '-SkipNode:$false'
  SMOKE_EXIT=$?
else
  curl -sf http://127.0.0.1:8080/api/status >/dev/null 2>&1 && curl -sf http://127.0.0.1:13001/ >/dev/null 2>&1
  SMOKE_EXIT=$?
fi
set -e
[[ "$SMOKE_EXIT" -eq 0 ]] && echo "smoke-stack: PASS" || echo "smoke-stack: FAIL (exit=$SMOKE_EXIT)"

echo "=== FINISH REPO TEST DONE $(date -Is) test:ci_exit=$CI_EXIT astra_ok=$ASTRA_OK nest_up=$NEST_UP nest_http=$NEST_HTTP smoke_exit=$SMOKE_EXIT ==="
exit $CI_EXIT
