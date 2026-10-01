#!/bin/sh
# Entry point of the `backup` service: one backup at start-up, then daily at BACKUP_AT (UTC, HH:MM).
set -eu
AT="${BACKUP_AT:-21:00}" # 21:00 UTC = 02:00 in Pakistan
backup.sh || echo "$(date -u +%FT%TZ) backup FAILED" >&2
while true; do
  now=$(date -u +%s)
  next=$(date -u -d "$(date -u +%F) $AT" +%s 2>/dev/null || date -u -D '%Y-%m-%d %H:%M' -d "$(date -u +%F) $AT" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  backup.sh || echo "$(date -u +%FT%TZ) backup FAILED" >&2
done
