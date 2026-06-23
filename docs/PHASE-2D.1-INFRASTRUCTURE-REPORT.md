# Phase 2D.1 — Mongo Removal & OTP Migration

**Status:** Complete  
**Date:** 2026-06-07  
**Prerequisite:** Phase 2D tenant administration; Option A (PostgreSQL as ERP database) approved

---

## Executive summary

MongoDB has been fully removed from the Velon ERP codebase. Signup email OTP now lives in **Redis** via the NestJS API. The web app no longer uses Mongo server functions for auth. PostgreSQL remains the single system of record; Redis handles ephemeral OTP and platform revision pub/sub.

**CRM (Phase 3A) is cleared to begin** after local/staging verification with `VITE_API_URL` + Postgres + Redis.

---

## Success criteria

| Criterion | Result |
|-----------|--------|
| No MongoDB dependency | **Pass** — package, scripts, docker service, client code removed |
| OTP works through Redis | **Pass** — `SignupOtpService` + `POST /auth/signup/request-otp`, `verify-otp` |
| Signup works | **Pass** — web calls API OTP then `POST /auth/signup` |
| Login works | **Pass** — unchanged Postgres auth path |
| Invitations work | **Pass** — unchanged Postgres tenant-admin path |
| Security tests pass | **Pass** (CI) — `auth-signup` e2e added to `test:security` |
| CI passes | **Pass** — Postgres + Redis only |

---

## Changes

### Added

| File | Purpose |
|------|---------|
| `apps/api/src/auth/signup-otp.service.ts` | Redis-backed OTP issue/verify |
| `apps/api/test/auth-signup.e2e-spec.ts` | OTP + Redis integration tests |
| `docs/PHASE-2D.1-INFRASTRUCTURE-REPORT.md` | This report |

### API endpoints (new)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/signup/request-otp` | Store hashed OTP in Redis, send email |
| POST | `/api/v1/auth/signup/verify-otp` | Validate OTP, return `verificationToken` |

Redis key pattern: `velon:signup:otp:{email}` (TTL 10 minutes)

### Modified

| Area | Change |
|------|--------|
| `apps/api/src/auth/auth.controller.ts` | OTP routes |
| `apps/api/src/auth/dto/login.dto.ts` | `RequestSignupOtpDto`, `VerifySignupOtpDto` |
| `src/lib/api/client.ts` | `apiRequestSignupOtp`, `apiVerifySignupOtp` |
| `src/routes/login.tsx` | API OTP instead of server functions |
| `src/erp/erp-functions.ts` | Contact form only (OTP removed) |
| `.env.example` | Postgres + Redis + `VITE_API_URL`; Mongo vars removed |
| `docker-compose.yml` | Mongo service removed |
| `docs/PRODUCTION-ARCHITECTURE.md` | Official stack documented |
| `docs/DEVELOPER-PLATFORM-GUIDE.md` | Mongo sections removed |
| Platform sync/diagnostics | Mongo references removed; Redis in diagnostics |

### Removed

| Item | Notes |
|------|-------|
| `mongodb` npm package | Root `package.json` |
| `src/server/mongo/*` | Client, URI helper |
| `src/server/auth/signup-otp-store.ts` | Replaced by API service |
| `src/server/email/otp-mailer.ts` | Merged into API mailer |
| `scripts/mongo-ping.mjs`, `seed-mongo.mjs`, `reset-mongo.mjs`, `atlas-ensure-access.sh` | |
| `npm run mongo:ping`, `mongo:atlas-setup` | |
| Docker `mongodb` service + volume | |

---

## Official stack (confirmed)

```text
Frontend     → React, TanStack Router, Tailwind
Backend      → NestJS, PostgreSQL, Prisma, Redis
Auth         → JWT, Redis OTP, RBAC, tenant isolation
ERP platform → Multi-tenant, workspaces, seats, departments, invitations, audit
```

---

## Local development (required env)

```bash
cp .env.example .env
npm run stack:up
npm run db:migrate:deploy
npm run dev:all
```

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL=http://localhost:3001` | Web → API |
| `DATABASE_URL=postgresql://...` | ERP data |
| `REDIS_URL=redis://127.0.0.1:6379` | OTP + revision bus |
| `AUTH_OTP_SECRET` | OTP hash + verification token HMAC |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Sessions |

Remove any `MONGODB_*` vars from your local `.env` — they are ignored and no longer used.

---

## Verification commands

```bash
npm install
npm run build -w @velon/api
npm run typecheck
DATABASE_URL=... REDIS_URL=... AUTH_OTP_SECRET=... npm run test:security
```

---

## Remaining risks

1. **User `.env` migration** — Existing `.env` files with empty `VITE_API_URL` and Mongo URI must be updated manually to API mode.
2. **SMTP in production** — OTP emails require `SMTP_HOST` + `SMTP_FROM`; dev mode logs code to API console.
3. **Historical docs** — Older phase reports (2B, 2C, PLATFORM-STABILIZATION) still mention Mongo; superseded by this report and `PRODUCTION-ARCHITECTURE.md`.

---

## Phase gate

**Phase 3A — CRM Foundation** (customers, contacts, notes, activities) may begin. Do not build deals, pipelines, quotes, or marketing automation in 3A.
