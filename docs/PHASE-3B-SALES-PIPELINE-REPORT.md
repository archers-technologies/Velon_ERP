# Phase 3B — Sales Pipeline Foundation

**Status:** Complete  
**Date:** 2026-06-07  
**Prerequisites:** Phase 3A (CRM Foundation), Phase 2D.1 (Postgres + Redis)

---

## Executive summary

Phase 3B extends CRM into a sales execution system with **Leads**, **Opportunities**, **Pipelines**, and **Pipeline Stages**. All entities are tenant-scoped via `TenantScopedRepository`, audited, and exposed through REST APIs and workspace UI routes. Quotations, invoices, procurement, finance, inventory, HR, and project management were **not** started.

---

## Success criteria

| Criterion | Result |
|-----------|--------|
| Leads CRUD, assign, convert, archive, search, filter | **Pass** |
| Opportunities CRUD, move stage, won/lost, archive, search | **Pass** |
| Pipelines CRUD, default pipeline seeding | **Pass** |
| Stages CRUD, reorder, delete (guarded) | **Pass** |
| Dashboard metrics | **Pass** — `GET /crm/dashboard-metrics` |
| Tenant isolation | **Pass** — `crm-pipeline-isolation.e2e-spec.ts` |
| Repository pattern (no controller tenant filtering) | **Pass** |
| Audit events | **Pass** |
| UI routes `/app/crm/leads`, `/opportunities`, `/pipelines` | **Pass** |
| Integrated CRM navigation | **Pass** |

---

## Database schema

**Migration:** `packages/database/prisma/migrations/20260620120000_phase3b_sales_pipeline/`

### Enums

| Enum | Values |
|------|--------|
| `CrmLeadStatus` | NEW, CONTACTED, QUALIFIED, DISQUALIFIED, CONVERTED |
| `CrmLeadSource` | MANUAL, WEBSITE, REFERRAL, EMAIL, TRADE_SHOW, IMPORT, OTHER |
| `CrmOpportunityStatus` | OPEN, WON, LOST |

### Models

| Model | Key fields |
|-------|------------|
| `CrmLead` | `leadCode`, `companyName`, `contactName`, `email`, `phone`, `source`, `industry`, `status`, `assignedToId`, `notes`, `archivedAt`, `convertedCustomerId`, `convertedOpportunityId`, `createdById` |
| `CrmPipeline` | `name`, `description`, `isDefault` |
| `CrmPipelineStage` | `pipelineId`, `name`, `position`, `probability` |
| `CrmOpportunity` | `opportunityCode`, `title`, `customerId`, `leadId`, `pipelineId`, `stageId`, `value`, `expectedCloseDate`, `probability`, `ownerId`, `description`, `status`, `archivedAt` |

### Default pipeline

On first access per tenant, **General Sales** is created with stages:

New (10%) → Contacted (20%) → Qualified (40%) → Proposal (60%) → Negotiation (80%) → Won (100%) → Lost (0%)

---

## APIs

Base: `/api/v1/crm` — JWT + `RequirePortalScope("tenant")` + `TenantScopeGuard` + `TenantContextInterceptor`

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard-metrics` | Total/qualified leads, open/won/lost opportunities, pipeline value, expected revenue |

### Leads — `/leads`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/leads?search=&status=&source=&assignedToId=` | List + filter |
| GET | `/leads/:id` | Detail |
| POST | `/leads` | Create |
| PATCH | `/leads/:id` | Edit |
| POST | `/leads/:id/assign` | Assign owner |
| POST | `/leads/:id/convert` | Convert → customer + opportunity |
| POST | `/leads/:id/archive` | Archive |

### Opportunities — `/opportunities`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/opportunities?search=&pipelineId=&stageId=&status=&ownerId=` | List + filter |
| GET | `/opportunities/:id` | Detail |
| POST | `/opportunities` | Create |
| PATCH | `/opportunities/:id` | Edit |
| POST | `/opportunities/:id/move-stage` | Move between stages |
| POST | `/opportunities/:id/won` | Close won |
| POST | `/opportunities/:id/lost` | Close lost |
| POST | `/opportunities/:id/archive` | Archive |

### Pipelines — `/pipelines`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pipelines` | List (auto-seeds default) |
| GET | `/pipelines/:id` | Detail with stages |
| POST | `/pipelines` | Create (+ default stages) |
| PATCH | `/pipelines/:id` | Edit |
| POST | `/pipelines/:id/default` | Set default |
| DELETE | `/pipelines/:id` | Delete (guarded) |

