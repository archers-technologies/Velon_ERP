# Conventions and extension points

**Audience:** Engineers  
**Last updated:** July 2026

Code is organized by **bounded context** (business domain folder). Agents should follow the `velon-domain-structure` skill and the always-on Cursor rules under `.cursor/rules/`.

## Adding a tenant-scoped feature

1. Add Prisma models with `tenantId` and migrate (`packages/database`).
2. Create a Nest module under `apps/api/src/<context>/` (folder name = domain language).
3. Name files `{context}` or `{context}-{aggregate}` with a role suffix (`.module.ts`, `.controller.ts`, `.service.ts`, `.repositories.ts`, `.dto.ts`, `.spec.ts`).
4. Extend `TenantScopedRepository` for data access.
5. Protect controllers with JWT + tenant scope + `@RequirePermission(...)`.
6. Add permission strings to `@velon/shared` and role maps.
7. Add web routes under `src/routes/app.*.tsx`, domain UI under `src/components/<context>/` when needed, and clients/helpers under `src/lib/api/` or `src/lib/<context>/` using `@/` imports.
8. Add isolation e2e coverage.

## Adding a platform-only feature

1. Nest controller under `platform` (or billing platform paths).
2. Use platform scope guard and platform roles.
3. Filter demo/seed data with shared production helpers.
4. Add `/admin` route and navigation entry.

## Formatting and imports

- Run `npm run format` (Prettier) before large style-only commits; CI can use `npm run format:check`.
- Single quotes in TS/JS; double quotes in JSX attributes; one attribute per line.
- Import order is enforced by Prettier: React → Nest → third-party → `@velon/*` → `@/` → relative.
- Prefer `@/` absolute imports on the web. In the API, use `./` within a context and `../other-context/` across contexts (explicit coupling).

## Do not

- Trust `tenantId` from request body, query, or headers for authorization.
- Commit `.env` or live secrets.
- Bypass `TenantScopedRepository` with unscoped Prisma queries on tenant tables.
- Duplicate permission matrices in the web only — keep them in `@velon/shared`.
- Add technical top-level folders (`controllers/`, `services/`, god `utils/`) — keep code in the owning context folder.

## Related docs

- [Monorepo](./MONOREPO.md)
- [Shared package](./SHARED-PACKAGE.md)
- [Multi-tenancy](./MULTI-TENANCY.md)
- [Testing](./TESTING.md)
