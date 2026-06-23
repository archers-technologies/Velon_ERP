# Velon ERP — Phase 1 Platform Stabilization Report

**Date:** June 7, 2026  
**Scope:** Authentication, registration, MongoDB, sessions, routing, error handling, SSO, logging  
**Status:** Critical fixes applied — production verification checklist pending manual QA

---

## Executive Summary

A full codebase audit identified **dual-mode architecture** (TanStack demo stack + optional NestJS/Postgres API) with several production blockers: non-transactional registration, OTP bypass on API signup, session clearing on failed login, missing rate limiting, inconsistent API responses, and incomplete SSO exposed in UI.

This pass applies **root-cause fixes** across 20+ files. Feature development should remain frozen until the manual 20/20 QA checklist (Task 9) is executed in your target environment.

---

## Issues Found & Root Causes

### Task 1 — Authentication Audit

| Issue | Root Cause | Severity |
|-------|------------|----------|
| Failed login clears existing session | `apiLogin` used `apiFetch`, which on 401 triggers refresh + `clearSession()` | High |
| OTP verified in UI only; API signup unprotected | `POST /auth/signup` had no link to OTP verification | Critical |
| Tokens in localStorage (XSS) | Architectural choice; no HTTP-only cookies | Medium (documented risk) |
| Demo tokens pass `isAuthenticated()` without server validation | Demo mode by design | Low (dev only) |
| `@Throttle` inactive on auth routes | `ThrottlerGuard` not registered globally | High |
| Password reset / MFA not implemented | UI placeholders only | Medium |
| `JWT_REFRESH_SECRET` unused | Refresh tokens are opaque DB hashes, not JWTs | Low (ops confusion) |

### Task 2 — Registration Flow

| Issue | Root Cause | Severity |
|-------|------------|----------|
| Intermittent signup failures | Mongo OTP unreachable + non-transactional Postgres writes | Critical |
| Orphaned users on partial failure | `user.create` then `tenant.create` without `$transaction` | Critical |
| No Company/Workspace models | Prisma schema uses `Tenant` as company + workspace unit | Info |

### Task 3 — Database Stability

| Issue | Root Cause | Severity |
|-------|------------|----------|
| No Mongo indexes on `auth_otps` | Indexes never created | Medium |
| In-memory OTP fallback in multi-instance dev | Process-local Map when Mongo down | Medium (dev) |
| Singleton Mongo client | Already correct; connect promise deduplicated | OK |
| No Mongoose | Project uses native MongoDB driver | Info |

### Task 4 — Session Management

| Issue | Root Cause | Severity |
|-------|------------|----------|
| Expired session leaves user on protected route | `clearSession` without redirect | High |
| SSR/client guard race | `beforeLoad` skips SSR; brief unauthenticated render | Low |

### Task 5 — Routing Audit

| Route | Guard | Notes |
|-------|-------|-------|
| `/login` | `redirectIfWorkspaceAuthenticated` | OK |
| `/platform/login` | `redirectIfAdminAuthenticated` | OK |
| `/app/*` | `requireWorkspaceAccess` + `WorkspaceAuthGate` | OK |
| `/admin/*` | `requireAdminAccess` + `AdminAuthGate` | OK |
| `/owner/*` | **Not implemented** | N/A |

### Task 6 — Error Handling

| Issue | Root Cause |
|-------|------------|
| Nest returns `{ statusCode, message }` | Default Nest exception format |
| TanStack server fns throw `Error` strings | No unified envelope |
| Generic 500 messages | Unhandled exceptions |

### Task 7 — SSO

| Provider | Status |
|----------|--------|
| Microsoft Entra ID | UI-only; no OAuth backend |
| Google Workspace | UI-only; no OAuth backend |

**Action taken:** SSO buttons removed from workspace login UI.

### Task 8 — Logging

| Issue | Root Cause |
|-------|------------|
| Ad-hoc `console.*` only | No centralized logger |

---

## Fixes Applied

### Authentication & API Client

**Files:** `src/lib/api/client.ts`

- Added `authFetch()` for login/signup/refresh — **never clears session on 401**
- Added `unwrapApiResponse()` for `{ success, data }` envelope
- Session expiry now redirects to correct login portal (`/login` or `/platform/login`)
- `apiSignUp()` requires `verificationToken` from OTP step

### Transactional Registration + OTP Enforcement

**Files:**

