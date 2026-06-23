#!/usr/bin/env bash
# Restore Velon ERP PostgreSQL from a gzip SQL dump.
# Usage: ./scripts/restore-db.sh path/to/backup.sql.gz
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup.sql.gz>"
  exit 1
fi

BACKUP="$1"
if [[ ! -f "$BACKUP" ]]; then
  echo "Backup file not found: $BACKUP"
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Configure .env first."
  exit 1
fi

RESTORE_URL="${DATABASE_URL%%\?*}"
echo "Restoring from $BACKUP …"
gunzip -c "$BACKUP" | psql "$RESTORE_URL" --set ON_ERROR_STOP=1 --quiet
echo "Restore complete."
