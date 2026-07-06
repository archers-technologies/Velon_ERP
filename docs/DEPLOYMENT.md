# Deployment

**Audience:** Engineers, DevOps  
**Last updated:** July 2026

## Recommended split

| Component | Platform | Config                                                                                                   |
| --------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Web       | Vercel   | [`vercel.json`](../vercel.json) — TanStack Start + Nitro (see [Vercel](#vercel-web-ui))                  |
| API       | Railway  | `railway.json` — `backend/Dockerfile.api`, migrate deploy pre-command, healthcheck `/api/v1/health/live` |

Set `VITE_API_URL` on Vercel to the public Railway API origin.

## Vercel (web UI)

Nitro (Vercel preset) writes the deployable **Build Output API** bundle to `frontend/.vercel/output/` during `vite build`. Because the Vercel project uses the **repository root** as its Root Directory, `npm run build:vercel` copies that folder to `.vercel/output/` at the repo root where Vercel expects it.

**Critical:** The project must use the **TanStack Start** framework preset, not **Vite**. A Vite preset makes Vercel look for a static `dist/` folder and fails even when the Nitro build succeeds.

### `vercel.json` (repo root)

| Field            | Value                  |
| ---------------- | ---------------------- |
| `framework`      | `tanstack-start`       |
| `installCommand` | `npm ci`               |
| `buildCommand`   | `npm run build:vercel` |

Do **not** add `outputDirectory` — Nitro emits the Build Output API layout automatically.

### Dashboard settings

In **Vercel → Project → Settings → General**:

| Setting              | Value                  | Notes                                                     |
| -------------------- | ---------------------- | --------------------------------------------------------- |
| **Root Directory**   | `.` (repo root)        | Default for this monorepo.                                |
| **Framework Preset** | TanStack Start         | Overridden by `vercel.json#framework` on deploy.          |
| **Build Command**    | `npm run build:vercel` | Builds frontend + syncs `.vercel/output` to repo root.    |
| **Install Command**  | `npm ci`               | Installs all workspaces.                                  |
| **Output Directory** | _(empty / default)_    | **Never** set `dist`, `output`, or `.vercel/output` here. |
| **Node.js Version**  | 22.x or newer          | Project currently uses 24.x.                              |

### Environment variables

Set in **Vercel → Settings → Environment Variables** (Production and Preview). See [`.env.vercel.example`](../.env.vercel.example):

| Variable                       | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `VITE_API_URL`                 | Public Railway API origin (e.g. `https://…up.railway.app/`) |
| `VITE_PUBLIC_WORKSPACE_DOMAIN` | Workspace host branding (e.g. `velonerp.com`)               |

Only `VITE_*` variables belong on Vercel. Secrets and database URLs stay on Railway.

### Troubleshooting

| Symptom                                              | Fix                                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `No Output Directory named "dist" found`             | Framework preset is **Vite** instead of **TanStack Start**. Deploy with root `vercel.json` (`framework: tanstack-start`) and clear **Output Directory** in the dashboard. |
| `No Output Directory named "output" found`           | Clear **Output Directory** in the dashboard. Do not set it manually.                                                                                                      |
| Build succeeds but deploy fails                      | Confirm `buildCommand` is `npm run build:vercel` and `.vercel/output/` exists at repo root after build.                                                                   |
| `Could not find workspace` / missing `@velon/shared` | Install must run from monorepo root: `cd .. && npm ci`.                                                                                                                   |
| API calls fail in production                         | Set `VITE_API_URL` to the Railway API URL; confirm Railway `CORS_ORIGINS` includes your Vercel domain.                                                                    |

### Local web-only build (sanity check)

From the repository root:

```bash
npm ci
npm run build:vercel
ls .vercel/output
```

You should see `static/`, `functions/`, and `nitro.json` under `.vercel/output/` at the **repo root**.

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
