#!/usr/bin/env bash
# Keep production web + API warm (avoid cold-start 30–75s for first visitor).
set -euo pipefail

SITE_URL="${KEEP_WARM_SITE_URL:-https://omnigrouptech.com}"
API_URL="${KEEP_WARM_API_URL:-https://api.omnigrouptech.com}"
LOG_TAG="keep-warm-prod"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$LOG_TAG] $*"; }

ping() {
  local url="$1"
  local label="$2"
  local out
  out="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 15 --max-time 60 "$url" || echo '000')"
  log "$label code=$out url=$url"
  if [[ "$out" != "200" ]]; then
    exit 1
  fi
}

ping "${SITE_URL%/}/" "web-home"
ping "${SITE_URL%/}/api/health" "web-health"
ping "${API_URL%/}/health" "api-health"
log "DONE"
