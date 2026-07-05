# Business modules

**Audience:** Engineers, product  
**Last updated:** July 2026

## Implemented (API-backed)

| Module           | Nest module         | Capabilities                                                                                                                                      |
| ---------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workspace**    | `WorkspaceModule`   | Context, dashboard metrics, alerts, notifications, POS bootstrap/sales, module summary endpoints                                                  |
| **Tenant admin** | `TenantAdminModule` | Company profile, workspace prefs, departments, members, invitations, seats, audit                                                                 |
| **CRM**          | `CrmModule`         | Customers, contacts, notes, activities, leads, pipelines/stages, opportunities, quotations, proposals/PDF, templates, public customer-view tokens |
| **Inventory**    | `InventoryModule`   | Categories, products, warehouses, stock adjust/transfer                                                                                           |
| **Suppliers**    | `SuppliersModule`   | Suppliers, contacts, communication threads                                                                                                        |
| **Procurement**  | `ProcurementModule` | Purchase requests (submit/approve/reject), purchase orders (approve/send/receive)                                                                 |
| **Sales**        | `SalesModule`       | Sales orders from approved quotations                                                                                                             |
| **Billing**      | `BillingModule`     | Plans, checkout, Razorpay verify/webhooks, invoices/payments, platform subscription ops                                                           |
| **Platform**     | `PlatformModule`    | Overview, diagnostics, platform users, demo cleanup                                                                                               |
| **CMS**          | `CmsModule`         | Public site content + platform CMS edits                                                                                                          |
| **Tenants**      | `TenantsModule`     | Platform tenant CRUD                                                                                                                              |
| **Audit**        | `AuditModule`       | Audit log reads                                                                                                                                   |
| **Health**       | `HealthModule`      | Live / ready probes                                                                                                                               |

## Frontend modules (partial / placeholder UI)

Some `/app` routes present product surfaces that are not fully API-backed yet (for example HR/Payroll, Accounting, AI Copilot, Automations). These use empty states or coming-soon patterns while navigation and permissions remain consistent.

## CRM sales funnel (happy path)

```
Lead → Opportunity (pipeline stage) → Quotation → (customer accept) → Sales order
         ↘ Proposal PDF / public quote token
```

## Billing

- Plans: `STARTER`, `GROWTH`, `ENTERPRISE` with regional pricing (India vs global).
- Providers: Razorpay implemented; Stripe, STC Pay, HyperPay, bank transfer stubbed in provider registry.
- Subscription access helpers in shared (`subscriptionAllowsWorkspaceAccess`, `isBillingPortalPath`) keep billing pages available when the workspace is otherwise locked.

## Tech used per module area

See [Tech stack — Business-domain libraries](./TECH-STACK.md#13-business-domain-libraries-by-module).

## Related docs

- [API reference](./API-REFERENCE.md)
- [Data model](./DATA-MODEL.md)
- [Frontend](./FRONTEND.md)
- [Tenant workspace user guide](./TENANT-WORKSPACE-GUIDE.md)
