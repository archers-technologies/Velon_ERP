# Phase 3A — CRM Foundation

**Status:** Complete  
**Date:** 2026-06-07  
**Prerequisites:** Phase 2A–2D, Phase 2D.1 (Postgres + Redis, no Mongo)

---

## Executive summary

Phase 3A delivers the first real ERP module: a tenant-scoped CRM foundation with **Customers**, **Contacts**, **Notes**, and **Activities**. All data flows through `TenantScopedRepository`, RBAC guards, and audit logging. No deals, pipelines, quotes, or marketing features were added.

---

## Success criteria

| Criterion | Result |
|-----------|--------|
| Customers CRUD + search + archive/restore/delete | **Pass** |
| Contacts CRUD + archive + search | **Pass** |
| Notes create/edit-own/delete-own + history | **Pass** |
| Activities create/assign/complete/cancel + filters | **Pass** |
| Tenant isolation | **Pass** — `crm-isolation.e2e-spec.ts` |
| Repository pattern enforced | **Pass** — no manual `tenantId` in controllers |
| Audit events | **Pass** |
| UI at `/app/crm` | **Pass** |
| Role permissions | **Pass** — Owner/Admin manage; Dept Admin write; User read |

---

## Database schema

**Migration:** `packages/database/prisma/migrations/20260615120000_phase3a_crm/`

| Model | Purpose |
|-------|---------|
| `CrmCustomer` | Company records with `customerCode`, status, archive, audit fields |
| `CrmContact` | People linked to customers |
| `CrmNote` | Notes on customers or contacts (`targetType` + `targetId`) |
| `CrmActivity` | Calls, meetings, tasks with owner, status, filters |

**Enums:** `CrmCustomerStatus`, `CrmNoteTargetType`, `CrmActivityType`, `CrmActivityStatus`

**Note:** `TenantCustomer` remains as Phase 2C isolation-test fixture — not the CRM module.

---

## APIs

Base: `/api/v1/crm` — JWT + tenant portal scope + `TenantContextInterceptor`

### Customers
| Method | Path | Roles |
|--------|------|-------|
| GET | `/customers?search=&status=&includeArchived=` | All tenant |
| GET | `/customers/:id` | All tenant |
| POST | `/customers` | Owner, Admin, Dept Admin |
| PATCH | `/customers/:id` | Owner, Admin, Dept Admin |
| POST | `/customers/:id/archive` | Owner, Admin |
| POST | `/customers/:id/restore` | Owner, Admin |
| DELETE | `/customers/:id` | Owner, Admin |

### Contacts
| Method | Path |
|--------|------|
| GET/POST | `/contacts` |
| GET/PATCH | `/contacts/:id` |
| POST | `/contacts/:id/archive`, `/restore` |

### Notes
| Method | Path |
|--------|------|
| GET/POST | `/notes?targetType=&targetId=` |
| PATCH/DELETE | `/notes/:id` (own note or write role) |

### Activities
| Method | Path |
|--------|------|
| GET/POST | `/activities?customerId=&ownerId=&status=&type=&from=&to=` |
| PATCH | `/activities/:id` |
| POST | `/activities/:id/assign`, `/complete`, `/cancel` |

---

## Audit events

| Action | When |
|--------|------|
| `crm.customer_created` | Customer created |
| `crm.customer_updated` | Customer updated / archived / restored |
| `crm.customer_deleted` | Customer deleted |
| `crm.contact_created` | Contact created |
| `crm.contact_updated` | Contact updated / archived / restored |
| `crm.note_added` | Note created / updated / deleted |
| `crm.activity_created` | Activity created / assigned / updated |
| `crm.activity_completed` | Activity completed |
| `crm.activity_cancelled` | Activity cancelled |

---

## UI

| Route | Sections |
|-------|----------|
| `/app/crm` | Tabs: Customers, Contacts, Activities, Notes |

- Workspace nav: **CRM** link under Workspace group
- API client: `src/lib/api/crm.ts`
- Role-aware actions (write vs read-only vs manage)

Legacy `/app/customers` demo page remains unchanged (pre-CRM shell).

---

## Security tests

**File:** `apps/api/test/crm-isolation.e2e-spec.ts`  
**CI:** included in `npm run test:security`

| Test | Verifies |
|------|----------|
| Customer create | Tenant-scoped + `customerCode` |
| Cross-tenant list/get | Tenant B cannot see Tenant A customer |
| Contact/note/activity | Created under tenant A |
| Cross-tenant contact/notes | 404 / empty for tenant B |
| Archived visibility | Hidden unless `includeArchived=true` |
| USER role | 403 on customer create |
| Activity complete | Status transition |

---

## Files added

```
packages/database/prisma/migrations/20260615120000_phase3a_crm/
packages/shared/src/crm-permissions.ts
packages/shared/src/velon-role.ts
apps/api/src/crm/
src/lib/api/crm.ts
src/routes/app.crm.tsx
apps/api/test/crm-isolation.e2e-spec.ts
docs/PHASE-3A-CRM-FOUNDATION-REPORT.md
```

---

## Remaining CRM roadmap (NOT in 3A)

| Phase | Scope |
|-------|--------|
| 3B | Deals & pipeline stages |
| 3C | Quotes & opportunities |
| 3D | Forecasting |
| 3E | Marketing automation & campaigns |
| 3F | Lead routing & AI scoring |

---

## Local verification

```bash
npm run stack:up
npm run db:migrate:deploy
npm run dev:all
# Open /app/crm
DATABASE_URL=... REDIS_URL=... npm run test:security
```

---

## Build status

| Check | Result |
|-------|--------|
| `npm run db:generate` | Pass |
| `npm run build -w @velon/shared` | Pass |
| `npm run build -w @velon/api` | Pass |
| `npm run typecheck` | Pass |
