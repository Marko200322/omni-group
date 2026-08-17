#!/usr/bin/env bash
# PostgreSQL backup for atina_saas_db — version-controlled copy of VPS cron script.
# Install on VPS: copy to /opt/omni-group/scripts/ and cron 15 3 * * * root bash ...
set -euo pipefail

BACKUP_DIR="${PG_BACKUP_DIR:-/var/backups/atina-pg}"
RETENTION_DAYS="${PG_BACKUP_RETENTION_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/omni-group/docker-compose.prod.yml}"
DB_NAME="${DB_NAME:-atina_saas_db}"
DB_USER="${DB_USER:-atina_user}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/atina_${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip -9 > "$OUT"
find "$BACKUP_DIR" -name 'atina_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "[pg-backup] wrote $OUT"
