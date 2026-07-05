# Deployment

**Audience:** Engineers, DevOps  
**Last updated:** July 2026

## Recommended split

| Component | Platform | Config |
|-----------|----------|--------|
| Web | Vercel | `vercel.json` — TanStack Start, `npm run build:web` |
| API | Railway | `railway.json` — `backend/Dockerfile.api`, migrate deploy pre-command, healthcheck `/api/v1/health/live` |

Set `VITE_API_URL` on Vercel to the public Railway API origin.

## Combined Railway stack

When `RAILWAY_STACK=combined` and Nitro is enabled, `/api/**` can be proxied to an internal API origin (`INTERNAL_API_ORIGIN`). See `vite.config.ts` and `.env.railway.example` comments for the all-in-one service layout (`railway.web.json` / `Dockerfile.railway` when present).

## Build order

Root `npm run build`:

1. `@velon/shared`
2. `@velon/database`
3. `@velon/backend`
4. `@velon/frontend`

API-only: `npm run build:api`  
Web-only: `npm run build:web`

## Pre-deploy database

Railway pre-deploy:

```text
node packages/database/scripts/require-database-url.mjs
cd packages/database && npx prisma migrate deploy
```

## CORS in production

Baseline origins include `https://velonerp.com`, `https://www.velonerp.com`, and `https://*.vercel.app`, merged with `CORS_ORIGINS`.

## Environment templates

- [`.env.railway.example`](../.env.railway.example)
- [`.env.vercel.example`](../.env.vercel.example)

## Tech used

Vercel, Railway, Docker, Nitro, Prisma migrate deploy. See [Tech stack — Hosting](./TECH-STACK.md#12-hosting-and-deployment).

## Related docs

- [Environment](./ENVIRONMENT.md)
- [Operations](./OPERATIONS.md)
- [Security](./SECURITY.md)
