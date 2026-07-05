# Authentication and authorization

**Audience:** Engineers  
**Last updated:** July 2026

## Auth flows

| Flow | Endpoints | Notes |
|------|-----------|-------|
| Login | `POST /api/v1/auth/login` | Returns access + refresh tokens |
| Refresh | `POST /api/v1/auth/refresh` | Rotates refresh token |
| Logout | `POST /api/v1/auth/logout` | Revokes refresh token |
| Signup OTP | `signup/request-otp` → `verify-otp` → `signup` | Creates tenant + owner membership |
| Password reset | `password-reset/request` → `verify-otp` → `complete` | OTP codes omitted from responses in production |
| Change password | `POST /api/v1/auth/change-password` | Authenticated |

Password policy is shared (`PASSWORD_MIN_LENGTH`, `PASSWORD_RULES` in `@velon/shared`).

## JWT payload

```ts
type JwtPayload = {
  sub: string;           // user id
  email: string;
  scope: "platform" | "tenant";
  role: VelonRole;
  tenantId?: string;
  workspaceId?: string;
  membershipId?: string;
};
```

## Roles

| Role | Scope | Typical use |
|------|-------|-------------|
| `SUPER_ADMIN` | platform | Full platform control |
| `PLATFORM_SUPPORT` | platform | Read/update tenants, audit |
| `TENANT_OWNER` | tenant | Full workspace + billing |
| `TENANT_ADMIN` | tenant | Full workspace + billing |
| `DEPARTMENT_ADMIN` | tenant | Department-scoped write |
| `USER` / `TENANT_USER` | tenant | Limited read/write |

Permissions are declared in `ROLE_PERMISSIONS` (`packages/shared-kernel/src/index.ts`) using strings such as `crm:*`, `inventory:read`, `users:invite`. Wildcard matching supports `module:*` prefixes.

Workspace UI exposes **role presets** (Owner, Admin, Manager, Accountant, Sales, Inventory, Viewer) mapped to backend roles for invitations (`packages/shared-kernel/src/role-presets.ts`).

## Guards (NestJS)

| Guard | Purpose |
|-------|---------|
| `JwtAuthGuard` | Require valid access token |
| `PlatformScopeGuard` | Platform-only routes |
| `TenantScopeGuard` / portal scope | Tenant-only routes |
| `RolesGuard` | Role allow-list |
| `PermissionGuard` | Permission string checks |
| `SubscriptionGuard` | Global subscription access policy |
| `ThrottlerGuard` | Rate limits |

Decorators: `@CurrentUser()`, `@CurrentTenant()`, `@RequirePermission()`, `@Roles()`, portal-scope markers.

## Portal routing (web)

Super-admin credentials route to `/admin`. Tenant users route to `/app`. Portal access helpers live under `frontend/src/lib/auth/`.

## Tech used in this category

Passport JWT, bcrypt, otplib, Nest guards, Redis for OTP, PostgreSQL for refresh tokens. Full list: [Tech stack — Authentication and security](./TECH-STACK.md#6-authentication-and-security-stack).

## Related docs

- [Multi-tenancy](./MULTI-TENANCY.md)
- [Security](./SECURITY.md)
- [Shared package](./SHARED-PACKAGE.md)
- [API reference](./API-REFERENCE.md)
