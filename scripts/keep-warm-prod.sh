#!/usr/bin/env bash
# Keep production web + API warm (avoid cold-start 30–75s for first visitor).
set -euo pipefail

SITE_URL="${KEEP_WARM_SITE_URL:-https://omnigrouptech.com}"
API_URL="${KEEP_WARM_API_URL:-https://api.omnigrouptech.com}"
STATE_FILE="${KEEP_WARM_STATE_FILE:-/tmp/omni-keep-warm.failed}"
ALERT_WEBHOOK_URL="${KEEP_WARM_ALERT_WEBHOOK_URL:-}"
LOG_TAG="keep-warm-prod"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$LOG_TAG] $*"; }

if [[ -z "$ALERT_WEBHOOK_URL" && -r /opt/omni-group/atina-platform/atina/.env.docker.prod ]]; then
  ALERT_WEBHOOK_URL="$(awk -F= '/^SLACK_WEBHOOK_URL=/{sub(/^[^=]*=/, ""); print; exit}' \
    /opt/omni-group/atina-platform/atina/.env.docker.prod | tr -d '\r')"
fi

notify() {
  local message="$1"
  [[ -z "$ALERT_WEBHOOK_URL" ]] && return 0
  local escaped="${message//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  curl -fsS --connect-timeout 10 --max-time 20 \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"$escaped\"}" "$ALERT_WEBHOOK_URL" >/dev/null || true
}

ping() {
  local url="$1"
  local label="$2"
  local out
  out="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 15 --max-time 60 "$url" || echo '000')"
  log "$label code=$out url=$url"
  if [[ "$out" != "200" ]]; then
    FAILURES+=("$label:$out")
  fi
}

FAILURES=()
ping "${SITE_URL%/}/" "web-home"
ping "${SITE_URL%/}/api/health" "web-health"
ping "${SITE_URL%/}/api/health/live" "web-live"
ping "${SITE_URL%/}/status" "web-status"
ping "${API_URL%/}/health" "api-health"

if (( ${#FAILURES[@]} > 0 )); then
  if [[ ! -f "$STATE_FILE" ]]; then
    notify "Omni production health failed: ${FAILURES[*]} (host $(hostname))"
    printf '%s\n' "${FAILURES[*]}" > "$STATE_FILE"
  fi
  log "FAILED ${FAILURES[*]}"
  exit 1
fi

if [[ -f "$STATE_FILE" ]]; then
  rm -f "$STATE_FILE"
  notify "Omni production health recovered (host $(hostname))"
fi
log "DONE"
