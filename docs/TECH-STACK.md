# Technology stack by category

**Audience:** Engineers, architects, onboarding  
**Last updated:** July 2026

This document lists **what technology is used in each category** of the Velon ERP project. For how pieces connect, see [Architecture](./ARCHITECTURE.md). For folder layout, see [Monorepo](./MONOREPO.md).

---

## 1. Languages and runtime

| Technology | Version / notes | Where used |
|------------|-----------------|------------|
| **TypeScript** | 5.8+ | Entire monorepo (web, API, shared, database tooling) |
| **Node.js** | 20+ recommended | Runtime for API, Vite, scripts, Prisma |
| **npm** | 10.9+ (`packageManager`) | Workspaces, install, scripts |

---

## 2. Frontend (web app)

| Category | Technology | Purpose |
|----------|------------|---------|
| **UI library** | React 19 | Component model |
| **Routing** | TanStack Router | File-based routes (`frontend/src/routes/`) |
| **App framework** | TanStack Start | Full-stack capable web app entry |
| **Server state** | TanStack Query | API data fetching and cache |
| **Forms** | React Hook Form | Form state and submission |
| **Schema validation (client)** | Zod | Form and payload validation with `@hookform/resolvers` |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **UI primitives** | Radix UI | Accessible dialogs, menus, tabs, etc. |
| **Class utilities** | `class-variance-authority`, `clsx`, `tailwind-merge` | Component variants and class composition |
| **Icons** | Lucide React | Icon set |
| **Charts** | Recharts | Dashboard and report charts |
| **Date UI** | `react-day-picker`, `date-fns` | Date pickers and formatting |
| **Toasts** | Sonner | User notifications |
| **Command palette** | `cmdk` | Search / command UI |
| **Carousels** | Embla Carousel | Marketing / UI carousels |
| **Drawers** | Vaul | Mobile-friendly drawers |
| **OTP input** | `input-otp` | Signup / password-reset codes |
| **Barcodes / QR** | `jsbarcode`, `qrcode` | Labels and invoice QR codes |
| **Realtime client** | `socket.io-client` | Workspace notifications |
| **Build tool** | Vite 7 | Dev server and production bundle |
| **Path aliases** | `vite-tsconfig-paths` | `@/` imports |
| **Vercel adapter** | Nitro (Vite plugin) | Hosting on Vercel |
| **Optional edge build** | `@cloudflare/vite-plugin` | Non-Vercel Cloudflare builds |
| **Config helper** | `@lovable.dev/vite-tanstack-config` | Shared Vite + TanStack defaults |

**Location:** `frontend/` — package `@velon/frontend` (`frontend/src/`, `frontend/vite.config.ts`)

---

## 3. Backend (API)

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | NestJS 11 | Modular HTTP API |
| **HTTP platform** | Express (`@nestjs/platform-express`) | Request handling |
| **Config** | `@nestjs/config` | Environment loading and validation |
| **API docs** | `@nestjs/swagger` | OpenAPI UI at `/api/docs` |
| **Auth framework** | Passport + `@nestjs/passport` | Strategy-based auth |
| **JWT** | `@nestjs/jwt`, `passport-jwt` | Access tokens |
| **Password hashing** | `bcrypt` | Stored password hashes |
| **OTP** | `otplib` | Signup / password-reset / MFA-ready codes |
| **Validation** | `class-validator`, `class-transformer` | DTO validation via `ValidationPipe` |
| **Rate limiting** | `@nestjs/throttler` | Global and route-level limits |
| **Security headers** | Helmet | HTTP hardening |
| **Cookies** | `cookie-parser` | Cookie parsing |
| **WebSockets** | `@nestjs/websockets`, `@nestjs/platform-socket.io` | Realtime notifications |
| **Queues** | BullMQ | Background jobs (Redis-backed) |
| **PDF generation** | PDFKit (CRM proposals) | Proposal / document PDFs |
| **Mail (SMTP)** | Nodemailer | Transactional email when SMTP is configured |
| **Mail (API)** | Resend | Preferred mail on Railway / production |

**Location:** `backend` — package `@velon/backend`

---

## 4. Data and persistence

| Category | Technology | Purpose |
|----------|------------|---------|
| **Primary database** | PostgreSQL 16 | System of record for tenants, CRM, inventory, billing |
| **ORM** | Prisma | Schema, migrations, type-safe queries |
| **Cache / sessions / OTP** | Redis 7 | Tokens, OTP storage, queues, ephemeral state |
| **Optional document store** | MongoDB 7 | Enabled only when `MONGODB_ENABLED=true` |
| **Mongo driver** | Official `mongodb` package | Optional document access |

**Location:** `packages/database` (`@velon/database`), Prisma client used from API via `PrismaService`

---

## 5. Shared contracts and policy

| Category | Technology | Purpose |
|----------|------------|---------|
| **Shared library** | TypeScript package `@velon/shared` | Roles, permissions, plans, seats, billing policy, localization, navigation helpers |
| **Package manager link** | npm workspaces (`*`) | Web and API both depend on shared |

**Location:** `packages/shared-kernel/src/`

---

