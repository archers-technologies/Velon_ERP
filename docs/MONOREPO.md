# Monorepo structure

**Audience:** Engineers  
**Last updated:** July 2026

Velon uses **npm workspaces** and organizes code by **DDD bounded contexts** (business folders), not by technical layers (`controllers/`, `services/`).

## Layout

```
Velon_ERP/
├── frontend/                   # @velon/frontend — React / TanStack UI
│   └── src/
│       ├── routes/             # File-based routes (URL-shaped)
│       ├── components/
│       │   ├── ui/             # Design-system primitives only
│       │   └── {context}/      # Domain UI (auth, crm, workspace, …)
│       ├── lib/
│       │   ├── api/            # Shared HTTP client + config only
│       │   └── {context}/      # Domain helpers and API clients
│       ├── contexts/           # React providers
│       └── hooks/
├── backend/                    # @velon/backend — NestJS API
│   ├── src/
│   │   ├── auth/               # Bounded contexts (one folder each)
│   │   ├── billing/
│   │   ├── crm/
│   │   ├── inventory/
│   │   ├── procurement/
│   │   ├── sales/
│   │   ├── suppliers/
│   │   ├── workspace/
│   │   ├── tenant-admin/
│   │   ├── tenant-resources/
│   │   ├── tenants/
│   │   ├── platform/           # Platform-admin only
│   │   ├── cms/
│   │   ├── audit/
│   │   ├── notifications/
│   │   ├── common/             # Cross-cutting: tenant scope, mail, filters
│   │   ├── config/             # Env validation
│   │   ├── prisma/
│   │   ├── redis/
│   │   └── mongo/
│   └── test/                   # e2e / security suites
├── packages/
│   ├── shared-kernel/          # @velon/shared — roles, permissions, plans, nav
│   └── database/               # @velon/database — Prisma schema, migrations, seed
├── scripts/                    # bootstrap-local, backup, release verify
├── docs/
├── docker-compose.yml
├── package.json                # Workspace orchestrator (not an app)
├── railway.json                # Backend-only Railway service
└── Dockerfile.railway          # Combined frontend + backend (when used)
```

## What each top-level folder is for

| Path                      | Package           | Responsibility                                         |
| ------------------------- | ----------------- | ------------------------------------------------------ |
| `frontend/`               | `@velon/frontend` | UI, routing, client-side API calls                     |
| `backend/`                | `@velon/backend`  | Business logic, auth, integrations                     |
| `packages/shared-kernel/` | `@velon/shared`   | Cross-cutting policy and types (imported by both apps) |
| `packages/database/`      | `@velon/database` | Prisma schema, migrations, seed                        |

See [packages/README.md](../packages/README.md) for package rules.

The frontend Vite config aliases `@velon/shared` to TypeScript source so the browser loads ESM without stale CJS bundles. Frontend source uses the `@/` path alias (`frontend/src/*`).

## Grepping by domain

Prefer searching inside a context folder:

```bash
rg "quotation" backend/src/crm
rg "seat" backend/src/tenant-admin
rg "Permission" packages/shared-kernel/src
rg "quotation" frontend/src/lib/crm
```

Backend files are named `{context}` or `{context}-{aggregate}` with a role suffix (`crm-pipeline.service.ts`, `inventory.repositories.ts`). Frontend domain code lives under `components/{context}/` and `lib/{context}/`.

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
