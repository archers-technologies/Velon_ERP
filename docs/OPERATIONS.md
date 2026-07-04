# Operations

**Audience:** Engineers, DevOps  
**Last updated:** July 2026

## Common tasks

| Task | Command / path |
|------|----------------|
| DB backup | `npm run db:backup` (`scripts/backup-db.sh`) |
| DB restore | `npm run db:restore` |
| Rotate Postgres password | `npm run db:rotate-password` |
| Health | `GET /api/v1/health/live`, `GET /api/v1/health/ready` |
| Logs | Application stdout; Railway/Vercel dashboards |
| Demo cleanup | Platform endpoint / `npm run db:cleanup-demo` |

## Mail

Mail delivery utilities log whether SMTP/Resend is configured at API startup.

## Tech used

Bash scripts, Node `.mjs` utilities, Prisma CLI, platform health endpoints. See [Tech stack — Scripts and operations](./TECH-STACK.md#14-scripts-and-operations).

## Related docs

- [Deployment](./DEPLOYMENT.md)
- [Environment](./ENVIRONMENT.md)
- [Data model](./DATA-MODEL.md)
