#!/usr/bin/env bash
# Extended tests: test:ci+coverage, hunt-pipeline, optional Nest/Astra compose smokes.
set -euo pipefail
LOG="${LOG:-/var/log/omni-extended-tests.log}"
REPO="${REPO:-/opt/omni-group-ci-verify}"
BRANCH="${BRANCH:-feat/phase10-outreach-send-enabled}"
NODE_IMAGE="${NODE_IMAGE:-node:20-bookworm}"

: >"$LOG"
exec > >(tee -a "$LOG") 2>&1
echo "=== EXTENDED TESTS $(date -Is) ==="

cd "$REPO"
git fetch origin "$BRANCH" 2>/dev/null || true
git checkout "$BRANCH" 2>/dev/null || git clone --branch "$BRANCH" --depth 1 https://github.com/Marko200322/omni-group.git "$REPO"
cd "$REPO"
git pull --ff-only origin "$BRANCH" || true

echo "== Atina test:ci (with coverage thresholds) =="
docker run --rm -v "$REPO/atina-platform/atina:/app" -w /app -e CI=true -e NODE_OPTIONS=--max-old-space-size=8192 "$NODE_IMAGE" \
  bash -lc "apt-get update -qq && apt-get install -y -qq python3 make g++ >/dev/null && npm ci && npm run test:ci" \
  || echo "EXTENDED: test:ci finished with non-zero (coverage or tests)"

echo "== test:hunt-pipeline (live LLM if keys in .env) =="
if [[ -f atina-platform/atina/.env ]]; then
  docker run --rm -v "$REPO/atina-platform/atina:/app" -w /app --env-file atina-platform/atina/.env "$NODE_IMAGE" \
    bash -lc "apt-get update -qq && apt-get install -y -qq python3 python3-pip >/dev/null && pip install -q requests && python3 test_pipeline.py" \
    && echo "hunt-pipeline: PASS" || echo "hunt-pipeline: FAIL or skip (no keys)"
else
  echo "hunt-pipeline: SKIP (no atina-platform/atina/.env with AI keys on VPS)"
fi

echo "== Nest + Astra stack (docker) + smoke-stack =="
cd "$REPO"
set +e
if curl -sf http://127.0.0.1:8080/api/status >/dev/null 2>&1; then
  echo "Astra already on :8080"
else
  docker compose -f docker-compose.yml -p omni-ci-astra up -d --build 2>&1 | tail -n 5
fi
docker compose -f docker-compose.nest-vps-verify.yml -p omni-ci-nest down 2>/dev/null || true
docker compose -f docker-compose.nest-vps-verify.yml -p omni-ci-nest up -d --build 2>&1 | tail -n 8
NEST_HTTP=1
for _ in $(seq 1 24); do
  curl -sf http://127.0.0.1:13001/ >/dev/null 2>&1 && NEST_HTTP=0 && break
  sleep 5
done
if command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-stack.ps1 \
    '-SkipNode:$false' -AtinaNodeBase "https://api.omnigrouptech.com" \
    -AstraBase "http://127.0.0.1:8080" -NestBase "http://127.0.0.1:13001" \
    && echo "smoke-stack: PASS" || echo "smoke-stack: FAIL"
else
  curl -sf http://127.0.0.1:8080/api/status && curl -sf http://127.0.0.1:13001/ && echo "stack HTTP OK" || echo "stack HTTP FAIL"
fi
set -e

echo "=== EXTENDED TESTS DONE $(date -Is) ==="
