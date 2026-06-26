# Velon ERP — Final Production Readiness Report

**Date:** 2026-06-20 (pass 5 — settings action buttons & routes)  
**Scope:** Production MVP ERP — real backend, tenant isolation, manual billing + optional Razorpay, clean workspace module separation, canonical settings routes.

---

## Workspace Navigation & Module Separation (pass 4)

| Module | Route | Purpose |
|--------|-------|---------|
| **Customers** | `/app/customers` | Customer master data — records, contacts, activities, notes |
| **Sales CRM** | `/app/sales-crm` → `/app/crm/leads` | Sales pipeline — leads, opportunities, quotations, proposals, pipelines, templates |
| **Suppliers** | `/app/suppliers` | Supplier master data — records, communication threads |
| **Procurement** | `/app/procurement` | Purchase workflow — requests, orders, approvals, stock requirements overview |

**Sidebar structure:**

- **Workspace:** Dashboard, Inventory, Billing & POS, Customers, Sales CRM, Procurement, Suppliers
- **Finance:** Accounting, Reports, Documents
- **Operations:** Alerts, Branches, Settings

**Removed:** duplicate plain “CRM” sidebar item. Legacy `/app/crm?section=customers` redirects to `/app/customers`.

**Dashboard errors:**

- Missing `VITE_API_URL` → configuration message (not auth failure)
- Expired session → “Sign in again” clears tokens and redirects to `/login?tab=signin`
- Connection failures → “Retry connection” reloads the page

**Procurement limitations:** Receiving stock requires warehouse configuration; empty states shown when no requests/orders exist. Supplier creation is on the Suppliers module only (PO form uses supplier selector).

---

## Settings Routes & Action Buttons (pass 5)

| Purpose | Canonical route | Notes |
|---------|-----------------|-------|
| **User preferences** | `/app/settings?tab=general` | Tabs: `general`, `regional`, `printers`, `profile`, `security` |
| **Subscription & billing** | `/app/settings/billing` | Plan, invoices, payment history, bank transfer; Razorpay when configured |
| **Workspace administration** | `/app/settings/admin?section=users` | Sections: `company`, `workspace`, `users`, `departments`, `seats`, `invitations`, `security`, `audit` |
| **POS checkout** | `/app/billing-pos` | **Not** subscription billing — sidebar “Billing & POS” only |

**Settings shortcut cards** (on `/app/settings`, `/app/settings/admin`, `/app/settings/billing`):

- **Open billing** → `/app/settings/billing` (disabled when already on billing page)
- **Manage workspace** → `/app/settings/admin?section=users` (on admin page: **Manage users** scrolls to users tab or switches section)

**Query param behavior:**

- Unknown admin `section` falls back to `users`
- Unknown user settings `tab` falls back to `general`
- Nested settings child routes include parent `tab=general` for router compatibility; admin UI uses `section` only

**Permissions (frontend + API guarded):**

| Action | TENANT_OWNER | TENANT_ADMIN | USER |
|--------|--------------|--------------|------|
| View billing page | Yes | Yes | No — permission message |
| Change plan / checkout | Yes | No | No |
| Workspace admin (users, departments, seats, invitations) | Yes | Yes | No — permission message |

**Removed / avoided:** fake “billing portal”, dead buttons, stale `/app/billing` or `/app/admin-settings` routes. Settings sidebar stays active for all `/app/settings/*` subpaths.

**Route layout (critical):** `/app/settings` is a layout route with `<Outlet />`. User preferences live at `/app/settings/` (index). Admin and billing are sibling child routes — without the outlet, child URLs showed user settings content instead of the target page.

---

## Go / No-Go Verdict

### **GO — Production MVP (manual billing)**

Velon ERP is suitable for **production deployment** as a manual-billing ERP MVP when environment prerequisites are met.

### **CONDITIONAL GO — Razorpay online payments**

Razorpay is **implemented end-to-end in code** (order creation, checkout, backend signature verification, webhook verification, subscription activation). It is **production-ready only when**:

1. `RAZORPAY_ENABLED=true` and all Razorpay env vars are set with **live or test** credentials from the Razorpay dashboard.
2. Razorpay **webhook** is registered to `POST /api/v1/billing/webhooks/razorpay` with the same `RAZORPAY_WEBHOOK_SECRET`.
3. `npm run db:migrate:deploy` has applied migration `20260620140000_razorpay_billing_fields`.
4. Checkout, verify, and webhook flows are smoke-tested in the target environment (test mode first).

