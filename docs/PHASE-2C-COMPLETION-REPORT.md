# Phase 2C — Tenant Data Partitioning & Production Foundation

**Status:** Complete  
**Date:** 2026-06-09  
**Prerequisite phases:** 2A (schema/workspace/JWT), 2B (isolation/portal/security tests)

---

## Executive summary

Phase 2C removes the global demo `erp-store`, makes PostgreSQL the authoritative data path, introduces a mandatory tenant-scoped repository layer on the API, expands automated isolation tests, adds a CI security gate, and ships a Super Admin platform diagnostics view. Workspace and admin UI pages now load from API-backed loaders (empty tenant-scoped shells until ERP modules begin in Phase 2D).

---

## Success criteria

| Criterion | Result |
|-----------|--------|
| No global `erp-store` | **Pass** — deleted (`src/erp/erp-store.ts`, `store-persistence.ts`, Mongo platform snapshot) |
| No hardcoded tenant records | **Pass** — `PLATFORM_TENANTS`, `ADMIN_USERS` removed from `admin-demo.ts` |
| Database is source of truth | **Pass** — tenants, auth, isolation fixtures, notifications require `tenantId` in Postgres |
| Every business record has `tenantId` | **Pass** — schema + repositories; platform entities (`User` without tenant) unchanged by design |
| Repository layer enforces tenant scope | **Pass** — `TenantScopedRepository` + `TenantContextInterceptor` |
| Security tests automated | **Pass** — expanded e2e (customers, projects, assets, files, notifications) |
| CI blocks security regressions | **Pass** — `npm run test:security` in `.github/workflows/ci.yml` |
| No cross-tenant leakage | **Pass** — tests A–H + portal separation (when `DATABASE_URL` set) |
| Platform diagnostics operational | **Pass** — `GET /api/v1/platform/diagnostics` + `/admin/infrastructure` |

---

## Files modified / added

### Removed
- `src/erp/erp-store.ts` (~3,700 lines global demo store)
- `src/erp/store-persistence.ts` (Mongo hydrate/persist for demo store)
- `src/server/mongo/platform-db.ts` (platform snapshot in Mongo)

### Database (`packages/database`)
- `prisma/schema.prisma` — `TenantAsset`, `TenantFile`; `Notification.tenantId` required + FK
- `prisma/migrations/20260609120000_phase2c_partitioning/`

### API (`apps/api`)
- `src/common/tenant-context.storage.ts` — AsyncLocalStorage tenant binding
- `src/common/tenant-context.interceptor.ts` — wraps tenant requests for repository scope
- `src/common/repositories/tenant-scoped.repository.ts` — base class
- `src/common/repositories/tenant.repositories.ts` — customer, project, asset, file, notification, audit repos
- `src/tenant-resources/*` — expanded endpoints + repository-backed service
- `src/workspace/workspace-data.service.ts` — tenant-scoped empty read models
- `src/workspace/workspace.controller.ts` — dashboard/module shell endpoints
- `src/platform/platform.service.ts` — `getDiagnostics()`
- `src/platform/platform.controller.ts` — `GET /platform/diagnostics` (SUPER_ADMIN)
- `test/tenant-isolation.e2e-spec.ts` — Tests F–H (assets, files, notifications)

### Frontend (`src`)
- `lib/types/workspace-ui.ts` — UI types extracted from former erp-store
- `lib/workspace/empty-states.ts` — typed empty tenant/workspace structures
- `lib/workspace/loaders.ts` — API-first workspace loaders
- `lib/workspace/mutations.ts` — Phase 2D stubs (throws until modules ship)
- `lib/platform/admin-loaders.ts` — API-only admin loaders (no demo fallback)
- `erp/erp-functions.ts` — OTP + contact only
- `routes/admin.infrastructure.tsx` — platform health dashboard
- All workspace/admin routes migrated off `erp-store` / demo server functions
- `hooks/use-platform-realtime.ts` — Postgres sync via API only
- `lib/admin-demo.ts` — types/helpers only; demo tenant/user arrays removed

### CI
- `.github/workflows/ci.yml` — mandatory `test:security` with `AUTH_OTP_SECRET`

---

## Architecture changes

### 1. Repository enforcement (Task 4)

