# Frontend application

**Audience:** Engineers  
**Last updated:** July 2026

## Routing

File-based routes in `src/routes/` generate `src/routeTree.gen.ts` via the TanStack router plugin.

| Area | Route files |
|------|-------------|
| Marketing | `index`, `features`, `pricing`, `about`, `contact`, `demo`, `help`, legal |
| Auth | `login`, `forgot-password`, `platform.login`, `invite.$token` |
| Workspace | `app.tsx` layout + `app.*.tsx` children |
| Admin | `admin.tsx` layout + `admin.*.tsx` children |

## Shells

- **Site header** — marketing navigation
- **Workspace shell** — sidebar, currency/locale, notifications, quick-create FAB, onboarding checklist
- **App shell / admin shell** — portal-specific chrome

Navigation labels and active-state helpers are shared (`packages/shared/src/workspace-navigation.ts`, `src/lib/workspace-nav.ts`).

## State and API

- Auth tokens stored client-side and attached to API requests
- TanStack Query for server state
- Workspace profile context for company/workspace display preferences
- Module-specific clients: `src/lib/api/crm.ts`, `inventory.ts`, `crm-quotation.ts`, etc.

## UX patterns

- Dashboard summary cards and quick actions (`src/lib/workspace/quick-actions.ts`)
- Onboarding progress (`src/lib/workspace/onboarding-progress.ts`)
- Module empty states and role-presets guide components under `src/components/workspace/`
- Invoicing helpers (A4 templates, QR) under `src/lib/invoicing/`

## Tech used

React 19, TanStack Router/Start/Query, Tailwind CSS 4, Radix UI, Vite 7. Full list: [Tech stack — Frontend](./TECH-STACK.md#2-frontend-web-app).

## Related docs

- [Product overview](./PRODUCT-OVERVIEW.md)
- [API reference](./API-REFERENCE.md)
- [Shared package](./SHARED-PACKAGE.md)
- [Tenant workspace user guide](./TENANT-WORKSPACE-GUIDE.md)
