# API reference

**Audience:** Engineers  
**Last updated:** July 2026

**Base URL:** `/api/v1`  
**Interactive docs:** `/api/docs` (Swagger)

For live request/response schemas, run the API and open Swagger.

## Auth

| Method | Path                              |
| ------ | --------------------------------- |
| POST   | `/auth/login`                     |
| POST   | `/auth/refresh`                   |
| POST   | `/auth/logout`                    |
| POST   | `/auth/signup/request-otp`        |
| POST   | `/auth/signup/verify-otp`         |
| POST   | `/auth/signup`                    |
| POST   | `/auth/password-reset/request`    |
| POST   | `/auth/password-reset/verify-otp` |
| POST   | `/auth/password-reset/complete`   |
| POST   | `/auth/change-password`           |

## Health

| Method | Path            | Use                            |
| ------ | --------------- | ------------------------------ |
| GET    | `/health`       | Status                         |
| GET    | `/health/live`  | Liveness (Railway healthcheck) |
| GET    | `/health/ready` | Readiness (dependencies)       |

## Workspace and tenant admin

| Prefix          | Examples                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| `/workspace`    | `context`, `dashboard`, `alerts`, `pos/sales`, module summaries                 |
| `/tenant-admin` | `overview`, `seats`, `members`, `invitations`, `departments`, `company-profile` |
| `/invitations`  | Public accept by token                                                          |

## CRM (selected)

| Prefix               | Resources                                                 |
| -------------------- | --------------------------------------------------------- |
| `/crm`               | `customers`, `contacts`, `notes`, `activities`            |
| `/crm`               | `leads`, `pipelines`, `stages`, `opportunities`           |
| `/crm`               | `quotations`, `quotation-items`, `proposals`, `templates` |
| `/crm/customer-view` | Public token accept/reject/comment/PDF                    |

## Inventory, suppliers, procurement, sales

| Prefix         | Resources                                       |
| -------------- | ----------------------------------------------- |
| `/inventory`   | `categories`, `products`, `warehouses`, `stock` |
| `/suppliers`   | CRUD, contacts, threads                         |
| `/procurement` | `requests`, `orders` (+ workflow actions)       |
| `/sales`       | `orders`, `orders/from-quotation/:id`           |

## Billing and platform

| Prefix                       | Audience                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `/billing`                   | Tenant subscription, checkout, Razorpay verify                               |
| `/billing/webhooks/razorpay` | Provider webhooks                                                            |
| `/billing/platform/*`        | Super-admin plan and payment ops                                             |
| `/platform`                  | Overview, users, diagnostics, demo cleanup                                   |
| `/tenants`                   | Platform tenant management                                                   |
| `/public/site-content`       | Public CMS                                                                   |
| `/platform/site-content`     | CMS admin                                                                    |
| `/audit/logs`                | Audit trail                                                                  |
| `/tenant-resources`          | Generic tenant resources (customers, projects, assets, files, notifications) |

## Client integration

Web clients live under `frontend/src/lib/api/` and call `API_V1_BASE` from `frontend/src/lib/api/config.ts`.

In development, Vite proxies `/api` → `INTERNAL_API_ORIGIN` (default `http://127.0.0.1:3001`), so the browser can use same-origin `/api/v1`.

## Tech used

NestJS, Swagger, class-validator, Passport JWT. See [Tech stack — Backend](./TECH-STACK.md#3-backend-api) and [Frontend–API integration](./TECH-STACK.md#9-frontendapi-integration).

## Related docs

- [Authentication](./AUTHENTICATION.md)
- [Business modules](./BUSINESS-MODULES.md)
- [Architecture](./ARCHITECTURE.md)
