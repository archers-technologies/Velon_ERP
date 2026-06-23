#!/usr/bin/env bash
# PostgreSQL backup for Velon ERP.
# Usage: ./scripts/backup-db.sh [output_dir]
set -euo pipefail
cd "$(dirname "$0")/.."

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

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$OUT_DIR/velon_erp_${STAMP}.sql.gz"

DUMP_URL="${DATABASE_URL%%\?*}"
echo "Backing up to $FILE …"
pg_dump "$DUMP_URL" --no-owner --no-acl | gzip -9 > "$FILE"
BYTES=$(wc -c < "$FILE" | tr -d ' ')
echo "Backup complete ($BYTES bytes)."
echo "$FILE"
