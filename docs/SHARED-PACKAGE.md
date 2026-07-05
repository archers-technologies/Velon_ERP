# Shared package (`@velon/shared`)

**Audience:** Engineers  
**Last updated:** July 2026

`@velon/shared` (folder `packages/shared-kernel`) is the single source of truth for policies used by both backend and frontend.

## Export areas

| Export area | Contents |
|-------------|----------|
| Roles and permissions | `VelonRole`, `ROLE_PERMISSIONS`, `roleHasPermission` |
| CRM / inventory / procurement / sales permission helpers | `canReadCrm`, `canManageInventory`, … |
| Plans and seats | `PLAN_CATALOG`, `SEAT_LIMITS`, regional pricing |
| Billing policy | Trial days, portal path prefixes, subscription access |
| Password policy | Strength rules and evaluation |
| Localization | Country catalog, currency formatting, date/number formats |
| Navigation | Workspace sidebar labels, settings routes, admin nav |
| Role presets | Friendly invite roles |
| Seed / production filters | Demo exclusion for platform metrics |
| Workspace host | Public workspace domain resolution |

## Rule of thumb

When adding a permission or plan rule, update shared first, then API guards and UI.

## Location

`packages/shared-kernel/src/` — entry `index.ts`. The web Vite config aliases `@velon/shared` to TypeScript source for ESM in the browser.

## Related docs

- [Monorepo](./MONOREPO.md)
- [Authentication](./AUTHENTICATION.md)
- [Tech stack — Shared contracts](./TECH-STACK.md#5-shared-contracts-and-policy)
- [Conventions](./CONVENTIONS.md)