```
JWT (tenant scope) → TenantScopeGuard → TenantContextInterceptor
  → AsyncLocalStorage { tenantId, workspaceId, membershipId, userId }
  → TenantScopedRepository.where() → Prisma queries always include tenantId
```

Developers must not pass `tenantId` from body/query. Spoof attempts are audit-logged (unchanged from 2B).

### 2. Database authority (Task 2)

| Layer | Before 2C | After 2C |
|-------|-----------|----------|
| Admin tenants | Demo store or API | API only (`/tenants`) |
| Workspace UI | In-memory `erp-store` | API `/workspace/*` empty shells |
| Auth/signup | Demo fallback | `VITE_API_URL` required |
| Platform sync | Mongo revision | Postgres `PlatformRevision` + Redis |

### 3. Tenant partitioning (Task 3)

| Model | tenantId | Notes |
|-------|----------|-------|
| TenantCustomer | required | isolation fixture |
| TenantProject | required | isolation fixture |
| TenantAsset | required | new fixture |
| TenantFile | required | new fixture |
| Notification | required | FK to Tenant |
| AuditLog | optional | platform + tenant events |
| User | n/a | platform entity |

### 4. Platform diagnostics (Task 8)

`GET /api/v1/platform/diagnostics` (SUPER_ADMIN, platform scope):

- Active tenants / users (counts only)
- Postgres / API / queue (Redis) status
- Recent security audit events
- Recent error-pattern audit entries  
- **No tenant business payloads**

UI: `/admin/infrastructure`

---

## Security test results

Script: `npm run test:security` (requires `DATABASE_URL`, `REDIS_URL`, JWT secrets, `AUTH_OTP_SECRET`)

| Test | Description |
|------|-------------|
| A | Tenant B cannot list Tenant A customer |
| B | Tenant B cannot GET Tenant A project → 404 |
| C | Tenant token → `/tenants` → 403 |
| D | Spoofed body `tenantId` ignored |
| E | Cross-tenant list has zero foreign rows |
| F | Asset isolation (GET + list) |
| G | File metadata isolation |
| H | Notification isolation |
| Portal | Tenant token → `/platform/overview` → 403 |

**Local note:** If `.env` has no `DATABASE_URL`, tests skip (unchanged). CI always runs against Postgres service.

---

## Database readiness (Task 6)

Verified in schema/migration:

- **Indexes:** `tenantId` on all tenant fixtures; composite `(tenantId, userId)` on Notification
- **Foreign keys:** Tenant → cascade on customers, projects, assets, files, notifications
- **Unique constraints:** unchanged (membership `userId+tenantId`, workspace 1:1 tenant)
- **Orphans:** cascade deletes from Tenant root; AuditLog uses `SetNull` on actor/tenant delete

---

## Remaining risks

1. **Workspace module UI is empty** — By design until Phase 2D; pages render zero-state, mutations throw with clear message.
2. **`VITE_API_URL` required locally** — Demo mode removed; developers must run API + Postgres.
3. **Web production build** — Pre-existing Rollup export issue for `@velon/shared` signup token (unrelated to 2C typecheck, which passes).
4. **Mongo** — Still used for OTP/contact auxiliary storage if configured; no longer used for ERP demo data.
5. **Audit logs for tenant read API** — Tenant-scoped audit list returns rows where `tenantId` matches JWT; platform security events may have null `tenantId`.

---

## Recommendation — Phase 2D (Invitations, Teams, Seats, Departments)

Proceed in this order:

1. **Invitations** — `TenantInvitation` model, email flow, accept → `TenantMembership`
2. **Seat enforcement** — `usersCount` vs plan limits; block invite when over cap
3. **Teams / Departments** — `Department`, `DepartmentMembership`; `DEPARTMENT_ADMIN` scope in guards
4. **Wire first ERP module** — e.g. Customers API replacing empty `/workspace/customers` shell, using same repository pattern
5. **Platform admin users** — Replace empty `/admin/users` with Postgres-backed platform staff list

Phase 2C foundation is sufficient to begin 2D without reintroducing global state.

---

## Phase gate

**ERP modules (CRM, HR, Inventory, Procurement, Finance, Asset, Project, Helpdesk, AI, Reporting, Analytics) may begin after Phase 2D team/seat foundation OR module-by-module once each module’s API replaces the corresponding empty workspace shell and passes isolation tests for its entities.**

Phase 2C infrastructure gate: **PASSED**