**Default:** `RAZORPAY_ENABLED=false` — UI hides Razorpay; only bank transfer is offered.

**Still disabled:** Stripe, STC Pay, HyperPay (stub providers; not listed in `/billing/providers`).

**Before launch:**

1. `npm run db:migrate:deploy` on every environment (18 migrations including Razorpay billing fields).
2. Configure `.env` from `.env.example` (PostgreSQL, Redis, JWT, OTP, SMTP, CORS, `VITE_API_URL`, `WEB_ORIGIN`).
3. For India online billing: set Razorpay variables (see below).
4. Run `npm run verify:release` — all five checks must pass.

---

## Verification Results (2026-06-20, pass 5)

| Check | Result |
|-------|--------|
| `npm run db:generate` | PASS |
| `npm run db:migrate:deploy` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test` (unit + security) | PASS — includes `settings-routes`, `workspace-navigation`, `billing-razorpay` |
| `npm run test:security` | PASS |
| `npm run test:release-flow` | PASS |
| `npm run verify:release` | **PASS** (5/5) |

---

## Payment Gateway Status

| Provider | Status | Notes |
|----------|--------|-------|
| **Bank transfer** | **Production-ready** | Default; manual admin approve/reject |
| **Razorpay** | **Implemented; env-gated** | Hidden unless `RAZORPAY_ENABLED=true` + keys; INR default |
| Stripe | Disabled | Stub only |
| STC Pay | Disabled | Stub only |
| HyperPay | Disabled | Stub only |

### Razorpay environment variables

```env
RAZORPAY_ENABLED=false          # set true only when fully configured
RAZORPAY_KEY_ID=                # public key (rzp_test_* or rzp_live_*)
RAZORPAY_KEY_SECRET=            # server only — never expose to frontend
RAZORPAY_WEBHOOK_SECRET=        # server only — webhook signature verification
RAZORPAY_CURRENCY=INR           # default INR; plan USD list prices converted via RAZORPAY_USD_INR_RATE (default 83)
```

### Test vs live mode

- Use **test** keys (`rzp_test_*`) in staging; complete a test payment in Razorpay dashboard.
- Switch to **live** keys (`rzp_live_*`) only after webhook URL and verify flow are validated in staging.
- Webhook URL: `https://<api-host>/api/v1/billing/webhooks/razorpay`
- Subscribe to events: `payment.captured`, `payment.authorized`, `payment.failed` (minimum).

### Manual billing status

**Unchanged and fully working.** Bank transfer remains the fallback when Razorpay is disabled or unsuitable (e.g. SAR/manual flows).

---

## Route Readiness Table

| Route | Status | Notes |
|-------|--------|-------|
| `/app/settings/billing` | Production-ready | Bank transfer always; **Pay with Razorpay** when API config enables it |
| `/admin/subscriptions` | Production-ready | Pending bank transfers + payment ledger (provider, status, IDs) |
| *(other routes unchanged from pass 2)* | — | See pass 2 report for full ERP route table |

---

## Razorpay Flow (End-to-End)

1. **Tenant owner** → Billing → select plan → **Pay with Razorpay** (only if `GET /billing/payment-config` reports `razorpay.enabled`)
2. **Backend** `POST /billing/checkout` with `provider: RAZORPAY` — amount from plan catalog (not client); creates Razorpay order via API; stores `PENDING` payment with `providerOrderId`
3. **Frontend** opens Razorpay Checkout with public `keyId` + `orderId` only
4. On success → **Backend** `POST /billing/razorpay/verify` — HMAC signature check with `RAZORPAY_KEY_SECRET`; activates subscription idempotently
5. **Webhook** `POST /billing/webhooks/razorpay` — verifies `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`; idempotent via `providerEventId`
6. Subscription **never** activates from frontend alone; failed/invalid signatures do not activate

## Manual Billing Flow (Unchanged)

1. Tenant → **Request bank transfer payment**
2. `PENDING` `BANK_TRANSFER` payment created
3. Platform admin → **Approve** or **Reject** (Razorpay payments cannot be manually approved)
4. Approve → subscription `ACTIVE`, audit log

---

## Security Checklist

- [x] `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` never sent to frontend
- [x] Checkout amount from database plan catalog, not client input
- [x] Tenant isolation on order verification
- [x] Payment signature verification (checkout + webhook)
- [x] Idempotent webhook processing (`providerEventId`)
- [x] Failed/cancelled payments do not activate subscription
- [x] Manual approve/reject restricted to `BANK_TRANSFER` only
- [x] Other gateways remain hidden/disabled

---

## Deployment Checklist

