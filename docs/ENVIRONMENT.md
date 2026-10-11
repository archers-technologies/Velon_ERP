# Environment configuration

**Audience:** Engineers, DevOps  
**Last updated:** July 2026

## Required (all environments)

| Variable             | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                                     |
| `REDIS_URL`          | Redis connection string                                          |
| `JWT_ACCESS_SECRET`  | Access token signing (≥ 32 chars; no placeholders in production) |
| `JWT_REFRESH_SECRET` | Refresh token signing                                            |
| `AUTH_OTP_SECRET`    | OTP HMAC secret                                                  |

Validated in `backend/src/config/env.ts` on API boot.

## Local / app URLs

| Variable                                                   | Purpose                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| `API_PORT` / `PORT`                                        | API listen port (default `3001`)                               |
| `API_URL` / `VITE_API_URL`                                 | API origin for clients                                         |
| `CORS_ORIGINS`                                             | Allowed browser origins (comma-separated; wildcards supported) |
| `WEB_ORIGIN` / `APP_ORIGIN` / `PUBLIC_APP_URL`             | Public web URLs for links and cookies                          |
| `PUBLIC_WORKSPACE_DOMAIN` / `VITE_PUBLIC_WORKSPACE_DOMAIN` | Workspace host branding                                        |

## Bootstrap accounts

| Variable                                   | Purpose                                            |
| ------------------------------------------ | -------------------------------------------------- |
| `SUPER_ADMIN_EMAIL`                        | Platform admin email (default `info@velonerp.com`) |
| `SUPER_ADMIN_PASSWORD`                     | Required for seed                                  |
| `DEV_TENANT_EMAIL` / `DEV_TENANT_PASSWORD` | Optional seeded workspace user                     |
| `DEV_TENANT_COMPANY_NAME`                  | Seeded company name                                |

## Feature flags

| Variable                  | Purpose                  |
| ------------------------- | ------------------------ |
| `SEED_DEMO_DATA`          | Seed demo business data  |
| `VELON_SEED_DEMO_TENANTS` | Seed demo tenants        |
| `MONGODB_ENABLED`         | Enable Mongo integration |
| `RAZORPAY_ENABLED`        | Enable Razorpay billing  |

## Mail

Production on Railway typically uses **Resend** (`RESEND_API_KEY`, `RESEND_FROM`). SMTP variables are supported when outbound SMTP is available.

## Templates

| File                                              | Use                        |
| ------------------------------------------------- | -------------------------- |
| [`.env.example`](../.env.example)                 | Local development          |
| [`.env.railway.example`](../.env.railway.example) | Railway API / combined     |
| [`.env.vercel.example`](../.env.vercel.example)   | Vercel web (`VITE_*` only) |

Never commit `.env` or files containing live secrets.

## Related docs

- [Local development](./DEVELOPMENT.md)
- [Deployment](./DEPLOYMENT.md)
- [Security](./SECURITY.md)
