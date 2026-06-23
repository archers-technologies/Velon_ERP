# Velon ERP Deployment Runbook

The approved UI is deployed as the web app, and the production backend runs as a separate Railway service. Do not publish production until staging passes API, auth, data, performance, and security checks.

**Step-by-step hosting (Vercel + Railway + Postgres password):** see [HOSTING.md](./HOSTING.md).

## Target Topology

```text
Vercel web app
  -> HTTPS API calls
Railway NestJS API
  -> Railway PostgreSQL
  -> Railway Redis
  -> S3-compatible storage
```

## Vercel Frontend

`vercel.json` is committed — import the repo root on Vercel. Copy variables from `.env.vercel.example`.

- Build command: `npm run build:web` (set in `vercel.json`)
- Output directory: `dist/client`
- Required env: `VITE_API_URL=https://<railway-api-domain>`

Do not add backend secrets to Vercel. Only `VITE_*` values are safe for the browser.

## Railway Backend

Deploy with `railway.json`. Add managed **PostgreSQL** and **Redis** in the same project; reference them from the API service:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

Full variable list: `.env.railway.example`. The Railway config runs Prisma migrations before deployment and uses `/api/v1/health/live` as the health check.

### Rotate PostgreSQL password

- **Railway:** Postgres service → reset credentials or `ALTER USER` via `railway connect`, then update `DATABASE_URL` on the API service.
- **Local:** `npm run db:rotate-password -- 'new-password'` (updates `.env` and runs `ALTER USER`).

See [HOSTING.md](./HOSTING.md#3-postgresql-passwords).

## Database Release

For production, create a database backup before applying migrations:

```bash
pg_dump "$DATABASE_URL" > "backup-$(date +%Y%m%d%H%M%S).sql"
npm run db:migrate:deploy
npm run db:seed
```

`db:seed` creates or updates the super admin. Keep `SUPER_ADMIN_PASSWORD` in the deployment secret manager only.

## Release Gate

- CI passes: lint, typecheck, Prisma generate/migrate, API build, web build
- Staging login works for super admin and tenant workspace
- Tenants can be created/updated through the API
- Audit logs are written for auth and tenant changes
- Health endpoints pass:
  - `/api/v1/health/live`
  - `/api/v1/health/ready`
- CORS includes only approved Vercel domains
- Production secrets are rotated and not committed

## Current Migration Status

The production platform foundation is ready for Vercel + Railway. Remaining ERP modules should be moved from `erp-store` server functions into tenant-scoped NestJS modules before public launch.
