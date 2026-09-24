#!/usr/bin/env bash
# Daily production-data backup on the VPS. Cron should call this with `bash`
# so a tar sync that strips the execute bit cannot skip backups.
set -euo pipefail

ROOT="${ROOT:-/opt/omni-group}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups/postgres}"
PG_CONT="${PG_CONT:-omni-group-postgres-1}"
REDIS_CONT="${REDIS_CONT:-omni-group-redis-1}"
ATINA_CONT="${ATINA_CONT:-omni-group-atina-api-1}"
WEB_CONT="${WEB_CONT:-omni-group-web-1}"
DB_USER="${DB_USER:-atina_user}"
DB_NAME="${DB_NAME:-atina_saas_db}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/atina-${DB_NAME}-${TS}.dump"
VAULT_OUT="$BACKUP_DIR/forge-vault-${TS}.db"
REDIS_OUT="$BACKUP_DIR/redis-${TS}.rdb"
UPLOAD_OUT="$BACKUP_DIR/uploads-${TS}.tar.gz"

docker exec "$PG_CONT" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f /tmp/atina-backup.dump
docker cp "$PG_CONT:/tmp/atina-backup.dump" "$OUT"
docker exec "$PG_CONT" rm -f /tmp/atina-backup.dump

# SQLite online backup avoids copying the Forge vault while a write is active.
docker exec "$ATINA_CONT" node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/var/omni/forge/vault.db');
db.backup('/tmp/forge-vault-backup.db', (error) => {
  db.close();
  if (error) { console.error(error); process.exitCode = 1; }
});
"
docker cp "$ATINA_CONT:/tmp/forge-vault-backup.db" "$VAULT_OUT"
docker exec "$ATINA_CONT" rm -f /tmp/forge-vault-backup.db

# redis-cli --rdb streams a consistent snapshot without stopping Redis.
docker exec "$REDIS_CONT" redis-cli --rdb /tmp/redis-backup.rdb >/dev/null
docker cp "$REDIS_CONT:/tmp/redis-backup.rdb" "$REDIS_OUT"
docker exec "$REDIS_CONT" rm -f /tmp/redis-backup.rdb

# Uploads are ordinary files; archive the mounted volume read-only.
docker run --rm --volumes-from "$WEB_CONT" -v "$BACKUP_DIR:/backup" alpine:3.20 \
  tar -czf "/backup/$(basename "$UPLOAD_OUT")" -C /var/omni/uploads .

for artifact in "$OUT" "$VAULT_OUT" "$REDIS_OUT" "$UPLOAD_OUT"; do
  test -s "$artifact"
  sha256sum "$artifact" > "${artifact}.sha256"
done

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" \
  \( -name 'atina-*.dump' -o -name 'atina-*.dump.sha256' \
     -o -name 'forge-vault-*.db' -o -name 'forge-vault-*.db.sha256' \
     -o -name 'redis-*.rdb' -o -name 'redis-*.rdb.sha256' \
     -o -name 'uploads-*.tar.gz' -o -name 'uploads-*.tar.gz.sha256' \) -delete

ls -lh "$OUT" "$VAULT_OUT" "$REDIS_OUT" "$UPLOAD_OUT"
echo "BACKUP_OK postgres=$OUT forge=$VAULT_OUT redis=$REDIS_OUT uploads=$UPLOAD_OUT"
