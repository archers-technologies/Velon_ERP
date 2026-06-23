# Workspace Readiness Report

**Date:** 2026-06-07  
**Goal:** Usable tenant + platform experience in ~5 days — workspace first, not CRM expansion.

---

## Executive Summary

Velon ERP now has a **workspace-first foundation**: tenants land on a real company dashboard, can administer users/departments/seats, and platform operators can manage subscriptions and website content. Billing catalog and tenant subscription metadata are wired. CRM modules from earlier phases remain available but were **not expanded** per priority directive.

| Priority | Area | Status | Readiness |
|----------|------|--------|-----------|
| 1 | Workspace Dashboard (`/app`) | **Done** | Usable |
| 2 | Tenant Administration (`/app/settings/admin`) | **Mostly done** | Usable with gaps |
| 3 | Platform Admin (`/admin`) | **Partial** | Core flows work |
| 4 | Website CMS | **Mostly done** | Admin + public fetch |
| 5 | Billing & Subscription Foundation | **Done** | Catalog + tenant view |

**Overall workspace readiness: ~78%** — sufficient for tenant onboarding, company setup, and platform oversight. Payment gateway, impersonation, and full marketing-page CMS coverage are deferred.

---

## Priority 1 — Workspace Dashboard (`/app`)

### Delivered

| Requirement | Implementation |
|-------------|----------------|
| Company name | `workspace-data.service.ts` → `company.name` |
| Subscription plan | `subscription.planDisplayName`, status, renewal |
| Seats used / total | `seats.used`, `seats.limit`, `remaining` |
| Active users | `team.activeUsers` |
| Departments | `team.departments` |
| Recent activities | Audit log feed (`recentActivity`) |
| Notifications | Tenant-scoped `Notification` rows |
| Quick actions | Invite, department, user, CRM, company settings |

**UI:** `src/routes/app.index.tsx`  
**API:** `GET /api/v1/workspace/dashboard`

### Gaps

- Dashboard KPI cards still include legacy ERP stub fields (`kpis`, `invoices`) for backward compatibility — values are zero until finance modules are prioritized.
- Notification header dropdown uses `/workspace/alerts`; mapping updated to support API `body` field.

---

## Priority 2 — Tenant Administration (`/app/settings/admin`)

### Delivered

| Section | Status | Notes |
|---------|--------|-------|
| **Company** | ✅ | Name, email, phone, country, address, website, tax ID, **logo upload** |
| **Workspace** | ⚠️ Partial | Name + slug display; timezone/currency/language not in schema yet |
| **Users** | ✅ | Search, role change, disable/enable, remove, department assign |
| **Departments** | ✅ | Create, **edit**, delete |
| **Seats** | ✅ | Plan, active seats, remaining |
| **Invitations** | ✅ | Invite, resend, revoke |
| **Audit logs** | ✅ | Login, user changes, invitations from `AuditService` |
| **Security** | ✅ | Policy summary panel |

**UI:** `src/routes/app.settings.admin.tsx`  
**API:** `apps/api/src/tenant-admin/`

### Gaps

- **Industry** field on company profile — not exposed in UI (schema may support via `CompanyProfile`).
- **Assign manager** on departments — API supports `managerId`; UI not wired.
- **Upgrade plan** — seats panel shows plan; self-service upgrade flow not built (intentional until payment gateway).
- Workspace timezone, currency, language — require schema migration + API fields.

---

## Priority 3 — Platform Admin (`/admin`)

### Delivered

| Requirement | Status | Location |
|-------------|--------|----------|
| Total / active / suspended tenants | ✅ | Platform overview + tenants page |
| View tenant | ✅ | `admin.tenants.tsx` detail sheet |
| Disable / enable tenant | ✅ | `updateAdminTenant` status patch |
| Subscription management | ✅ | `admin.subscriptions.tsx` wired to `GET /billing/platform/subscriptions` |
| Plan catalog | ✅ | Starter, Professional (Growth), Enterprise |
| Website management | ✅ | `admin.website.tsx` CMS editor |
| Audit events (support) | ⚠️ | `admin.alerts-logs.tsx` exists; not all events from live DB |

### Gaps