### Stages — `/stages`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stages?pipelineId=` | List by pipeline |
| POST | `/stages` | Create |
| PATCH | `/stages/:id` | Edit |
| POST | `/stages/reorder` | Reorder positions |
| DELETE | `/stages/:id` | Delete (guarded) |

---

## Opportunity workflow

```
Lead → Qualified → Convert → Opportunity → Pipeline Stage → Won / Lost
```

Lead conversion creates a `CrmCustomer` (PROSPECT) and `CrmOpportunity` on the Qualified stage of the selected (or default) pipeline.

---

## Audit events

| Event | Trigger |
|-------|---------|
| `crm.lead_created` | Lead create |
| `crm.lead_updated` | Lead edit / archive |
| `crm.lead_assigned` | Lead assign |
| `crm.lead_converted` | Lead convert |
| `crm.opportunity_created` | Opportunity create (incl. from convert) |
| `crm.opportunity_updated` | Opportunity edit / archive |
| `crm.opportunity_stage_changed` | Stage move |
| `crm.opportunity_won` | Close won |
| `crm.opportunity_lost` | Close lost |
| `crm.pipeline_created` | Pipeline create / default seed |
| `crm.pipeline_updated` | Pipeline edit, default, stage CRUD, reorder, delete |

---

## Security

- All models include `tenantId` with cascade from `Tenant`
- Repositories: `CrmLeadRepository`, `CrmPipelineRepository`, `CrmPipelineStageRepository`, `CrmOpportunityRepository` extend `TenantScopedRepository`
- Permissions: `canReadCrm` / `canWriteCrmRecords` from `@velon/shared`
- Tests: `apps/api/test/crm-pipeline-isolation.e2e-spec.ts` (included in `test:security`)

---

## UI routes

| Route | Purpose |
|-------|---------|
| `/app/crm` | CRM layout with dashboard metrics + nav |
| `/app/crm/` | Foundation (customers, contacts, activities, notes — Phase 3A) |
| `/app/crm/leads` | Lead list, create, convert, archive |
| `/app/crm/opportunities` | Opportunity list, create, stage move, won/lost |
| `/app/crm/pipelines` | Pipeline + stage management |

**API client:** `src/lib/api/crm-pipeline.ts`  
**Nav:** Workspace sidebar CRM link → `/app/crm` (Foundation tab)

---

## Key files

| Area | Path |
|------|------|
| Schema | `packages/database/prisma/schema.prisma` |
| Migration | `packages/database/prisma/migrations/20260620120000_phase3b_sales_pipeline/` |
| Repositories | `apps/api/src/crm/crm-pipeline.repositories.ts` |
| Service | `apps/api/src/crm/crm-pipeline.service.ts` |
| Controller | `apps/api/src/crm/crm-pipeline.controller.ts` |
| DTOs | `apps/api/src/crm/dto/crm-pipeline.dto.ts` |
| Defaults | `apps/api/src/crm/crm-pipeline.defaults.ts` |
| E2E tests | `apps/api/test/crm-pipeline-isolation.e2e-spec.ts` |
| UI layout | `src/routes/app.crm.tsx` |
| UI pages | `src/routes/app.crm.{index,leads,opportunities,pipelines}.tsx` |

---

## Verification

```bash
npm run db:generate
npm run build -w @velon/api
npm run typecheck
# With DATABASE_URL + REDIS_URL:
npm run test:security -w @velon/api
```

Apply migration in deployed environments:

```bash
npm run db:migrate
```

---

## Remaining CRM roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **3A** | Customers, contacts, notes, activities | ✅ Complete |
| **3B** | Leads, opportunities, pipelines, stages | ✅ Complete |
| **3C** | Quotations / proposals | 🔲 Not started |
| **3D** | Sales orders | 🔲 Not started |
| **3E** | Quote-to-order workflow, PDF export | 🔲 Not started |
| **4+** | Marketing campaigns, email sequences | 🔲 Future |

**Do not begin quotations or sales orders until Phase 3B is verified in your environment.**

---

## Out of scope (unchanged)

- Quotations, invoices, procurement
- Finance, inventory, HR, payroll
- Project management
- Redesign of CRM UI shell
