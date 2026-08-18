#!/usr/bin/env bash
# Daily Postgres dump on the VPS. Cron should call this with `bash` so a tar
# sync that strips the execute bit cannot skip backups.
set -euo pipefail

ROOT="${ROOT:-/opt/omni-group}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups/postgres}"
PG_CONT="${PG_CONT:-omni-group-postgres-1}"
DB_USER="${DB_USER:-atina_user}"
DB_NAME="${DB_NAME:-atina_saas_db}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/atina-${DB_NAME}-${TS}.dump"

docker exec "$PG_CONT" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f /tmp/atina-backup.dump
docker cp "$PG_CONT:/tmp/atina-backup.dump" "$OUT"
docker exec "$PG_CONT" rm -f /tmp/atina-backup.dump
sha256sum "$OUT" > "${OUT}.sha256"
find "$BACKUP_DIR" -name 'atina-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'atina-*.dump.sha256' -mtime +"$KEEP_DAYS" -delete
ls -lh "$OUT"
echo "BACKUP_OK $OUT"
