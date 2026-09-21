#!/bin/sh
set -e
# Named volumes mount as root; ensure forge/logs/data paths are writable for user atina (uid 1001).
for d in /var/omni/forge /app/data logs; do
  if [ ! -d "$d" ]; then
    mkdir -p "$d"
  fi
  chown -R atina:atina "$d" 2>/dev/null || true
done
if [ -n "${FORGE_VAULT_PATH:-}" ]; then
  vault_dir=$(dirname "$FORGE_VAULT_PATH")
  if [ ! -d "$vault_dir" ]; then
    mkdir -p "$vault_dir"
    chown -R atina:atina "$vault_dir" 2>/dev/null || true
  fi
fi
exec su-exec atina "$@"
