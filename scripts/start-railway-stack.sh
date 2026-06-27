#!/bin/sh
set -eu

# Combined Railway stack: Nest API (internal) + Nitro web (public PORT).
# API env (SMTP, DATABASE_URL, REDIS_URL, JWT_*) must live on this same service.

env -u PORT API_PORT=3001 node /apps/api/dist/apps/api/src/main.js &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup INT TERM

# Avoid proxying before the API socket is listening.
sleep 1

exec node .output/server/index.mjs
