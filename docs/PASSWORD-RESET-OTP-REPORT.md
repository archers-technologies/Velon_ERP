# Password Reset OTP — Flow, Security & E2E Report

**Date:** 2026-06-07  
**Scope:** Replace email magic-link password reset with in-portal OTP flow  
**Verdict:** **READY** for workspace password recovery (demo/production pilot)

---

## 1. Password Reset Flow Report

### User journey (implemented)

| Step | Action | UI / API |
|------|--------|----------|
| 1 | User clicks **Forgot password?** on `/login` | Link → `/forgot-password` |
| 2 | Enter registered work email | Email step |
| 3 | Click **Send OTP** | `POST /auth/password-reset/request` |
| 4 | `info@velonerp.com` sends 6-digit code via SMTP | Same screen; no mail-app deep link |
| 5 | Enter OTP | OTP step |
| 6 | Click **Verify code** | `POST /auth/password-reset/verify-otp` |
| 7 | Enter **New passphrase** + **Confirm** | Password step (min 14 chars) |
| 8 | Click **Save password** | `POST /auth/password-reset/complete` |
| 9 | Redirect to Sign In | `/login?tab=signin&reset=success` |
| 10 | Success toast | “Password successfully updated. Please sign in.” |

### Copy changes

| Before | After |
|--------|-------|
| “Password reset is handled by your workspace administrator or Velon support.” | “Enter your work email and we'll send a verification code.” |
| “Send reset link” / magic-link email | “Send OTP” / 6-digit verification code email |
| `/reset-password?token=…` deep link page | Removed — flow stays on `/forgot-password` |

### Removed surfaces

- `GET /auth/password-reset/validate` (magic-link validation)
- `/reset-password` route
- `/account/freeze` route and `POST /auth/account/freeze` (email-link account freeze)
- MFA gate on reset completion (signup OTP pattern; MFA not expanded)

### Infrastructure reused

- **SMTP:** `sendTransactionalMail` → `info@velonerp.com`
- **Redis:** OTP storage (`velon:password-reset:otp:{email}`), single-use session (`velon:password-reset:session:{email}`)
- **OTP pattern:** Same as signup (`SignupOtpService`) — 6 digits, HMAC hash, 10 min TTL, 5 attempts
- **Verification token:** HMAC JWT-style token (`packages/shared/src/password-reset-verification.ts`)
- **Password policy:** `assertPasswordAllowed` — 14+ chars + HIBP breach check
- **Audit:** `auth.password_reset_requested`, `auth.password_reset_completed`
- **Sessions:** All refresh tokens revoked on completion

---

## 2. Security Validation Report

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| OTP expires after 10 minutes | **PASS** | Redis `EX 600` on OTP key |
| OTP single-use | **PASS** | Redis OTP key deleted on successful verify |
| Max 5 OTP attempts | **PASS** | `attempts` counter in Redis record |
| Rate limit reset requests | **PASS** | `@Throttle({ limit: 5, ttl: 60_000 })` on request |
| Prevent account enumeration | **PASS** | Same `PASSWORD_RESET_GENERIC_MESSAGE` for all emails |
| Audit reset request | **PASS** | `auth.password_reset_requested` (active users only) |
| Audit reset completion | **PASS** | `auth.password_reset_completed` |
| No email deep links | **PASS** | OTP only; confirmation email is notice-only |
| Password policy (14+ chars, HIBP) | **PASS** | `password-policy.util.ts` |
| Revoke refresh tokens | **PASS** | `refreshToken.updateMany({ revokedAt })` |
| Verification token single-use | **PASS** | Redis session hash deleted on complete |
| `devCode` hidden in production | **PASS** | Stripped in controller when `NODE_ENV=production` |

### Known residual gaps (unchanged from prior audit)

| Gap | Risk | Mitigation path |
|-----|------|-----------------|
| Access JWT valid ~15 min after reset | Medium | Shorten access TTL or maintain token blocklist |
| Login still accepts 8-char legacy passwords | Low | Force reset on next login for legacy accounts |
| Platform admin / invite flows may allow weaker passwords | Low | Align all password entry points with policy |

---

## 3. E2E Test Results

**Run:** 2026-06-07  
**Command:** `npx jest --testPathPattern='password-reset|auth-hardening'`

### `password-reset.e2e-spec.ts` — 2/2 PASS

| Test | Result |
|------|--------|
| Same generic message for unknown vs known email | PASS |
| Full OTP reset → login with new password | PASS |

### `auth-hardening.e2e-spec.ts` — 7/7 PASS

| Task | Test | Result |
|------|------|--------|
| 1 | Enumeration + OTP only for active accounts | PASS |
| 2 | Invalid OTP, replay, verification token replay | PASS |
| 2 | Lockout after 5 bad OTP attempts | PASS |
| 3 | Refresh revoked; access JWT until expiry (documented) | PASS |
| 4 | Short / breached passwords rejected | PASS |
| 5 | No `devCode` in production responses | PASS |
| 5 | No raw tokens in request response | PASS |

**Total:** 9/9 PASS for password-reset OTP suites

### API endpoints

```
POST /api/v1/auth/password-reset/request      { email }
POST /api/v1/auth/password-reset/verify-otp   { email, code }
POST /api/v1/auth/password-reset/complete     { email, verificationToken, password }
```

---

## Files changed (summary)

**Backend:** `password-reset.service.ts`, `auth.controller.ts`, `dto/password-reset.dto.ts`, `packages/shared/src/password-reset-verification.ts`

**Frontend:** `forgot-password.tsx`, `login.tsx`, `lib/api/password-reset.ts` — removed `reset-password.tsx`, `account.freeze.tsx`

**Tests:** `password-reset.e2e-spec.ts`, `auth-hardening.e2e-spec.ts`, `test/helpers/password-reset-otp.ts`
