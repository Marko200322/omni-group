#!/usr/bin/env bash
# Non-destructive weekly restore drill for the latest production backup set.
set -euo pipefail

ROOT="${ROOT:-/opt/omni-group}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups/postgres}"
PG_CONT="${PG_CONT:-omni-group-postgres-1}"
REDIS_CONT="${REDIS_CONT:-omni-group-redis-1}"
ATINA_CONT="${ATINA_CONT:-omni-group-atina-api-1}"
DB_USER="${DB_USER:-atina_user}"

PG_DUMP="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'atina-*.dump' -printf '%T@ %p\n' |
  sort -nr | awk 'NR==1 {$1=""; sub(/^ /, ""); print}')"
if [[ -z "$PG_DUMP" || ! -s "$PG_DUMP" ]]; then
  echo "RESTORE_DRILL_FAIL no Postgres dump in $BACKUP_DIR" >&2
  exit 1
fi

TS="$(basename "$PG_DUMP" | sed -E 's/^atina-.*-([0-9]{8}-[0-9]{6})\.dump$/\1/')"
if [[ ! "$TS" =~ ^[0-9]{8}-[0-9]{6}$ ]]; then
  echo "RESTORE_DRILL_FAIL cannot derive backup timestamp from $PG_DUMP" >&2
  exit 1
fi

VAULT="$BACKUP_DIR/forge-vault-$TS.db"
REDIS="$BACKUP_DIR/redis-$TS.rdb"
UPLOADS="$BACKUP_DIR/uploads-$TS.tar.gz"
for artifact in "$PG_DUMP" "$VAULT" "$REDIS" "$UPLOADS"; do
  test -s "$artifact"
  test -s "$artifact.sha256"
  sha256sum -c "$artifact.sha256"
done

DRILL_DB="atina_restore_drill_$(date +%Y%m%d_%H%M%S)"
cleanup() {
  docker exec "$PG_CONT" dropdb -U "$DB_USER" --if-exists "$DRILL_DB" >/dev/null 2>&1 || true
  docker exec "$PG_CONT" rm -f /tmp/restore-drill.dump >/dev/null 2>&1 || true
  docker exec "$ATINA_CONT" rm -f /tmp/restore-drill-vault.db >/dev/null 2>&1 || true
  docker exec "$REDIS_CONT" rm -f /tmp/restore-drill.rdb >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker cp "$PG_DUMP" "$PG_CONT:/tmp/restore-drill.dump"
docker exec "$PG_CONT" pg_restore -l /tmp/restore-drill.dump >/dev/null
docker exec "$PG_CONT" createdb -U "$DB_USER" "$DRILL_DB"
docker exec "$PG_CONT" pg_restore -U "$DB_USER" -d "$DRILL_DB" \
  --no-owner --no-privileges /tmp/restore-drill.dump
TABLE_COUNT="$(docker exec "$PG_CONT" psql -U "$DB_USER" -d "$DRILL_DB" -Atc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")"
if [[ ! "$TABLE_COUNT" =~ ^[0-9]+$ || "$TABLE_COUNT" -lt 1 ]]; then
  echo "RESTORE_DRILL_FAIL restored database has no public tables" >&2
  exit 1
fi

docker cp "$VAULT" "$ATINA_CONT:/tmp/restore-drill-vault.db"
VAULT_OK="$(docker exec "$ATINA_CONT" node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/tmp/restore-drill-vault.db', sqlite3.OPEN_READONLY);
db.get('PRAGMA integrity_check', (error, row) => {
  if (error) { console.error(error); process.exitCode = 1; }
  else { console.log(row.integrity_check); }
  db.close();
});
")"
[[ "$VAULT_OK" == "ok" ]]

docker cp "$REDIS" "$REDIS_CONT:/tmp/restore-drill.rdb"
docker exec "$REDIS_CONT" redis-check-rdb /tmp/restore-drill.rdb >/dev/null
tar -tzf "$UPLOADS" >/dev/null

echo "RESTORE_DRILL_OK timestamp=$TS postgres_tables=$TABLE_COUNT forge=ok redis=ok uploads=ok"
