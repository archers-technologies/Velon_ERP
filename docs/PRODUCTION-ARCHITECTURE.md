# Velon ERP — Production architecture

Approved **UI/UX stays in the existing TanStack Start web app** (`src/`). Production services live alongside it in a monorepo layout.

## Official stack

```text
Frontend
├─ React
├─ TanStack Router / Start
├─ Tailwind

Backend
├─ NestJS
├─ PostgreSQL
├─ Prisma
├─ Redis

Authentication
├─ JWT (access + refresh)
├─ OTP (Redis-backed signup verification)
├─ RBAC
├─ Tenant isolation

ERP platform
├─ Multi-tenant
├─ Workspace architecture
├─ Seat management
├─ Departments
├─ Invitations
├─ Audit logs
```

## Repository layout

```
velon-erp/
├── src/                    # Web UI (TanStack Start)
├── apps/api/               # NestJS REST + WebSocket API
├── packages/
│   ├── database/           # Prisma schema + migrations + seed
│   └── shared/             # Roles, permissions, shared types
├── docker-compose.yml      # Postgres + Redis (+ optional API/web)
├── .github/workflows/      # CI
└── docs/
```

## Data authority

| Domain | Store |
|--------|--------|
| Users, tenants, workspaces, memberships | **PostgreSQL** |
| Invitations, departments, seats, audit | **PostgreSQL** |
| Signup OTP (ephemeral) | **Redis** |
| Platform revision / pub-sub | **Redis** |
| ERP modules (CRM onward) | **PostgreSQL** (tenant-scoped) |

There is **no MongoDB** dependency. PostgreSQL is the single system of record.

## Authentication flow

1. **Signup OTP:** `POST /api/v1/auth/signup/request-otp` → Redis stores hashed OTP → email (or dev console).
2. **Verify OTP:** `POST /api/v1/auth/signup/verify-otp` → returns HMAC `verificationToken`.
3. **Create workspace:** `POST /api/v1/auth/signup` with `verificationToken` → Postgres transaction (user, tenant, workspace, membership).
4. **Login:** `POST /api/v1/auth/login` → JWT access + refresh tokens.
5. Web stores tokens in `localStorage` (`src/lib/auth/session.ts`).

## Local development

```bash
cp .env.example .env
# Set SUPER_ADMIN_PASSWORD, JWT_* , AUTH_OTP_SECRET in .env

npm install
npm run stack:up          # Postgres + Redis
npm run db:generate
npm run db:migrate
SUPER_ADMIN_PASSWORD='your-password' npm run db:seed

npm run dev:all           # Web :8080 + API :3001
```

Required env:

- `VITE_API_URL=http://localhost:3001`
- `DATABASE_URL=postgresql://...`
- `REDIS_URL=redis://127.0.0.1:6379`

## CI/CD

`.github/workflows/ci.yml` runs Postgres + Redis service containers, Prisma migrate deploy, lint, build, and `npm run test:security`.

## Module roadmap

1. ✅ Auth, tenants, platform admin, tenant admin (Phase 2A–2D)
2. ✅ Mongo removal, Redis OTP (Phase 2D.1)
3. **Phase 3A — CRM foundation** (customers, contacts, notes, activities)
4. Billing, inventory, finance → tenant-scoped NestJS modules

## Deployment

- **Web:** Vercel (`VITE_API_URL` → Railway API URL)
- **API:** Railway (Postgres + Redis managed services)
- See `docs/DEPLOYMENT.md`
