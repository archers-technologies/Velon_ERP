#!/usr/bin/env bash
# Velon ERP — local stack install (macOS + Homebrew, no Docker required)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Velon ERP — install local tech stack ==="

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required: https://brew.sh"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js…"
  brew install node
fi

echo "Node $(node -v) · npm $(npm -v)"

for pkg in postgresql@16 redis; do
  if ! brew list "$pkg" >/dev/null 2>&1; then
    echo "Installing $pkg…"
    brew install "$pkg"
  fi
done

brew services start postgresql@16
brew services start redis

PG_PORT="${POSTGRES_PORT:-5433}"
if ! pg_isready -h 127.0.0.1 -p "$PG_PORT" >/dev/null 2>&1; then
  echo "PostgreSQL not ready on port $PG_PORT. Homebrew postgresql@16 usually uses 5433."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env — set SUPER_ADMIN_PASSWORD, then re-run seed if needed."
fi

# Ensure DB role + database (idempotent)
if ! psql -h 127.0.0.1 -p "$PG_PORT" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='velon'" | grep -q 1; then
  psql -h 127.0.0.1 -p "$PG_PORT" -d postgres -c "CREATE USER velon WITH PASSWORD 'velon_dev_password' CREATEDB;"
fi
if ! psql -h 127.0.0.1 -p "$PG_PORT" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='velon_erp'" | grep -q 1; then
  psql -h 127.0.0.1 -p "$PG_PORT" -d postgres -c "CREATE DATABASE velon_erp OWNER velon;"
fi

echo "Installing npm dependencies…"
npm install

echo "Prisma generate + migrations + packages…"
npm run db:generate
npm run build -w @velon/shared
npm run build -w @velon/database
npm run db:migrate:deploy

set -a
# shellcheck disable=SC1091
source .env
set +a
if [[ -n "${SUPER_ADMIN_PASSWORD:-}" ]]; then
  npm run db:seed
else
  echo "Skip seed — set SUPER_ADMIN_PASSWORD in .env, then: npm run db:seed"
fi

npm run build -w @velon/api
npm run verify:release

echo ""
echo "Stack ready. Start app: npm run dev:all"
echo "  Web:     http://localhost:8080"
echo "  API:     http://localhost:3001"
echo "  Admin:   http://localhost:8080/platform/login"
