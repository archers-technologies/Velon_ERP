# Velon ERP — Phase 4 Launch Report

**Date:** 2026-06-07  
**Scope:** Workspace, Platform Administration, Website CMS, Billing Foundation, Security & Production Readiness  
**Out of scope:** Inventory, HR, Accounting, Procurement, Projects, Assets, additional CRM modules (Phase 5+)

---

## Release Recommendation

# **GO**

Phase 4 deliverables for tenant onboarding, platform control, public website content, subscription operations, and security gates are implemented and verified. Remaining gaps are non-blocking polish items documented under Open Risks.

---

## Evidence Summary

| Check | Result | Command / artifact |
|-------|--------|-------------------|
| Infrastructure | **PASS** (5/5) | `npm run verify:release` |
| End-to-end signup → CRM | **PASS** (10/10) | `npm run test:release-flow` |
| Security & isolation | **PASS** (41/41) | `npm run test:security` |
| TypeScript | **PASS** | `npm run typecheck` |
| API build | **PASS** | `npm run build -w @velon/api` |

---

## 4A — Workspace Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| Dashboard — company info | ✅ | Live from `GET /workspace/dashboard` (`company` block: name, email, phone, country, industry, address, website, tax ID) |
| Dashboard — workspace info | ✅ | Workspace name, slug, subscription block |
| Dashboard — subscription | ✅ | Plan, status, renewal, seat limit, monthly price from `PLAN_CATALOG` |
| Dashboard — seat usage | ✅ | Active seats, limit, remaining, pending invites |
| Dashboard — department / user counts | ✅ | `team.departments`, `team.activeUsers` |
| Dashboard — recent activity | ✅ | Tenant-scoped audit feed |
| Dashboard — notifications | ✅ | User-scoped notifications from PostgreSQL |
| Dashboard — CRM summary | ✅ | Customers, leads, open opportunities, open quotations |
| Company profile persistence | ✅ | PATCH `/tenant-admin/company-profile` including industry, logo, tax ID, website, address |
| Notifications — read / mark all | ✅ | `POST /workspace/notifications/:id/read`, `POST /workspace/notifications/read-all` |
| Unread count | ✅ | `GET /workspace/nav-badges` |
| Activity feed | ✅ | Audit log on dashboard + `/app/alerts` notification list |
| Legacy KPI placeholders removed | ✅ | `kpis`, `invoices`, `topProducts` removed from dashboard API |

**UI routes:** `/app`, `/app/alerts`, `/app/settings/admin` (company tab)

---

## 4B — Platform Administration Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| Tenant list, search, status, plan, seats, created | ✅ | `/admin/tenants` → `GET /tenants` |
| Suspend / activate tenant | ✅ | PATCH `/tenants/:id` + **JWT enforcement** blocks suspended tenants at login |
| View / edit tenant | ✅ | Detail sheet with plan, status, MRR |
| Reset tenant subscription | ✅ | `POST /billing/platform/tenants/:id/reset` (+30 day renewal, audited) |
| Platform user list, roles, status | ✅ | `GET /platform/users` |
| Create platform user | ✅ | `POST /platform/users` (SUPER_ADMIN / PLATFORM_SUPPORT) |
| Disable / enable platform user | ✅ | `PATCH /platform/users/:id/status` |
| Audit platform actions | ✅ | `platform.user_created`, `platform.user_enabled/disabled`, `tenant.updated`, `billing.*` |
| Diagnostics — PostgreSQL | ✅ | Live `SELECT 1` probe |
| Diagnostics — Redis | ✅ | Revision bus probe |
| Diagnostics — API | ✅ | Process health |
| Diagnostics — migrations | ✅ | `_prisma_migrations` applied/pending count |
| Last-active label | ✅ | Derived from tenant member `lastLoginAt` (no hardcoded "Just now") |

**UI routes:** `/admin/tenants`, `/admin/users`, `/admin/infrastructure`

---