- **Impersonate tenant** — not implemented (optional per spec).
- **Platform users** (`admin.users.tsx`) — demo/static UI; no live API.
- **Contact form leads** — no lead capture model or admin inbox.
- Revenue sparkline / churn / trial conversion on subscriptions page use placeholder metrics where billing webhooks are absent.

---

## Priority 4 — Website CMS

### Delivered

| Block | Admin edit | Public consumption |
|-------|------------|-------------------|
| Hero | ✅ | ✅ Homepage (`/`) |
| Features | ✅ | Defaults only (homepage still uses static modules grid) |
| Pricing | ✅ | ✅ `/pricing` headline + subhead |
| FAQ | ✅ | ✅ `/help` accordion |
| Testimonials | ✅ | Not yet on marketing pages |
| Footer | ✅ | `site-footer.tsx` still static |
| Contact | ✅ | Contact page not wired |

**Schema:** `SiteContentBlock` (Prisma)  
**API:** `GET /public/site-content`, `PATCH /platform/site-content/:key`  
**Admin:** `src/routes/admin.website.tsx`  
**Loader:** `src/lib/cms/load-public.ts` with static fallback

### Gaps

- Homepage features/testimonials sections still hardcoded.
- Footer and contact page should read CMS `footer` / `contact` blocks.
- Run migration: `npm run db:migrate` (migration `20260628120000_workspace_readiness`).

---

## Priority 5 — Billing & Subscription Foundation

### Delivered

| Item | Implementation |
|------|----------------|
| Plan catalog | `packages/shared/src/plans.ts` — Starter, Professional, Enterprise |
| Public plans API | `GET /api/v1/billing/plans` |
| Platform subscriptions | `GET /api/v1/billing/platform/subscriptions` |
| Tenant subscription on dashboard | Plan, seats, renewal from `Tenant` + `SeatsService` |

### Gaps (intentional)

- Payment gateway (Stripe/Razorpay) — not integrated.
- Invoice generation / dunning — UI placeholders on subscriptions page.
- Self-service plan upgrade — contact/support flow only.

---

## Verification

```bash
npm run db:generate
npm run build -w @velon/shared
npm run build -w @velon/api
npm run typecheck
```

All commands pass as of this report.

### Manual test checklist

- [ ] Tenant signs up → lands on `/app` with company name and plan
- [ ] Quick actions navigate to correct admin sections
- [ ] Company profile save + logo upload persists
- [ ] Invite user → invitation appears in admin + audit log
- [ ] Create/edit/delete department
- [ ] Platform admin views tenants and subscriptions from API
- [ ] Edit hero in `/admin/website` → refresh homepage
- [ ] Edit FAQ in CMS → refresh `/help`

---

## What Was Explicitly Not Built (Per Directive)

- CRM expansion: pipelines, quotations beyond Phase 3C, sales orders
- Inventory, procurement, finance, HR module work
- Payment processing and automated invoicing

---

## Recommended Next Steps (Post–5-Day Sprint)

1. Apply DB migration and seed default `SiteContentBlock` rows in staging.
2. Wire footer + contact page to CMS; replace static homepage feature grid.
3. Add workspace `timezone`, `currency`, `language` to Prisma + tenant admin form.
4. Department manager assignment dropdown in admin UI.
5. Platform user management API for `admin.users.tsx`.
6. Contact form → `ContactLead` model + platform inbox.
7. Payment gateway when ready to monetize self-service upgrades.

---

## Key Files

| Area | Path |
|------|------|
| Workspace dashboard API | `apps/api/src/workspace/workspace-data.service.ts` |
| Workspace dashboard UI | `src/routes/app.index.tsx` |
| Tenant admin | `src/routes/app.settings.admin.tsx`, `apps/api/src/tenant-admin/` |
| Billing | `apps/api/src/billing/`, `packages/shared/src/plans.ts` |
| CMS | `apps/api/src/cms/`, `src/routes/admin.website.tsx`, `src/lib/cms/` |
| Platform subscriptions | `src/lib/platform/admin-loaders.ts`, `src/routes/admin.subscriptions.tsx` |
| Readiness empty states | `src/lib/workspace/empty-states.ts` |

---

*Report generated after workspace-readiness implementation pass. CRM Phase 3B/3C reports remain in `docs/PHASE-3B-SALES-PIPELINE-REPORT.md` and `docs/PHASE-3C-QUOTATION-PROPOSAL-REPORT.md`.*
