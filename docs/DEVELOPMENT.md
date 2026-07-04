# Local development

**Audience:** Engineers  
**Last updated:** July 2026

## Prerequisites

- Node.js 20+ and npm 10+
- Docker (recommended) or local PostgreSQL 16 and Redis 7

## Bootstrap

```bash
npm install
cp .env.example .env
# Edit secrets: SUPER_ADMIN_PASSWORD, JWT_*, AUTH_OTP_SECRET, optional DEV_TENANT_*

npm run bootstrap:local
# Starts Docker Postgres/Redis (if available), prisma generate + migrate, seed

npm run dev
# Concurrent: vite (web) + Nest API
```

If Docker is unavailable, point `DATABASE_URL` and `REDIS_URL` at local services and run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Ports

| Service | Port |
|---------|------|
| Web (Vite) | `8080` |
| API | `3001` |
| Postgres (compose) | `5432` |
| Redis | `6379` |

Align `DATABASE_URL` with your Postgres port (compose uses `5432`; some local Homebrew setups use `5433` as in `.env.example`).

## Default URLs

| Service | URL |
|---------|-----|
| Web | http://localhost:8080 |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/api/docs |

## Useful commands

```bash
npm run db:studio          # Browse data
npm run db:cleanup-demo    # Remove demo seed data
npm run stack:logs         # Docker logs
npm run typecheck
npm run lint
npm run format              # Prettier (single quotes, import order, attributes)
npm run format:check
```

## Accounts after seed

| Portal | Credentials |
|--------|-------------|
| Platform admin (`/admin`) | `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD` |
| Workspace (`/app`) | `DEV_TENANT_EMAIL` + `DEV_TENANT_PASSWORD` (if set before seed) |

## Related docs

- [Environment](./ENVIRONMENT.md)
- [Tech stack](./TECH-STACK.md)
- [Testing](./TESTING.md)
- [Repository README](../README.md)
