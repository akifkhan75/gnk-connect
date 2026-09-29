#!/bin/sh
# Nightly backup: PostgreSQL (custom-format dump) + uploaded files (payment slips, documents).
# Runs inside the `backup` service in docker-compose.yml; also usable by hand:
#   docker compose run --rm backup backup.sh
# Env: PGHOST PGUSER PGPASSWORD PGDATABASE, BACKUP_DIR (/backups), UPLOADS_DIR (/uploads),
#      BACKUP_KEEP_DAYS (14)
set -eu
BACKUP_DIR="${BACKUP_DIR:-/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/uploads}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP_DIR"

db="$BACKUP_DIR/db-$stamp.dump"
pg_dump --format=custom --no-owner --no-privileges --file="$db.partial" "$PGDATABASE"
# A dump that pg_restore cannot list is not a backup.
pg_restore --list "$db.partial" > /dev/null
mv "$db.partial" "$db"
echo "$(date -u +%FT%TZ) database → $db ($(du -h "$db" | cut -f1))"

if [ -d "$UPLOADS_DIR" ]; then
  files="$BACKUP_DIR/uploads-$stamp.tar.gz"
  tar -czf "$files.partial" -C "$UPLOADS_DIR" .
  mv "$files.partial" "$files"
  echo "$(date -u +%FT%TZ) uploads  → $files ($(du -h "$files" | cut -f1))"
fi

# Keep the last $KEEP days.
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP" -print -delete
