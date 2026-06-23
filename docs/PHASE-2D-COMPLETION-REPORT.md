# Phase 2D — Tenant Administration Layer

**Status:** Complete  
**Date:** 2026-06-07  
**Prerequisite phases:** 2A (schema/workspace/JWT), 2B (isolation/portal), 2C (repository partitioning)

---

## Executive summary

Phase 2D delivers tenant workforce management before ERP modules begin. Tenant Owners can invite users, manage seats, create departments, assign roles, disable/remove users, and review audit history. A public invitation accept flow creates membership and issues a tenant session. Seat limits are enforced on invite and re-enable. Security e2e tests cover role elevation, disabled users, expired invitations, and seat caps.

**CRM is approved as the first ERP module** once this phase is deployed with migrations applied and security tests passing in CI.

---

## Success criteria

| Task | Criterion | Result |
|------|-----------|--------|
| 1 — Invitations | User receives invite, sets password, joins tenant, membership + audit created, expired rejected | **Pass** — API + `/invite/:token` UI |
| 2 — Seats | Starter=5, Growth=25, Enterprise=unlimited; invite/activate blocked at limit | **Pass** — `SeatsService` + shared `SEAT_LIMITS` |
| 3 — User management | View, search, disable, enable, reset invitations, remove; owner self-protection | **Pass** — tenant-admin members + invitations endpoints |
| 4 — Departments | Name, description, manager (API); CRUD | **Pass** — `Department` model + UI (manager field API-only for now) |
| 5 — Roles | TENANT_OWNER, DEPARTMENT_ADMIN, USER assign/change/remove | **Pass** — role guards + UI select |
| 6 — Admin UI | `/app/settings/admin` with all sections | **Pass** — tabbed admin settings page |
| 7 — Audit | All Phase 2D events logged | **Pass** — see audit actions below |
| 8 — Security tests | Elevation, disabled user, expired invite, seats, admin 403 | **Pass** (CI) — local run requires Postgres + Redis |

---

## Database changes

**Migration:** `packages/database/prisma/migrations/20260610120000_phase2d_tenant_admin/`

| Change | Details |
|--------|---------|
| Enum `InvitationStatus` | `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED` |
| Model `Department` | `tenantId`, `name`, `description`, `managerId` → `TenantMembership`; unique `(tenantId, name)` |
| Model `TenantInvitation` | `email`, `fullName`, `role`, `departmentId`, `tokenHash`, `status`, `expiresAt`, `invitedById` |
| `TenantMembership.departmentId` | Optional FK to `Department` |
| Relations | `Tenant.departments`, `Tenant.invitations`, `User.invitationsSent` |

---

## APIs created

Base path: `/api/v1`. Tenant-admin routes require JWT, tenant portal scope, and `TENANT_OWNER` or `TENANT_ADMIN`.

### Tenant admin (authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/tenant-admin/overview` | Company profile, workspace, seats, counts, recent audit |
| GET | `/tenant-admin/seats` | Seat usage snapshot |
| GET/POST/PATCH/DELETE | `/tenant-admin/departments` | Department CRUD |
| GET | `/tenant-admin/members?search=` | List/search members |
| PATCH | `/tenant-admin/members/:id/role` | Change role |
| PATCH | `/tenant-admin/members/:id/department` | Assign department |
| POST | `/tenant-admin/members/:id/disable` | Disable user |
| POST | `/tenant-admin/members/:id/enable` | Enable user (seat-checked) |
| DELETE | `/tenant-admin/members/:id` | Remove membership |
| GET/POST | `/tenant-admin/invitations` | List / create invitation |
| POST | `/tenant-admin/invitations/:id/revoke` | Revoke pending invite |
| POST | `/tenant-admin/invitations/:id/resend` | Regenerate token + resend email |
| GET | `/tenant-admin/audit-logs` | Tenant-scoped audit list |

### Public invitations

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/invitations/:token` | Preview invite (workspace, inviter, expiry) |
| POST | `/invitations/accept` | Set password, create user/membership, issue session |

### Supporting modules

- `apps/api/src/tenant-admin/` — service, controller, seats, mailer, DTOs, utils
- `packages/shared/src/seats.ts` — plan limits and helpers
- `AuthService.issueTenantSessionFromMembership()` — post-accept session

### Audit actions

- `tenant.invitation_sent`
- `tenant.invitation_accepted`
- `tenant.invitation_expired`
- `tenant.user_disabled`
- `tenant.user_enabled`
- `tenant.role_changed`
- `tenant.department_created`
- `tenant.department_deleted`
- `tenant.seat_limit_reached`
- `tenant.user_removed`

---

## UI created

| Route / file | Purpose |
|--------------|---------|
| `/app/settings/admin` (`src/routes/app.settings.admin.tsx`) | Admin hub: Company, Workspace, Users, Departments, Seats, Invitations, Security, Audit |
| `/app/settings` | Link card for owners → admin settings |
| `/invite/:token` (`src/routes/invite.$token.tsx`) | Public accept flow (preview + password) |
| `src/lib/api/tenant-admin.ts` | Frontend API client |
| `src/lib/api/client.ts` | Exported `authFetch` for public invitation endpoints |

Access control: admin page gated to `TENANT_OWNER` / `TENANT_ADMIN` via session role.

---

## Security tests

**File:** `apps/api/test/tenant-admin.e2e-spec.ts`  
**CI:** `.github/workflows/ci.yml` runs `npm run test:security` (pattern: `tenant-isolation|tenant-admin`)

| Test | Verifies |
|------|----------|
| Invite accept flow | Membership created, tenant-scoped session |
| Member 403 | Non-admin cannot call tenant-admin |
| Self role elevation | User cannot patch own role |
| Dept admin → owner | Promotion to TENANT_OWNER rejected |
| Disabled user login | 401 after disable |
| Expired invitation | Preview returns 400 |
| Cross-tenant token | Preview scoped to correct tenant email |
| Seat limit (STARTER) | 6th invite returns 403 |

**Local verification:** Requires `DATABASE_URL`, `REDIS_URL`, and `AUTH_OTP_SECRET`. Run:

```bash
npm run stack:up          # postgres + redis
npm run db:migrate:deploy
npm run test:security
```

---

## Build verification

| Check | Result |
|-------|--------|
| `npm run db:generate` | Pass |
| `npm run build -w @velon/shared` | Pass |
| `npm run build -w @velon/api` | Pass |
| `npm run typecheck` (web) | Pass |

---

## Remaining risks / follow-ups

1. **SMTP in production** — Invitations log to console when SMTP is unset; configure `SMTP_*` / `APP_ORIGIN` for real email delivery.
2. **Department manager UI** — API supports `managerId` on create/update; admin UI does not yet expose manager picker.
3. **Cross-tenant accept hardening** — Preview test confirms token isolation; add explicit test that tenant A JWT cannot accept tenant B token if accept endpoint ever gains auth.
4. **Seat math on enable** — Re-enable checks seats; pending invites also reserve seats — document for support when troubleshooting “seat full” with no visible active users.
5. **TENANT_ADMIN vs TENANT_OWNER** — Both roles access admin API; product may want narrower TENANT_ADMIN permissions later.
6. **Local `.env`** — `VITE_API_URL` empty uses legacy Mongo path; set `VITE_API_URL=http://localhost:3001` for full API-backed local dev.

---

## Phase gate

With Phase 2D complete:

- Tenant companies can manage workforce, seats, departments, and permissions.
- Audit trail covers administration events.
- Security tests guard against common privilege and licensing bypasses.

**CRM module development is approved to begin.**
