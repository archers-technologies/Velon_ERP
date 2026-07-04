# Conventions and extension points

**Audience:** Engineers  
**Last updated:** July 2026

## Adding a tenant-scoped feature

1. Add Prisma models with `tenantId` and migrate.
2. Create a Nest module under `apps/api/src/<module>/`.
3. Extend `TenantScopedRepository` for data access.
4. Protect controllers with JWT + tenant scope + `@RequirePermission(...)`.
5. Add permission strings to `@velon/shared` and role maps.
6. Add web routes under `src/routes/app.*.tsx` and API client under `src/lib/api/`.
7. Add isolation e2e coverage.

## Adding a platform-only feature

1. Nest controller under `platform` (or billing platform paths).
2. Use platform scope guard and platform roles.
3. Filter demo/seed data with shared production helpers.
4. Add `/admin` route and navigation entry.

## Do not

- Trust `tenantId` from request body, query, or headers for authorization.
- Commit `.env` or live secrets.
- Bypass `TenantScopedRepository` with unscoped Prisma queries on tenant tables.
- Duplicate permission matrices in the web only — keep them in `@velon/shared`.

## Related docs

- [Monorepo](./MONOREPO.md)
- [Shared package](./SHARED-PACKAGE.md)
- [Multi-tenancy](./MULTI-TENANCY.md)
- [Testing](./TESTING.md)
