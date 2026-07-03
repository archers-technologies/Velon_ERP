#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — set SUPER_ADMIN_PASSWORD before seeding."
fi

echo "Starting Postgres + Redis (Docker)…"
docker compose up -d postgres redis 2>/dev/null || {
  echo "Docker unavailable — ensure Postgres and Redis match DATABASE_URL / REDIS_URL in .env"
}

echo "Prisma generate + migrate…"
npm run db:generate
npm run db:migrate

if [[ -z "${SUPER_ADMIN_PASSWORD:-}" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
if [[ -z "${SUPER_ADMIN_PASSWORD:-}" ]]; then
  echo "Set SUPER_ADMIN_PASSWORD in .env, then run: npm run db:seed"
  exit 1
fi

echo "Seeding super admin…"
npm run db:seed

echo "Done. Run: npm run dev:all"
echo "Platform admin: info@velonerp.com + SUPER_ADMIN_PASSWORD from .env"
echo "Workspace test user: set DEV_TENANT_EMAIL + DEV_TENANT_PASSWORD, then npm run db:seed"