- `apps/api/src/auth/auth.service.ts` — `prisma.$transaction()` for user + tenant + membership + refresh token
- `packages/shared/src/signup-verification.ts` — HMAC signup verification tokens
- `src/server/auth/signup-otp-store.ts` — issues token after OTP verify; Mongo indexes; prod secret requirement
- `apps/api/src/auth/dto/login.dto.ts` — `verificationToken` required on signup
- `src/routes/login.tsx` — passes token to API; SSO buttons removed

### API Response Standardization

**Files:**

- `apps/api/src/common/api-response.filter.ts` — `{ success: false, message }`
- `apps/api/src/common/api-response.interceptor.ts` — `{ success: true, data }`

### Rate Limiting

**Files:** `apps/api/src/app.module.ts` — global `ThrottlerGuard`

### Centralized Logging

**Files:**

- `src/server/logging.ts` — structured JSON logs for TanStack server
- `apps/api/src/common/logger.service.ts` — auth/DB/API failure logging
- `src/server/mongo/client.ts` — connection failure logging
- `src/erp/erp-functions.ts` — demo auth attempt logging

### Session & Route Guards

**Files:** `src/components/auth-gate.tsx` — gate waits for client auth check before rendering children

### MongoDB OTP Indexes

**Files:** `src/server/auth/signup-otp-store.ts`

- Unique index on `email`
- TTL index on `expiresAt`

### Environment

**Files:** `apps/api/src/config/env.ts` — `AUTH_OTP_SECRET` required (min 32 chars)

---

## Files Affected (Summary)

| Area | Files |
|------|-------|
| Shared | `packages/shared/src/signup-verification.ts`, `packages/shared/src/index.ts` |
| API | `auth.service.ts`, `auth.module.ts`, `login.dto.ts`, `env.ts`, `app.module.ts`, `common/*` |
| Web auth | `client.ts`, `session.ts`, `route-guard.ts`, `auth-gate.tsx`, `login.tsx`, `platform.login.tsx` |
| Server | `signup-otp-store.ts`, `mongo/client.ts`, `logging.ts`, `erp-functions.ts` |
| Config | `package.json` (added `@velon/shared` dep) |

---

## Remaining Risks

| Risk | Mitigation Needed |
|------|-------------------|
| **localStorage JWT storage** | Consider HTTP-only cookies for production hardening |
| **Password reset not implemented** | Build reset flow or remove "Forgot password" CTA |
| **MFA UI only** | Implement TOTP/WebAuthn or remove misleading copy |
| **`/owner/*` routes missing** | Implement when product defines owner role |
| **Demo mode fallback on API network error** | Dev-only; disable in production builds |
| **Demo signup creates tenant only** | No per-user demo accounts; acceptable for local demo |
| **Manual QA not run** | Execute Task 9 checklist (20/20 login/signup/OTP/logout) |
| **Prisma slug collision on concurrent signup** | Returns friendly conflict; could add retry with suffix |
| **Redis/Postgres required for API mode** | Document in deployment guide |

---

## Task 9 — Production Readiness Checklist

Run in your staging environment with `VITE_API_URL` set and Mongo/Postgres/Redis up:

```
[ ] Registration works 20/20 times
[ ] Login works 20/20 times
[ ] OTP works 20/20 times
[ ] Logout works 20/20 times
[ ] MongoDB remains connected
[ ] No route failures on direct URL + refresh
[ ] No authentication loops
[ ] No redirect loops
[ ] No orphaned users/tenants after failed signup
[ ] No silent failures (all errors show toast/message)
[ ] No console errors in browser
[ ] No server crashes under auth load
```

**Suggested test commands:**

```bash
npm run dev:all          # Web + API together
npm run mongo:ping       # Verify Mongo connectivity
curl http://localhost:3001/api/v1/health/ready
```

---

## Architecture Reference

```
Browser (localStorage JWT)
    │
    ├─ VITE_API_URL set ──► NestJS API (Postgres)
    │                         ├─ Transactional signup
    │                         ├─ OTP token verification
    │                         └─ Throttle + structured errors
    │
    └─ API off / dev fallback ──► TanStack server functions
                                    ├─ Mongo OTP store
                                    └─ In-memory demo store
```

---

## Conclusion

Phase 1 critical stabilization fixes are **implemented and compile cleanly** (`npm run build -w @velon/api`, `npm run typecheck`). The highest-severity registration and authentication gaps are addressed at the root cause level.

**Do not resume feature development** until Task 9 manual verification passes in your deployment environment.
