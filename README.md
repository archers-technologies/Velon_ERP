# Velon ERP

**Velon** is a multi-tenant, AI-ready business operating system — a modern ERP SaaS for inventory, CRM, sales, procurement, billing, and workspace administration in one product.

It serves three audiences from a single monorepo:

| Surface | Path | Audience |
|---------|------|----------|
| **Marketing site** | `/`, `/pricing`, `/demo`, … | Prospects and public visitors |
| **Tenant workspace** | `/app` | Business teams running day-to-day operations |
| **Platform admin** | `/admin` | Velon staff managing tenants, plans, and the platform |

---

## Stack

| Layer | Technology |
|-------|------------|
| Web app | React 19, TanStack Router / Start, Vite, Tailwind CSS 4 |
| API | NestJS 11, Passport JWT, Swagger |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache / sessions | Redis 7 |
| Shared contracts | `@velon/shared` (roles, permissions, plans, localization) |
| Payments | Razorpay (optional; other providers stubbed) |
| Hosting | Web on Vercel; API (and optional combined stack) on Railway |

---

## Repository layout

Code is organized by **bounded context** (business domain folders such as `crm/`, `billing/`, `inventory/`), not by technical layers. See [docs/MONOREPO.md](docs/MONOREPO.md) and [docs/CONVENTIONS.md](docs/CONVENTIONS.md).

```
Velon_ERP/
├── apps/api/              # NestJS API (@velon/api) — one folder per domain
├── packages/
│   ├── database/          # Prisma schema, migrations, seed (@velon/database)
│   └── shared/            # Shared types, permissions, plans (@velon/shared)
├── src/                   # Web app (marketing, /app workspace, /admin)
├── scripts/               # Bootstrap, backup, release checks
├── docs/                  # Technical and user documentation
├── docker-compose.yml     # Local Postgres + Redis (+ optional Mongo / full stack)
└── package.json           # npm workspaces root
```

---

## Prerequisites

- **Node.js** 20+ and **npm** 10+
- **Docker** (recommended for Postgres and Redis), or local Postgres 16 and Redis 7
- Copy environment templates before first run (see below)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Set SUPER_ADMIN_PASSWORD (and optionally DEV_TENANT_PASSWORD) in .env

# 3. Start Postgres + Redis, migrate, and seed
npm run bootstrap:local

# 4. Run web + API together
npm run dev
```

| Service | Default URL |
|---------|-------------|
| Web | [http://localhost:8080](http://localhost:8080) |
| API | [http://localhost:3001](http://localhost:3001) |
| Swagger | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) |

**Platform admin:** `SUPER_ADMIN_EMAIL` (default `info@velonerp.com`) + `SUPER_ADMIN_PASSWORD` from `.env` → `/admin`

**Workspace user:** set `DEV_TENANT_EMAIL` / `DEV_TENANT_PASSWORD`, run `npm run db:seed`, then sign in at `/login` → `/app`

Demo login (when demo seed is enabled): any non–super-admin email with password `demo123` (see [Tenant Workspace Guide](docs/TENANT-WORKSPACE-GUIDE.md)).

---

## Common scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Web + API (concurrent) |
| `npm run dev:web` | Web only |
| `npm run dev:api` | API only |
| `npm run build` | Build shared, database, API, and web |
| `npm run typecheck` | TypeScript check (web) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write (quotes, attributes, import order) |
| `npm run format:check` | Prettier check (CI) |
| `npm test` | Unit tests with mocks (no database writes) |
| `npm run test:all` | Unit + security e2e (needs `DATABASE_URL_TEST`) |
| `npm run db:migrate` | Prisma migrate (dev) |
| `npm run db:seed` | Seed super admin / optional tenant |
| `npm run db:studio` | Prisma Studio |
| `npm run stack:up` | `docker compose up -d` (Postgres + Redis) |
| `npm run verify:release` | Release readiness checks |

---

## Documentation

Docs are split by topic under [`docs/`](docs/README.md):

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Full documentation index |
| [docs/TECH-STACK.md](docs/TECH-STACK.md) | Technologies used in each category |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local development |
| [docs/API-REFERENCE.md](docs/API-REFERENCE.md) | API endpoints |
| [docs/TENANT-WORKSPACE-GUIDE.md](docs/TENANT-WORKSPACE-GUIDE.md) | End-user workspace guide |

Product requirements live in [Velon-PRD.md](Velon-PRD.md).

---

## Environment

- Local: [`.env.example`](.env.example)
- Railway (API / combined): [`.env.railway.example`](.env.railway.example)
- Vercel (web): [`.env.vercel.example`](.env.vercel.example)

Never commit `.env` or files containing live secrets.

---

## License

Private — all rights reserved.
