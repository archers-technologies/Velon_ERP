# Data model

**Audience:** Engineers  
**Last updated:** July 2026

**Schema:** `packages/database/prisma/schema.prisma`  
**Migrations:** `packages/database/prisma/migrations/`

## Domain groups

### Identity and tenancy

- `User`, `RefreshToken`
- `Tenant`, `CompanyProfile`, `Workspace`
- `TenantMembership`, `Department`, `TenantInvitation`
- `PlanDefinition`, `Subscription`, subscription invoices/payments

### CRM

- `CrmCustomer`, `CrmContact`, `CrmNote`, `CrmActivity`
- `CrmLead`, `CrmPipeline`, `CrmPipelineStage`, `CrmOpportunity`
- `CrmQuotation`, `CrmQuotationItem`, `CrmQuotationApprovalHistory`, `CrmQuotationNumberSequence`
- `CrmProposalDocument`, `CrmProposalTemplate`

### Inventory and supply

- `InventoryCategory`, `InventoryProduct`, `InventoryWarehouse`, `InventoryStock`
- `Supplier`, `SupplierContact`, `SupplierThread`
- `PurchaseRequest` / items, `PurchaseOrder` / items

### Sales

- `SalesOrder`, `SalesOrderItem`, `SalesOrderNumberSequence`

### Platform and workspace support

- `AuditLog`, `Notification`
- `TenantCustomer`, `TenantProject`, `TenantAsset`, `TenantFile` (tenant-resources)

## Conventions

- Primary keys: `cuid()` strings
- Tenant-owned tables include `tenantId` and indexes for tenant-scoped queries
- Soft delete / archive patterns on selected CRM entities
- Monetary fields use `Decimal` where precision matters

## Migrations

Apply in development:

```bash
npm run db:migrate
```

Deploy (CI / Railway pre-deploy):

```bash
npm run db:migrate:deploy
```

Verify deploy script: `npm run db:migrate:verify`

## Tech used

PostgreSQL 16, Prisma ORM, optional MongoDB. See [Tech stack — Data and persistence](./TECH-STACK.md#4-data-and-persistence).

## Related docs

- [Multi-tenancy](./MULTI-TENANCY.md)
- [Business modules](./BUSINESS-MODULES.md)
- [Operations](./OPERATIONS.md)