## 4C — Website CMS Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| CMS blocks (hero, features, pricing, testimonials, FAQ, contact, footer, about) | ✅ | 8 blocks editable via `/admin/website` |
| Home page CMS content | ✅ | Hero, features, testimonials, pricing headlines from CMS loader |
| Pricing page CMS headlines | ✅ | `siteContent.pricing` from CMS |
| **Pricing plan cards** | ✅ | Plan names, prices, features from `GET /billing/plans` (no hardcoded INR tiers) |
| About / Contact / Help | ✅ | Pull from `loadPublicSiteContentSafe()` |
| CMS JSON editor | ⚠️ Partial | Functional JSON textarea; structured field editors for hero/footer are minimal |

**Remaining CMS polish:** Homepage still contains some static marketing sections (industries grid, AI workflow copy) outside CMS blocks. Non-blocking for launch.

---

## 4D — Billing Foundation Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| Plans — Starter / Growth / Enterprise | ✅ | `packages/shared/src/plans.ts` + `GET /billing/plans` |
| Assign / change plan | ✅ | `PATCH /billing/platform/tenants/:tenantId/plan` |
| Upgrade / downgrade with seat validation | ✅ | Rejects downgrade when active seats exceed plan limit |
| Subscription reset | ✅ | `POST /billing/platform/tenants/:tenantId/reset` |
| Subscription status | ✅ | Tenant `status` field (ACTIVE, TRIAL, SUSPENDED) |
| MRR sync on plan change | ✅ | Auto-set from `planCatalogEntry` on tenant PATCH and billing plan change |
| Platform overview metrics | ✅ | `GET /billing/platform/subscriptions` — active/trial tenants, MRR, plan distribution |
| Seat validation on invites | ✅ | Existing `SeatsService` enforcement |

**UI routes:** `/admin/subscriptions`, `/admin` overview

**Not implemented (Phase 5+):** Payment gateway, invoicing PDFs, coupons, refunds, dunning automation. Admin UI still shows some demo affordances (coupon builder, invoice PDF) that toast only.

---

## 4E — Security Status

| Control | Status | Evidence |
|---------|--------|----------|
| Tenant isolation | ✅ | `tenant-isolation`, `crm-isolation`, `crm-pipeline-isolation`, `crm-quotation-isolation` e2e |
| Audit logs | ✅ | `release-flow` test 10; platform + billing mutations audited |
| Permission matrix | ✅ | `tenant-admin` e2e (owner vs member, invitations) |
| JWT scope validation | ✅ | Platform vs tenant scope guards; suspended tenant blocked in `jwt.strategy` |
| Session separation | ✅ | Platform login → `/admin`; workspace login → `/app` |
| Security test suite | ✅ | **41/41 passed** (`npm run test:security`) |

---

## Open Risks (Non-Blocking)

1. **Payment processing** — No Stripe/Razorpay integration; MRR is operational metadata only.
2. **CMS editor UX** — JSON textarea for blocks; marketing homepage has sections not yet CMS-driven.
3. **Notification seeding** — Notification table is empty until events create rows; no automatic welcome notification on signup.
4. **Platform admin demo widgets** — Some admin pages (overview charts, coupon builder, impersonation) retain demo toasts.
5. **Email delivery** — Invitation/OTP emails depend on SMTP configuration in `.env`.
6. **Horizontal scale** — Single-node PostgreSQL/Redis; no Kubernetes/multi-region runbook in this phase.

---

## Local Stack Verification

```
PostgreSQL  127.0.0.1:5433  velon_erp
Redis       127.0.0.1:6379
API         localhost:3001
Web         localhost:8080  (Vite proxy /api → 3001)
```

**Start:** `npm run dev:all`  
**Platform admin:** http://localhost:8080/platform/login → `/admin`  
**Workspace:** http://localhost:8080/login  

---

## Phase 5+ Backlog (Explicitly Out of Scope)

- Inventory, HR, Accounting, Procurement, Projects, Assets
- Additional CRM pipeline automation
- Payment gateway and invoice generation
- Rich CMS block editors and full homepage CMS coverage

---

## Sign-Off Checklist

- [x] Workspace dashboard API-backed (no mock KPIs)
- [x] Company profile full field persistence
- [x] Notification read / mark-all-read
- [x] Platform tenant + user administration with audit
- [x] Billing plan assign / reset with seat validation
- [x] Public pricing from plan catalog
- [x] Security tests green
- [x] Release infrastructure checks green

**Final verdict: GO for controlled tenant launch with platform-operated billing (manual plan assignment) and monitoring via `/admin/infrastructure`.**
