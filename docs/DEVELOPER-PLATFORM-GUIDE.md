# Velon-ERP — Developer guide (platform layout)

This document explains how the product is split in this repo so your team can find the right code fast.

---

## 1. Three main areas (plus extras)

| Area                  | URL prefix                                                                          | Who uses it                          | Shell / layout                                           |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| **Marketing website** | `/`, `/features`, `/pricing`, `/about`, `/contact`, `/help`, `/industries`, `/demo` | Public visitors                      | `MarketingPageShell`, `SiteHeader`, `SiteFooter`         |
| **Super Admin**       | `/admin`, `/admin/...`                                                              | Your platform team (Velon operators) | `AdminShell` in `src/components/admin-shell.tsx`         |
| **Tenant workspace**  | `/app`, `/app/...`                                                                  | Each customer’s business             | `WorkspaceShell` in `src/components/workspace-shell.tsx` |

There are also routes such as `/login`, `/partner`, and `/portal` for auth and other flows. Routes live under `src/routes/` (TanStack Router file-based routing).

---

## 2. Marketing website

- **Purpose:** Tell the story, capture leads, link to pricing and demo.
- **Typical files:** `src/routes/index.tsx`, `features.tsx`, `pricing.tsx`, `demo.tsx`, `contact.tsx`, etc.
- **Header links** are defined in `src/components/site-header.tsx` (Features, Industries, Pricing, About, Contact, Help, Admin shortcut, Sign in, Book demo).

When you add a new public page, add a route file under `src/routes/` and link it from the header or footer if needed.

---

## 3. Super Admin panel

- **Purpose:** Operate the SaaS platform — tenants, billing at platform level, automations, health, partners, compliance, and global settings.
- **Entry:** `src/routes/admin.tsx` wraps child routes with `AdminShell`.
- **Navigation groups** (see `adminGroups` in `admin-shell.tsx`): Platform (Overview, Tenants, Users, Subscriptions), Operations (Automations, Alerts & Logs, Reports, Sales Partners), System (Infrastructure, Integrations, Compliance, Settings).
- **Page titles** for the admin header are in `src/routes/admin.tsx` (`titles` map keyed by path).

Server logic for admin dashboards and tenant CRUD uses the NestJS API (`src/lib/platform/admin-loaders.ts` → `apps/api/`). There is no in-memory demo store.

### Local development (Postgres + Redis + API)

All auth, tenant, and platform data lives in **PostgreSQL**. Signup OTP is staged in **Redis**.

| Piece                         | Path                                               |
| ----------------------------- | -------------------------------------------------- |
| API client + session          | `src/lib/api/client.ts`, `src/lib/auth/session.ts` |
| Admin / workspace loaders     | `src/lib/platform/admin-loaders.ts`, `src/lib/workspace/loaders.ts` |
| Nest API                      | `apps/api/`                                        |
| Schema + migrations           | `packages/database/prisma/`                        |
| Signup OTP (Redis)            | `apps/api/src/auth/signup-otp.service.ts`          |

```bash
cp .env.example .env
# Set VITE_API_URL, DATABASE_URL, REDIS_URL, JWT_*, AUTH_OTP_SECRET, SUPER_ADMIN_PASSWORD

npm run bootstrap:local   # Docker Postgres/Redis, migrate, seed
npm run dev:all           # Vite :8080 + API :3001
```

Sign in at `/login` (tenant workspace) or `/platform/login` (Super Admin).

Header shows **Live · Postgres** when the API is reachable (`PlatformSyncIndicator`).

---

## 4. Tenant workspace model

- **Purpose:** The actual ERP used by one business: inventory, POS, customers, accounting, CRM, reports, etc.
- **Entry:** `src/routes/app.tsx` wraps child routes with `WorkspaceShell`.
- **Navigation** (`workspaceGroups` in `workspace-shell.tsx`): Workspace (Dashboard, Inventory, Billing & POS, Customers, Suppliers), Finance (Accounting, Sales CRM, Reports, Documents), Intelligence (AI Copilot, Automations, Alerts, Branches, Settings).

In production all workspace data is scoped by **tenant id** from the JWT. Loaders call tenant-scoped API endpoints (`src/lib/workspace/loaders.ts`). ERP modules (starting with CRM in Phase 3A) add Postgres models behind the repository layer.

---

## 5. Auth routing (demo only)

`src/routes/login.tsx` calls `demoSignIn` (`erp-functions.ts` → `demoAuth` in `erp-store.ts`):

- **Super Admin:** **`info@velonerp.com`** / **`Arch@2026`** → role `admin` → **`/admin`** (see `src/lib/demo-auth.ts`).
- **Tenant demo:** any other email with password **`demo123`** → role `tenant` → **`/app`**.
- Sign-up creates a trial tenant row via `createTenantFromWizard` then sends the user to **`/app`**.

Replace this with real auth (sessions, JWT, OAuth) and enforce tenant isolation in APIs when you move beyond the demo.

---

## 6. Where to extend

| Task                                  | Where to look                                           |
| ------------------------------------- | ------------------------------------------------------- |
| New marketing page                    | `src/routes/<name>.tsx`                                 |
| New admin screen                      | `src/routes/admin.<name>.tsx` + `admin-shell.tsx` nav   |
| New workspace module                  | `src/routes/app.<name>.tsx` + `workspace-shell.tsx` nav |
| Shared layout chrome                  | `src/components/app-shell.tsx`                          |
| Business / platform data rules        | `src/erp/erp-store.ts`                                  |
| HTTP / server entry points for the UI | `src/erp/erp-functions.ts`                              |
| Product vision and module list        | `Velon-PRD.md`                                          |

---

## 7. Mental model

**One codebase, three experiences:** public site to acquire users, super admin to run the platform, tenant workspace to run each business. The PRD (`Velon-PRD.md`) also describes a separate backend and partner panel as long-term architecture; in this repo the partner route exists as UI scaffolding — align new work with that document when you split services.
