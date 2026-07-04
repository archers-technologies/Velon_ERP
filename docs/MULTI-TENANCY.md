# Multi-tenancy model

**Audience:** Engineers  
**Last updated:** July 2026

## Core entities

| Entity | Role |
|--------|------|
| **Tenant** | Billing and legal customer; plan, status, health, isolation flags |
| **Workspace** | Operational environment (currency, timezone, locale, slug) |
| **CompanyProfile** | Legal name, tax ID, logo, address for documents |
| **TenantMembership** | User ↔ tenant link with role and optional department |
| **Department** | Optional org structure within a tenant |
| **Subscription** | Trial / active / past-due / suspended / cancelled lifecycle |

At launch: **one tenant = one workspace = one company profile**.

## Isolation rules

1. **JWT carries `tenantId`** for tenant-scoped sessions. Clients must not supply tenant identity for authorization.
2. **`TenantScopedRepository`** injects `tenantId` into every `where` clause from async local storage (`apps/api/src/common/repositories/tenant-scoped.repository.ts`).
3. **E2E security suites** assert cross-tenant reads/writes fail for CRM, inventory, quotations, tenant-admin, and related modules.
4. **Demo / seed data** is tagged with `seedSource` (`demo`, `e2e`, `seed`) and excluded from production platform lists via `@velon/shared` helpers (`productionTenantWhere`, `isDemoSeedSource`).

## Tenant lifecycle

Statuses: `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`. Platform billing endpoints can activate, suspend, extend trial, and reset tenants. Soft-delete uses `deletedAt` on `Tenant`.

## Seat limits

Seat limits are plan-driven (`SEAT_LIMITS` in `@velon/shared`). Tenant-admin invitations and member management enforce remaining seats.

## Related docs

- [Architecture](./ARCHITECTURE.md)
- [Authentication](./AUTHENTICATION.md)
- [Data model](./DATA-MODEL.md)
- [Security](./SECURITY.md)
