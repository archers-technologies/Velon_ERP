# Monorepo structure

**Audience:** Engineers  
**Last updated:** July 2026

Velon uses **npm workspaces** (`apps/*`, `packages/*`) and organizes code by **DDD bounded contexts** (business folders), not by technical layers (`controllers/`, `services/`).

## Layout

```
Velon_ERP/
├── apps/
│   └── api/                    # @velon/api — NestJS
│       ├── src/
│       │   ├── auth/           # Bounded contexts (one folder each)
│       │   ├── billing/
│       │   ├── crm/
│       │   ├── inventory/
│       │   ├── procurement/
│       │   ├── sales/
│       │   ├── suppliers/
│       │   ├── workspace/
│       │   ├── tenant-admin/
│       │   ├── tenant-resources/
│       │   ├── tenants/
│       │   ├── platform/       # Platform-admin only
│       │   ├── cms/
│       │   ├── audit/
│       │   ├── notifications/
│       │   ├── common/         # Cross-cutting: tenant scope, mail, filters
│       │   ├── config/         # Env validation
│       │   ├── prisma/
│       │   ├── redis/
│       │   └── mongo/
│       ├── test/               # e2e / security suites
│       └── Dockerfile.api
├── packages/
│   ├── database/               # @velon/database
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── migrations/
│   │       └── seed.ts
│   └── shared/                 # @velon/shared (shared kernel)
│       └── src/                # Roles, permissions, plans, localization, nav
├── src/                        # Web application (root package @velon/web)
│   ├── routes/                 # File-based TanStack routes (URL-shaped)
│   ├── components/
│   │   ├── ui/                 # Design-system primitives only
│   │   └── {context}/          # Domain UI (auth, workspace, settings, …)
│   ├── lib/
│   │   ├── api/                # HTTP clients
│   │   └── {context}/          # Domain helpers / loaders
│   ├── contexts/               # React providers
│   └── erp/
├── scripts/                    # bootstrap-local, backup, release verify
├── docs/
├── docker-compose.yml
├── vite.config.ts
├── vercel.json
├── railway.json                # API-only Railway service
└── railway.web.json            # Combined web+API (when used)
```

## Packages

| Package | Name | Responsibility |
|---------|------|----------------|
| Root web | `@velon/web` | UI, routing, client-side API calls |
| API | `@velon/api` | Business logic, auth, integrations |
| Database | `@velon/database` | Prisma schema, migrations, seed |
| Shared | `@velon/shared` | Cross-cutting types and policy (imported by web and API) |

The web Vite config aliases `@velon/shared` to TypeScript source so the browser loads ESM without stale CJS bundles. Web source uses the `@/` path alias (`src/*`).

## Grepping by domain

Prefer searching inside a context folder:

```bash
rg "quotation" apps/api/src/crm
rg "seat" apps/api/src/tenant-admin
rg "Permission" packages/shared/src
```

API files are named `{context}` or `{context}-{aggregate}` with a role suffix (`crm-pipeline.service.ts`, `inventory.repositories.ts`). Web domain code lives under `components/{context}/` and `lib/{context}/`.

## Formatting

Root Prettier (`.prettierrc`) enforces single quotes, one JSX attribute per line, import order (`react` → Nest → third-party → `@velon/*` → `@/` → relative), and Tailwind class sorting.

```bash
npm run format
npm run format:check
```

## Related docs

- [Tech stack by category](./TECH-STACK.md)
- [Shared package](./SHARED-PACKAGE.md)
- [Frontend](./FRONTEND.md)
- [Conventions](./CONVENTIONS.md)