## 6. Authentication and security stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Access tokens** | JWT (Passport JWT strategy) | Short-lived API auth |
| **Refresh tokens** | Hashed tokens in PostgreSQL | Session rotation and revoke |
| **OTP secrets** | HMAC via `AUTH_OTP_SECRET` | Signup and password reset |
| **Password policy** | Shared rules in `@velon/shared` | Strength checks on web and API |
| **HTTP hardening** | Helmet | Headers |
| **CORS** | Nest CORS + `CORS_ORIGINS` | Origin allow-list (wildcards supported) |
| **Input safety** | Nest `ValidationPipe` (whitelist, forbid non-whitelisted) | Reject unknown fields |
| **Tenant isolation** | Async Local Storage + `TenantScopedRepository` | Force `tenantId` on queries |

See also [Authentication](./AUTHENTICATION.md) and [Security](./SECURITY.md).

---

## 7. Payments and billing

| Category | Technology | Purpose |
|----------|------------|---------|
| **Primary provider** | Razorpay | Checkout, verify, webhooks (`RAZORPAY_ENABLED`) |
| **Provider registry** | Custom Nest providers | Stripe, STC Pay, HyperPay, bank transfer (stubbed) |
| **Plan catalog** | `@velon/shared` + `PlanDefinition` in Postgres | Seats, prices, regional pricing |

See [Business modules](./BUSINESS-MODULES.md).

---

## 8. Communications

| Category | Technology | Purpose |
|----------|------------|---------|
| **Email (production)** | Resend API | Invites, OTP, transactional mail |
| **Email (alternate)** | SMTP via Nodemailer | When outbound SMTP is available |
| **Realtime** | Socket.IO | In-app notifications |

---

## 9. Frontend–API integration

| Category | Technology | Purpose |
|----------|------------|---------|
| **HTTP** | `fetch` / API helpers under `frontend/src/lib/api/` | REST calls to `/api/v1` |
| **Dev proxy** | Vite `server.proxy` `/api` → API | Same-origin API in local dev |
| **API versioning** | Path prefix `/api/v1` | Stable public contract |
| **API docs** | Swagger UI | Interactive exploration |

---

## 10. Tooling and quality

| Category | Technology | Purpose |
|----------|------------|---------|
| **Lint** | ESLint 9 + TypeScript ESLint | Static analysis |
| **Format** | Prettier (via eslint-plugin-prettier) | Code style |
| **Typecheck** | `tsc --noEmit` | Web type safety |
| **Unit / e2e tests** | Jest (API) | Unit, security, and e2e suites |
| **Concurrent dev** | `concurrently` | Run web + API together (`npm run dev`) |

---

## 11. Infrastructure and local stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Containers** | Docker Compose | Local Postgres, Redis, optional Mongo / full stack |
| **Postgres image** | `postgres:16-alpine` | Local DB |
| **Redis image** | `redis:7-alpine` | Local cache |
| **Mongo image** | `mongo:7` (profile `mongo`) | Optional local Mongo |
| **API image** | `backend/Dockerfile` / `Dockerfile.api` | Containerized API |
| **Web image** | `Dockerfile.web` (compose profile `full`) | Containerized web |

---

## 12. Hosting and deployment

| Category | Technology | Purpose |
|----------|------------|---------|
| **Web hosting** | Vercel | Marketing + app UI (`vercel.json`, TanStack Start) |
| **API hosting** | Railway | Nest API, migrations, healthchecks (`railway.json`) |
| **Optional combined** | Railway + Nitro proxy | Single service with `/api` proxy (`RAILWAY_STACK=combined`) |
| **Health checks** | HTTP `/api/v1/health/live` | Railway liveness |

See [Deployment](./DEPLOYMENT.md).

---

## 13. Business-domain libraries (by module)

| Module area | Notable tech / libs |
|-------------|---------------------|
| **CRM / proposals** | Nest services, PDFKit for proposal PDFs, public token routes |
| **Inventory** | Prisma models, stock adjust/transfer APIs |
| **Procurement / suppliers** | Workflow endpoints (submit, approve, receive) |
| **Sales** | Quotation → sales order conversion |
| **Billing** | Razorpay client/webhook, subscription guards |
| **CMS** | Platform-editable site content for marketing pages |
| **Workspace UX** | Quick actions, onboarding checklist, role presets (React) |
| **Invoicing UI** | A4 templates, QR generation (`frontend/src/lib/sales/invoicing/`) |

---

## 14. Scripts and operations

| Category | Technology | Purpose |
|----------|------------|---------|
| **Shell scripts** | Bash | Bootstrap, backup, restore, macOS stack install |
| **Node scripts** | `.mjs` utilities | Release verify, migrate verify, password rotate |
| **Prisma CLI** | `prisma migrate`, `prisma studio`, seed | Schema lifecycle |

See [Operations](./OPERATIONS.md) and [Local development](./DEVELOPMENT.md).

---

## Quick map: category → package

| Category | Primary package / path |
|----------|------------------------|
| Frontend | `@velon/frontend` (`frontend/src/`) |
| Backend API | `@velon/backend` (`backend/`) |
| Database schema | `@velon/database` (`packages/database/`) |
| Shared policy | `@velon/shared` (`packages/shared-kernel/`) |
| Local infra | `docker-compose.yml` |
| Web deploy | `vercel.json` |
| API deploy | `railway.json` |

---

## Related docs

- [Architecture](./ARCHITECTURE.md)
- [Monorepo](./MONOREPO.md)
- [Environment](./ENVIRONMENT.md)
- [Deployment](./DEPLOYMENT.md)
