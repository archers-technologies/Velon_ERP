# Deployment

**Audience:** Engineers, DevOps  
**Last updated:** July 2026

## Recommended split

| Component | Platform | Config                                                                                                   |
| --------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Web       | Vercel   | [`frontend/vercel.json`](../frontend/vercel.json) — TanStack Start + Nitro (see [Vercel](#vercel-web-ui)) |
| API       | Railway  | `railway.json` — `backend/Dockerfile.api`, migrate deploy pre-command, healthcheck `/api/v1/health/live` |

Set `VITE_API_URL` on Vercel to the public Railway API origin.

## Vercel (web UI)

The frontend is an npm workspace package. Nitro (Vercel preset) writes the deployable **Build Output API** bundle to `frontend/.vercel/output/` during `vite build`. Vercel must use **`frontend`** as the project root so that path resolves correctly.

### Dashboard settings

In **Vercel → Project → Settings → General**:

| Setting | Value | Notes |
| ------- | ----- | ----- |
| **Root Directory** | `frontend` | Required. Do not leave empty (repo root). |
| **Framework Preset** | TanStack Start | Also set in `frontend/vercel.json`. |
| **Install Command** | `cd .. && npm ci` | Installs all workspaces from the monorepo root. |
| **Build Command** | `npm run build` | Runs `vite build` in `@velon/frontend`. |
| **Output Directory** | *(empty / default)* | **Do not set** `output`, `dist`, `.vercel/output`, or any custom path. Nitro emits the Build Output API layout; a manual output directory breaks detection. |
| **Node.js Version** | 22.x or newer | Matches Nitro’s Vercel runtime expectations. |

`frontend/vercel.json` mirrors the install and build commands above. Framework preset is declared there so Git deploys stay reproducible.

### Environment variables

Set in **Vercel → Settings → Environment Variables** (Production and Preview). See [`.env.vercel.example`](../.env.vercel.example):

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_URL` | Public Railway API origin (e.g. `https://…up.railway.app/`) |
| `VITE_PUBLIC_WORKSPACE_DOMAIN` | Workspace host branding (e.g. `velonerp.com`) |

Only `VITE_*` variables belong on Vercel. Secrets and database URLs stay on Railway.

### Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `No Output Directory named "output" found` | Clear **Output Directory** in the dashboard (override wins over `vercel.json`). Confirm **Root Directory** is `frontend`. |
| Build succeeds but deploy fails | Ensure `framework` is `tanstack-start` and `outputDirectory` is **not** set in `vercel.json`. |
| `Could not find workspace` / missing `@velon/shared` | Install must run from monorepo root: `cd .. && npm ci`. |
| API calls fail in production | Set `VITE_API_URL` to the Railway API URL; confirm Railway `CORS_ORIGINS` includes your Vercel domain. |

### Local web-only build (sanity check)

From the repository root:

```bash
npm ci
VERCEL=1 npm run build:web
ls frontend/.vercel/output
```

You should see `static/`, `functions/`, and `nitro.json` under `frontend/.vercel/output/`.

## Combined Railway stack

When `RAILWAY_STACK=combined` and Nitro is enabled, `/api/**` can be proxied to an internal API origin (`INTERNAL_API_ORIGIN`). See `vite.config.ts` and `.env.railway.example` comments for the all-in-one service layout (`railway.web.json` / `Dockerfile.railway` when present).

## Build order

Root `npm run build`:

1. `@velon/shared`
2. `@velon/database`
3. `@velon/backend`
4. `@velon/frontend`

API-only: `npm run build:api`  
Web-only: `npm run build:web`

## Pre-deploy database

Railway pre-deploy:

```text
node packages/database/scripts/require-database-url.mjs
cd packages/database && npx prisma migrate deploy
```

## CORS in production

Baseline origins include `https://velonerp.com`, `https://www.velonerp.com`, and `https://*.vercel.app`, merged with `CORS_ORIGINS`.

## Environment templates

- [`.env.railway.example`](../.env.railway.example)
- [`.env.vercel.example`](../.env.vercel.example)

## Tech used

Vercel, Railway, Docker, Nitro, Prisma migrate deploy. See [Tech stack — Hosting](./TECH-STACK.md#12-hosting-and-deployment).

## Related docs

- [Environment](./ENVIRONMENT.md)
- [Operations](./OPERATIONS.md)
- [Security](./SECURITY.md)