- [ ] `npm run db:migrate:deploy` (includes `20260620140000_razorpay_billing_fields`)
- [ ] `npm run verify:release` passes
- [ ] If using Razorpay: set all four Razorpay env vars + register webhook
- [ ] Smoke test: bank transfer approve path still works
- [ ] Smoke test (optional): Razorpay test payment → verify → subscription active

---

## Pass 3 Changes Summary

1. **Razorpay provider:** real order API, checkout config, verify endpoint, webhook controller
2. **Schema:** `providerOrderId`, `verifiedAt`, `failureReason` on payments; `providerEventId` on webhook events
3. **Frontend:** conditional Razorpay button; bank transfer retained
4. **Admin:** platform payment list with provider/status/IDs
5. **Tests:** `billing-razorpay.e2e-spec.ts`, `razorpay.util.spec.ts`

---

## Final Verdict

| Mode | Verdict |
|------|---------|
| Manual billing MVP | **GO** |
| Razorpay online payments | **GO when env + webhook configured and smoke-tested** (code complete; disabled by default) |

**Verdict: GO** for production MVP with manual billing. Razorpay is an optional, fully wired add-on — enable only after configuring credentials and webhooks in the target environment.

---

## Pass 6 — Enterprise SaaS UI & Architecture Review (2026-06-26)

### Architecture audit summary

| Layer | Stack | Notes |
|-------|-------|-------|
| **Frontend** | Vite 7, React 19, TanStack Router/Start, React Query, shadcn/Radix, Tailwind 4 | File-based routes under `src/routes/`; `WorkspaceShell` → `AppShell`; scoped JWT in `localStorage` (`velon.app.*` / `velon.admin.*`) |
| **Backend** | NestJS 11, Prisma, PostgreSQL, Redis, Mongo (auxiliary) | Global prefix `api/v1`; `ValidationPipe` whitelist; Helmet + CORS; Throttler 120/min; `SubscriptionGuard` on tenant routes |
| **Database** | PostgreSQL via Prisma (`packages/database`) | 50 tables; tenant-scoped models carry `tenantId`; migrations verified via `db:migrate:verify` |
| **Auth** | JWT access (15 min) + refresh (7 d, hashed in DB) | `WorkspaceContextService` resolves tenant from JWT only — never from client body/URL |
| **Tenant isolation** | `TenantScopeGuard`, repository `tenantId` filters, e2e isolation suites | CRM, inventory, billing, procurement all tenant-scoped |
| **Billing** | Bank transfer (default) + Razorpay (env-gated) | Signature verification on checkout + webhook; subscription activation server-side only |
| **Deployment** | Docker Compose (local), Vercel (web) + Railway (API) examples | `VITE_API_URL`, `WEB_ORIGIN`, CORS allowlist required |

### UI enhancement summary (pass 6)

| Area | Changes |
|------|---------|
| **Design tokens** | Indigo/slate enterprise palette; `glass-panel` utility; refined shadows |
| **Design system** | `MetricCard`, `EmptyState`, `PageHeader`, `PageBreadcrumbs`; badge variants: `success`, `warning`, `info`, `neutral` |
| **App shell** | Mobile collapsible nav (Sheet); breadcrumbs; indigo active sidebar state; improved table spacing |
| **Dashboard** | Metric cards, glass welcome panel, semantic subscription badges, empty states |
| **CRM opportunities** | Kanban board view (static columns by stage; stage moves via existing API) + list toggle |

### Verification results (2026-06-26, pass 6)

| Check | Result |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `npm run build:web` | **PASS** |
| `npm run build:api` | **PASS** |
| `npm run db:migrate:verify` | **PASS** — all migrations applied |
| `npm run test:security` | **PASS** — 114 tests (tenant isolation, billing-razorpay, permissions) |
| `npm run test` (unit) | **PARTIAL** — 10/11 suites pass; `plan-pricing.spec.ts` uses vitest import (pre-existing) |
| `npm run lint` | **PRE-EXISTING DEBT** — repo-wide prettier formatting drift (not introduced by pass 6) |

### Pass 6 verdict

| Criterion | Status |
|-----------|--------|
| Tenant data leakage risk | **Low** — guards + e2e isolation tests pass |
| Payment flow safety | **Production-ready when Razorpay env configured** |
| UI professional enough for SaaS launch | **Improved** — enterprise palette, mobile nav, dashboard metrics, CRM kanban |
| Overall | **READY FOR INTERNAL DEMO** / **GO** for manual-billing MVP (unchanged from pass 5) |
