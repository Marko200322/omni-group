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
git fetch origin "$BRANCH" && git checkout "$BRANCH" && git pull --ff-only origin "$BRANCH"

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
    bash -lc "apt-get update -qq && apt-get install -y -qq python3 python3-pip >/dev/null && pip install -q requests && python3 test_pipeline.py" \
    && echo "hunt-pipeline: PASS" || echo "hunt-pipeline: FAIL"
else
  echo "hunt-pipeline: SKIP no $PROD_ENV"
fi

echo "== Astra (root compose) =="
docker compose -f docker-compose.yml -p omni-ci-astra up -d --build
sleep 15

echo "== Nest (alt ports 13001 / 6381 / 55433) =="
docker compose -f docker-compose.atina.yml -f docker-compose.nest-port-3001.yml -f docker-compose.nest-ci-vps.yml \
  -p omni-ci-nest up -d --build
sleep 25

if command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-stack.ps1 \
    -AstraBase "http://127.0.0.1:8080" -NestBase "http://127.0.0.1:13001" \
    -AtinaNodeBase "https://api.omnigrouptech.com" -SkipNode:$false \
    && echo "smoke-stack: PASS" || echo "smoke-stack: FAIL"
else
  curl -sf http://127.0.0.1:8080/api/status >/dev/null && curl -sf http://127.0.0.1:13001/ >/dev/null \
    && echo "smoke-stack HTTP: PASS" || echo "smoke-stack HTTP: FAIL"
fi

echo "=== FINISH REPO TEST DONE $(date -Is) test:ci_exit=$CI_EXIT ==="
exit $CI_EXIT
