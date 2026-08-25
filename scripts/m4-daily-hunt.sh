#!/usr/bin/env bash
# M4 daily hunt (REDOM 6b) — login → readiness → pipeline/run → optional outbound.
#
# OUTBOUND GATE (default M4_OUTBOUND_SEND=0):
#   - Hunt + draft creation only; processOutbound=false blocks process-send.
#   - Enable M4_OUTBOUND_SEND=1 only after ≥1 week of draft-only runs with 0 failed sends
#     (check /api/v1/autonomy-loop/outbound/stats: byStatus.failed=0, review sentToday/draft counts).
#   - Even when send flag=1, send is blocked unless warmupComplete=true and remainingToday>0.
#
# Draft-only path: pipeline/run always runs nurture-loop (hunt → lead enrich → outbound drafts).
# No POST to process-send unless PROCESS_OUTBOUND=true above.
set -euo pipefail

ENV_FILE="${M4_CRON_ENV:-/opt/omni-group/deploy-secrets.local/m4-daily-hunt.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

API_BASE="${API_BASE:-https://api.omnigrouptech.com}"
API_BASE="${API_BASE%/}"
ADMIN_EMAIL="${ADMIN_EMAIL:?ADMIN_EMAIL required}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD required}"
VERTICAL_SLUG="${VERTICAL_SLUG:-marketing}"
INTENSITY="${INTENSITY:-40}"
TEMPLATE_KEY="${TEMPLATE_KEY:-nurture-loop}"
M4_OUTBOUND_SEND="${M4_OUTBOUND_SEND:-0}"
LOG_TAG="m4-daily-hunt"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$LOG_TAG] $*"; }

need_bin() {
  command -v "$1" >/dev/null 2>&1 || { log "FAIL: missing binary $1"; exit 1; }
}
need_bin curl
need_bin jq

log "start api=$API_BASE vertical=$VERTICAL_SLUG intensity=$INTENSITY send_flag=$M4_OUTBOUND_SEND"

LOGIN_JSON=$(curl -fsS -X POST "$API_BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email:$e,password:$p}')")
TOKEN=$(echo "$LOGIN_JSON" | jq -r '.data.accessToken // empty')
if [[ -z "$TOKEN" ]]; then
  log "FAIL: login — no accessToken"
  exit 1
fi
AUTH=( -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' )

READY=$(curl -fsS "${AUTH[@]}" "$API_BASE/api/v1/client-hunter/readiness")
SCORE=$(echo "$READY" | jq -r '.data.score // 0')
READY_OK=$(echo "$READY" | jq -r '.data.ready // false')
log "readiness score=$SCORE ready=$READY_OK"

STATS=$(curl -fsS "${AUTH[@]}" "$API_BASE/api/v1/autonomy-loop/outbound/stats" || echo '{}')
WARMUP=$(echo "$STATS" | jq -r '.data.warmupComplete // false')
SENT_TODAY=$(echo "$STATS" | jq -r '.data.sentToday // 0')
REMAINING=$(echo "$STATS" | jq -r '.data.remainingToday // 0')
log "outbound warmup=$WARMUP sentToday=$SENT_TODAY remainingToday=$REMAINING"

PROCESS_OUTBOUND=false
if [[ "$M4_OUTBOUND_SEND" == "1" || "$M4_OUTBOUND_SEND" == "true" ]]; then
  if [[ "$WARMUP" == "true" && "$REMAINING" -gt 0 ]]; then
    PROCESS_OUTBOUND=true
  else
    log "WARN: outbound send requested but blocked (warmup=$WARMUP remaining=$REMAINING) — hunt only"
  fi
fi

BODY=$(jq -nc \
  --arg v "$VERTICAL_SLUG" \
  --argjson i "$INTENSITY" \
  --arg t "$TEMPLATE_KEY" \
  '{verticalSlug:$v,intensity:$i,templateKey:$t,processOutbound:false,force:false}')

log "pipeline/run processOutbound=false (send gated separately)"
PIPE=$(curl -fsS -X POST "$API_BASE/api/v1/client-hunter/pipeline/run" "${AUTH[@]}" -d "$BODY")
TPL=$(echo "$PIPE" | jq -r '.data.templateKey // .data.template // empty')
log "pipeline done templateKey=${TPL:-unknown}"

if [[ "$PROCESS_OUTBOUND" == "true" ]]; then
  log "process-send (admin) — only when M4_OUTBOUND_SEND gated OK"
  SEND=$(curl -fsS -X POST "$API_BASE/api/v1/autonomy-loop/outbound/process-send" "${AUTH[@]}" -d '{}')
  log "process-send ok bytes=${#SEND}"
fi

log "DONE"
