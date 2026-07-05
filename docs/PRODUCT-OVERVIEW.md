# Product overview

**Audience:** Engineers, product, and technical partners  
**Last updated:** July 2026

Velon is a **multi-tenant ERP SaaS** positioned as a business operating system. It combines:

- Public marketing and lead capture
- Tenant business workspace (CRM, inventory, procurement, sales, settings, billing)
- Platform super-admin console (tenants, subscriptions, CMS, diagnostics)

At launch, the operational model is:

**one tenant = one workspace = one company profile**

Plans (`STARTER`, `GROWTH`, `ENTERPRISE`) control seats, storage, and module flags via `PlanDefinition` and subscription state.

## Application portals

| Portal                | Routes                                             | Auth scope     | Purpose                   |
| --------------------- | -------------------------------------------------- | -------------- | ------------------------- |
| Marketing             | `/`, `/features`, `/pricing`, `/demo`, legal pages | Public         | Acquisition and trust     |
| Tenant workspace      | `/app/*`                                           | `tenant` JWT   | Business operations       |
| Platform admin        | `/admin/*`                                         | `platform` JWT | SaaS operations           |
| Partner (placeholder) | `/partner`                                         | Future         | Sales partner panel       |
| Public quote view     | `/quote/$token`                                    | Token          | Customer-facing quotation |

## Related docs

- [Architecture](./ARCHITECTURE.md)
- [Business modules](./BUSINESS-MODULES.md)
- [Tenant workspace user guide](./TENANT-WORKSPACE-GUIDE.md)
- [Product requirements (PRD)](../Velon-PRD.md)
