# MongoDB configuration (optional)

Velon ERP uses **PostgreSQL** (via Prisma) as the primary system of record for tenants, workspaces, ERP modules, billing, and audit data. **MongoDB is optional** secondary storage for future features that benefit from flexible JSON documents or high-volume append-only data.

When MongoDB is disabled (the default), the API behaves exactly as before: no connection is opened and no MongoDB variables are required.

---

## Role in the stack

| Store | Purpose |
|-------|---------|
| **PostgreSQL** | Primary ERP database — required |
| **Redis** | OTP, pub/sub, ephemeral state — required |
| **MongoDB** | Optional secondary storage — disabled by default |

Do not move transactional ERP entities (users, tenants, invoices, inventory, etc.) to MongoDB. PostgreSQL remains authoritative for all existing modules.

### Suitable future use cases

MongoDB is intended for workloads such as:

- Application and audit **log streams** (structured, searchable history)
- **Webhook payload** archives (raw provider callbacks for replay/debug)
- **Analytics snapshots** (denormalized metrics per tenant/period)
- **Telemetry / event history** (usage signals, integration events)
- **Flexible JSON documents** that do not map cleanly to relational tables

No features consume MongoDB yet. The connection module is in place so future services can inject `MongoService` when needed.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_ENABLED` | `false` | Set to `true` only when you want the API to connect at startup |
| `MONGODB_URI` | *(empty)* | Connection string (required when enabled) |
| `MONGODB_DATABASE` | `velon_erp` | Database name on the cluster |

Copy from [`.env.example`](../.env.example) or [`.env.railway.example`](../.env.railway.example).

**Startup behavior**

- `MONGODB_ENABLED=false` (or unset) → API starts normally; MongoDB is not contacted.
- `MONGODB_ENABLED=true` and `MONGODB_URI` set → API connects on boot.
- `MONGODB_ENABLED=true` and `MONGODB_URI` missing → API **fails fast** with a clear configuration error.

---

## Local development

### Default (MongoDB off)

```bash
cp .env.example .env
npm run stack:up          # Postgres + Redis only
npm run dev:all
```

No MongoDB variables are needed.

### With local MongoDB container

Start MongoDB using the optional Compose profile (does not affect the default stack):

```bash
docker compose --profile mongo up -d
```

In `.env`:

```bash
MONGODB_ENABLED=true
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=velon_erp
```

Restart the API. Future code can use `MongoService` from `apps/api/src/mongo/`.

### Using MongoDB Atlas locally

Set `MONGODB_URI` to your Atlas connection string (include credentials and `retryWrites=true` as recommended by Atlas). Keep `MONGODB_DATABASE=velon_erp` unless you use a different database name on the cluster.

---

## Railway deployment

The standard Railway flow (API + PostgreSQL + Redis, frontend on Vercel) is unchanged.

To add MongoDB later:

1. **Option A — Railway plugin:** In the same project, **+ New → Database → MongoDB** (or add a MongoDB template if available). Copy the connection URL from **Connect**.
2. **Option B — MongoDB Atlas:** Create a cluster and allow Railway egress IPs (or `0.0.0.0/0` for early staging only).

On the **API** service → **Variables**:

```bash
MONGODB_ENABLED=true
MONGODB_URI=mongodb://...
MONGODB_DATABASE=velon_erp
```

Leave all three unset or set `MONGODB_ENABLED=false` to run without MongoDB. Vercel does not need MongoDB variables — only the API connects.

---

## How to disable MongoDB

1. Set `MONGODB_ENABLED=false` (or remove the variable).
2. Remove or leave `MONGODB_URI` empty.
3. Redeploy / restart the API.

The optional `mongodb` Compose service is only started with `--profile mongo`; stopping it does not affect Postgres or Redis:

```bash
docker compose --profile mongo down
```

---

## Backend module

| File | Purpose |
|------|---------|
| `apps/api/src/mongo/mongo.config.ts` | Env parsing and validation |
| `apps/api/src/mongo/mongo.service.ts` | Connection lifecycle (`MongoClient` / `Db`) |
| `apps/api/src/mongo/mongo.module.ts` | Global NestJS module |

Example (future feature code only):

```typescript
import { MongoService } from "../mongo/mongo.service";

constructor(private readonly mongo: MongoService) {}

async saveWebhookPayload(tenantId: string, payload: unknown) {
  if (!this.mongo.enabled || !this.mongo.db) return;
  await this.mongo.db.collection("webhook_payloads").insertOne({
    tenantId,
    payload,
    receivedAt: new Date(),
  });
}
```

Health checks (`/api/v1/health/ready`) still require **PostgreSQL and Redis only**. MongoDB availability does not affect readiness when disabled; when enabled, a future health extension can use `MongoService.ping()` without changing ERP behavior.

---

## What this does not do

- No Prisma schema or migration changes
- No data migration from PostgreSQL to MongoDB
- No new API routes or UI pages
- No change to auth, billing, tenants, or workspace flows

PostgreSQL + Prisma remain the single source of truth for ERP data.
