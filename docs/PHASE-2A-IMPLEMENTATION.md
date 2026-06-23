# Phase 2A — Implementation Summary

**Status:** Implemented (June 7, 2026)  
**Approved decisions applied:** SUPER_ADMIN unchanged, `/admin/*` unchanged, one email = one tenant, 1:1 Tenant:Workspace, Forgot Password retained with support flow.

---

## Schema (`packages/database/prisma/schema.prisma`)

| Model | Purpose |
|-------|---------|
| `CompanyProfile` | 1:1 with Tenant — legal name, email, phone, country, industry |
| `Workspace` | 1:1 with Tenant — operational ERP instance |
| `TenantMembership` | Added `isActive`, `updatedAt`; role is authoritative for tenant users |
| `UserRole` | Added `DEPARTMENT_ADMIN` (for Phase 2D) |

**Migration:** `prisma/migrations/20260607120000_phase2a_tenant_workspace/migration.sql`  
Includes backfill for existing tenants.

Run when Postgres is available:

```bash
npm run db:migrate
```

---

## Registration flow (API)

`POST /api/v1/auth/signup` — single transaction creates:

1. `User` (`role: TENANT_USER`, `name: fullName`)
2. `Tenant`
3. `CompanyProfile`
4. `Workspace`
5. `TenantMembership` (`role: TENANT_ADMIN` — Tenant Super Admin)
6. JWT with tenant scope

**Required fields:** companyName, companyEmail, companyPhone, country, industry, fullName, password, verificationToken

**Rule:** One email → one tenant (enforced via unique `User.email`).

---

## JWT claims (`@velon/shared`)

```typescript
{
  sub, email,
  scope: "platform" | "tenant",
  role,              // platform User.role OR membership.role
  tenantId?,         // tenant scope only
  workspaceId?,
  membershipId?
}
```

---

## Guards & isolation

| File | Purpose |
|------|---------|
| `TenantScopeGuard` | Requires `scope === "tenant"` + tenantId/workspaceId |
| `PlatformScopeGuard` | Requires `scope === "platform"` |
| `tenant-isolation.util.ts` | `withTenantScope()` helper for future ERP queries |
| `GET /api/v1/workspace/context` | Returns workspace + tenant + company profile for authenticated tenant user |

---

## Client session

Stored in localStorage (app scope):

- `velon.app.tenantId`
- `velon.app.workspaceId`
- `velon.app.membershipRole`

---

## UI (`src/routes/login.tsx`)

- Sign In: email + password + Forgot password (info@velonerp.com)
- Create Workspace: 7 registration fields + OTP
- Tab label: **Create Workspace**

---

## Not in Phase 2A (deferred)

- Invite user system (Phase 2D)
- `/app/settings/admin` team UI
- ERP module migration to tenant-scoped Postgres
- Department CRUD
- erp-store tenant partitioning

---

## Verify locally

```bash
# Set DATABASE_URL, REDIS_URL, JWT_*, AUTH_OTP_SECRET in .env
npm run db:migrate
npm run dev:all
```

1. Create workspace with all 7 fields + OTP
2. Confirm JWT/session contains `tenantId` and `workspaceId`
3. `GET /api/v1/workspace/context` with Bearer token returns company profile
4. Platform login (`/platform/login`) still routes SUPER_ADMIN to `/admin`
