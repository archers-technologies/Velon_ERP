# Frontend application

**Audience:** Engineers  
**Last updated:** July 2026

Package: `@velon/frontend` in `frontend/`. Organized by **DDD bounded contexts** that mirror the backend.

## Layout

```
frontend/src/
  routes/                 # TanStack file routes (URL-shaped)
  components/
    ui/                   # Design-system primitives only
    {context}/            # Domain UI (auth, workspace, crm, …)
    shared/               # Cross-context chrome
  lib/
    api/                  # Shared HTTP client + config only
    {context}/            # Domain helpers and *api.ts clients
    shared/               # Pure UI helpers (money, catalogs)
  contexts/               # React providers
  hooks/
```

## Routing

File-based routes in `frontend/src/routes/` generate `frontend/src/routeTree.gen.ts` via the TanStack router plugin.

| Area | Route files |
|------|-------------|
| Marketing | `index`, `features`, `pricing`, `about`, `contact`, `demo`, `help`, legal |
| Auth | `login`, `forgot-password`, `platform.login`, `invite.$token` |
| Workspace | `app.tsx` layout + `app.*.tsx` children |
| Admin | `admin.tsx` layout + `admin.*.tsx` children |

## Shells

- **Site header** — marketing navigation (`components/marketing/`)
- **Workspace shell** — sidebar, currency/locale, notifications (`components/workspace/`)
- **Admin shell** — platform chrome (`components/platform/`)

Navigation labels and active-state helpers are shared (`packages/shared-kernel/src/workspace-navigation.ts`, `frontend/src/lib/workspace/nav.ts`).

## State and API

- Auth tokens stored client-side and attached to API requests (`lib/api/client.ts`)
- TanStack Query for server state
- Workspace profile context for company/workspace display preferences
- Domain clients live under the context folder, e.g. `lib/crm/api.ts`, `lib/inventory/api.ts`, `lib/billing/subscription-api.ts`

## UX patterns

- Dashboard summary cards and quick actions (`frontend/src/lib/workspace/quick-actions.ts`)
- Onboarding progress (`frontend/src/lib/workspace/onboarding-progress.ts`)
- Module empty states and role-presets guide components under `frontend/src/components/workspace/`
- Invoicing helpers (A4 templates, QR) under `frontend/src/lib/sales/invoicing/`

## Tech used

React 19, TanStack Router/Start/Query, Tailwind CSS 4, Radix UI, Vite 7. Full list: [Tech stack — Frontend](./TECH-STACK.md#2-frontend-web-app).

## Related docs

- [Monorepo](./MONOREPO.md)
- [Product overview](./PRODUCT-OVERVIEW.md)
- [API reference](./API-REFERENCE.md)
- [Shared package](./SHARED-PACKAGE.md)
- [Tenant workspace user guide](./TENANT-WORKSPACE-GUIDE.md)
