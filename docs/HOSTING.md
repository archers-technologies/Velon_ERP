# Hosting on Vercel + Railway

Velon ERP splits into two deployables:

| Where | What | Secrets? |
|-------|------|----------|
| **Vercel** | React web app (static) | Only `VITE_*` — safe in the browser |
| **Railway** | NestJS API + Postgres + Redis | All backend secrets |

Copy-paste templates:

- Vercel variables → [`.env.vercel.example`](../.env.vercel.example)
- Railway variables → [`.env.railway.example`](../.env.railway.example)

---

## 1. Railway (API + database)

### Create the project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select `Velon-ERP`.
2. Railway creates one service from the repo. Open it → **Settings** → set **Root Directory** to `/` (repo root).
3. `railway.json` is already in the repo — Railway uses the API Dockerfile, runs Prisma migrations before deploy, and health-checks `/api/v1/health/live`.

### Add PostgreSQL

1. In the same project: **+ New** → **Database** → **PostgreSQL**.
2. Open the Postgres service → **Connect** → copy **DATABASE_URL** (or use variable references below).

You do **not** install Postgres yourself on Railway — it is a managed plugin. The API only needs the connection string.

### Add Redis

1. **+ New** → **Database** → **Redis**.
2. Copy **REDIS_URL** from the Redis service **Connect** tab.

### Wire the API service

Open the **API** service (not Postgres) → **Variables**.

**Easiest — reference linked services** (Railway fills these when Postgres/Redis are in the same project):

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

Then add the rest from [`.env.railway.example`](../.env.railway.example):

| Variable | Notes |
|----------|--------|
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` |
| `AUTH_OTP_SECRET` | `openssl rand -base64 48` |
| `SUPER_ADMIN_PASSWORD` | Your platform admin login password |
| `CORS_ORIGINS` | Your Vercel URL(s), comma-separated |
| `WEB_ORIGIN` / `APP_ORIGIN` / `PUBLIC_APP_URL` | Same as Vercel production URL |
| `SMTP_*` | Required for signup / invite / reset emails in production |

Deploy. After the first successful deploy, seed the super admin (Railway shell or one-off command):

```bash
railway run npm run db:seed
```

Note the API public URL (e.g. `https://velon-api-production.up.railway.app`) — you need it for Vercel.

---

## 2. Vercel (web app)

1. [vercel.com](https://vercel.com) → **Add New Project** → import the same GitHub repo.
2. **Root Directory**: `/` (repo root).
3. `vercel.json` already sets:
   - `buildCommand`: `npm run build:web`
   - `outputDirectory`: `dist/client`
   - SPA rewrites for client-side routing
4. **Environment Variables** (from [`.env.vercel.example`](../.env.vercel.example)):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | Your Railway API URL, e.g. `https://velon-api-production.up.railway.app` |
| `VITE_PUBLIC_WORKSPACE_DOMAIN` | `app.velonerp.com` (or your domain) |

Set `VITE_API_URL` for **Production** and **Preview** so branch deploys talk to staging or production API.

5. Deploy. Open `https://your-app.vercel.app/platform/login` and sign in with `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD`.

**Never** put `DATABASE_URL`, `JWT_*`, or `SMTP_PASS` on Vercel.

---

## 3. PostgreSQL passwords

There are three different situations:

### A. Railway managed Postgres (production)

Railway owns the server. You change the **database user password**, then update **`DATABASE_URL`** on the API service.

**Option 1 — Railway dashboard (simplest)**

1. Postgres service → **Settings** → look for **Reset credentials** / regenerate password (wording varies by Railway UI version).
2. Copy the new **DATABASE_URL** from **Connect**.
3. API service → **Variables** → update `DATABASE_URL` (or `${{Postgres.DATABASE_URL}}` if you use references — Railway updates the source automatically after reset).

**Option 2 — SQL**

```bash
railway link          # select your project + Postgres service
railway connect       # opens psql
```

In `psql`:

```sql
ALTER USER postgres WITH PASSWORD 'your-new-strong-password';
```

Then build a new URL (password must be [URL-encoded](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) if it contains `@`, `#`, `!`, etc.):

```text
postgresql://postgres:URL_ENCODED_PASSWORD@HOST:PORT/railway
```

Update `DATABASE_URL` on the **API** service and redeploy.

### B. Local Docker (`npm run stack:up`)

1. Set a new password in `docker-compose.yml` under `postgres.environment.POSTGRES_PASSWORD`.
2. Recreate the container (data volume keeps existing DB — you must also run SQL):

```bash
docker compose exec postgres psql -U velon -d velon_erp -c "ALTER USER velon WITH PASSWORD 'new-password';"
```

3. Update `DATABASE_URL` in `.env` to match.

Or use the helper (updates `.env` + runs `ALTER USER` against the host in `DATABASE_URL`):

```bash
npm run db:rotate-password -- 'your-new-strong-password'
```

### C. Local Homebrew Postgres (`npm run install:stack`)

```bash
npm run db:rotate-password -- 'your-new-strong-password'
```

Requires `psql` on your PATH and a working `DATABASE_URL` in `.env`.

---

## 4. Checklist

```text
[ ] Railway: Postgres + Redis added
[ ] Railway: API variables set (see .env.railway.example)
[ ] Railway: deploy green, /api/v1/health/live returns 200
[ ] Railway: npm run db:seed (first time only)
[ ] Vercel: VITE_API_URL points at Railway API
[ ] Vercel: CORS_ORIGINS on Railway includes Vercel domain(s)
[ ] Login works at /platform/login
```

---

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Web loads but API calls fail | Check `VITE_API_URL` on Vercel matches Railway API URL (https, no trailing slash) |
| CORS error in browser | Add your Vercel URL to `CORS_ORIGINS` on Railway API |
| API crash on boot: missing env | Set `DATABASE_URL`, `REDIS_URL`, `JWT_*`, `AUTH_OTP_SECRET` on Railway |
| `password authentication failed` | Password in `DATABASE_URL` does not match Postgres — rotate and update URL |
| Migrations failed on deploy | Check Railway deploy logs; run `railway run npm run db:migrate:deploy` manually |

More detail: [DEPLOYMENT.md](./DEPLOYMENT.md)
