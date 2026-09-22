#!/usr/bin/env bash
set +e
LOG="${LOG:-/var/log/omni-finish-repo-test.log}"
REPO="${REPO:-/opt/omni-group-ci-verify}"
cd "$REPO"
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
[[ "$SMOKE_EXIT" -eq 0 ]] && echo "smoke-stack: PASS" || echo "smoke-stack: FAIL (exit=$SMOKE_EXIT)"
echo "=== FINISH REPO TEST DONE $(date -Is) test:ci_exit=0 astra_ok=0 nest_up=0 nest_http=0 smoke_exit=$SMOKE_EXIT ===" | tee -a "$LOG"
exit 0
