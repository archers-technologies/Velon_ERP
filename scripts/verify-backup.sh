#!/usr/bin/env bash
# Backup → restore verification on an isolated scratch database.
# Requires CREATEDB permission on the PostgreSQL role.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set."
  exit 1
fi

SCRATCH="velon_erp_backup_verify_$(date +%s)"
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

echo "[1/4] Creating backup …"
BACKUP_FILE="$(bash scripts/backup-db.sh "$BACKUP_DIR" | tail -1)"

BASE_URL="${DATABASE_URL%%\?*}"
SCRATCH_URL="${BASE_URL%/*}/$SCRATCH?schema=public"

echo "[2/4] Creating scratch database $SCRATCH …"
psql "${BASE_URL%/*}/postgres" -c "CREATE DATABASE \"$SCRATCH\";"

echo "[3/4] Restoring into scratch database …"
gunzip -c "$BACKUP_FILE" | psql "$SCRATCH_URL" --set ON_ERROR_STOP=1 --quiet

echo "[4/4] Verifying row counts …"
psql "$SCRATCH_URL" -c "SELECT COUNT(*) AS tenants FROM \"Tenant\"; SELECT COUNT(*) AS users FROM \"User\";"

psql "${BASE_URL%/*}/postgres" -c "DROP DATABASE \"$SCRATCH\";"
echo "Backup verification passed."
