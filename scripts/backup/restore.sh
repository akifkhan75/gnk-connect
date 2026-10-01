#!/bin/sh
# Restore a backup into the database (and optionally the uploads). DESTRUCTIVE: it replaces
# the current data. Stop the API first. Usage, from the repo root:
#   docker compose stop api
#   docker compose run --rm backup restore.sh db-20261001T210000Z.dump [uploads-20261001T210000Z.tar.gz]
#   docker compose start api
set -eu
BACKUP_DIR="${BACKUP_DIR:-/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/uploads}"
[ $# -ge 1 ] || { echo "usage: restore.sh <db-dump> [uploads-tarball]"; ls -1t "$BACKUP_DIR" | head -20; exit 2; }
db="$BACKUP_DIR/$1"
[ -f "$db" ] || { echo "not found: $db"; exit 1; }
echo "Restoring $db into $PGDATABASE on $PGHOST (existing data is replaced)…"
pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction --dbname="$PGDATABASE" "$db"
if [ $# -ge 2 ]; then
  files="$BACKUP_DIR/$2"
  [ -f "$files" ] || { echo "not found: $files"; exit 1; }
  find "$UPLOADS_DIR" -mindepth 1 -delete
  tar -xzf "$files" -C "$UPLOADS_DIR"
  echo "Uploads restored from $files"
fi
echo "Done."
