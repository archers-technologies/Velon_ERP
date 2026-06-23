# Phase 3C — Quotations & Proposal Management

**Status:** Complete  
**Date:** 2026-06-07  
**Prerequisites:** Phase 3B (Sales Pipeline), Phase 3A (CRM Foundation)

---

## Executive summary

Phase 3C converts CRM opportunities into **quotations** and **proposal PDFs** with approval workflow, revision control, tenant-scoped numbering (`QTN-YYYY-XXXXX`), and a **tokenized customer portal** (no ERP login). Sales orders, invoicing, accounting, procurement, inventory, and finance were **not** started.

---

## Success criteria

| Criterion | Result |
|-----------|--------|
| Quotation CRUD + numbering engine | **Pass** |
| Quotation items (add/edit/remove/bulk/recalculate) | **Pass** |
| Server-side PDF generation + version storage | **Pass** |
| Approval workflow (send/approve/reject/cancel/expire/clone/revision) | **Pass** |
| Approval history with user, action, timestamp, comments | **Pass** |
| Customer portal (view PDF, accept/reject/comment) | **Pass** |
| Dashboard metrics | **Pass** |
| Tenant isolation | **Pass** — `crm-quotation-isolation.e2e-spec.ts` |
| Audit events | **Pass** |
| UI routes | **Pass** |

---

## Database schema

**Migration:** `packages/database/prisma/migrations/20260625120000_phase3c_quotations/`

### Enums

| Enum | Values |
|------|--------|
| `CrmQuotationStatus` | DRAFT, SENT, VIEWED, APPROVED, REJECTED, EXPIRED, CANCELLED |
| `CrmQuotationApprovalAction` | SENT, VIEWED, APPROVED, REJECTED, CANCELLED, EXPIRED, REVISION_CREATED, COMMENT |

### Models

| Model | Purpose |
|-------|---------|
| `CrmQuotation` | Header: number, customer, opportunity, dates, status, totals, terms, revision chain, portal token hash |
| `CrmQuotationItem` | Line items with qty, price, discount, tax, line total |
| `CrmQuotationApprovalHistory` | Approval/comment audit trail |
| `CrmProposalDocument` | Versioned PDF binary (`BYTEA`) per quotation |
| `CrmProposalTemplate` | Reusable scope/deliverables/terms templates |
| `CrmQuotationNumberSequence` | Per-tenant per-year sequence for `QTN-YYYY-XXXXX` |

### CompanyProfile extensions (branding)

Added optional: `address`, `website`, `taxId`, `logoDataUrl` for PDF branding.

---

## PDF engine architecture

```
CrmQuotationService.generateProposal()
        │
        ▼
ProposalPdfService (pdfkit)
        │
        ├── Cover page (quotation #, customer, dates, revision)
        ├── Customer & company information
        ├── Scope of work / deliverables
        ├── Pricing table + totals
        ├── Terms & signature block
        └── Page footers with page numbers
        │
        ▼
CrmProposalDocumentRepository → PostgreSQL BYTEA (versioned)
```

- **Library:** `pdfkit` (`apps/api`)
- **Storage:** `CrmProposalDocument.pdfContent` — server-generated, version-tracked
- **Branding:** `CompanyProfile` + `Tenant`/`Workspace` names; logo via `logoDataUrl` when set

---

## APIs

Base (authenticated): `/api/v1/crm` — JWT + tenant scope  
Public portal: `/api/v1/crm/customer-view/:token` — no auth

### Quotations — `/quotations`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/quotation-metrics` | Dashboard metrics |
| GET | `/quotations` | List + filter |
| GET | `/quotations/:id` | Detail with items, history |
| POST | `/quotations` | Create (auto-numbered) |
| POST | `/quotations/from-opportunity/:id` | Create from opportunity |
| PATCH | `/quotations/:id` | Edit draft/sent/viewed |
| POST | `/quotations/:id/send` | Send + portal token |
| POST | `/quotations/:id/approve` | Approve |
| POST | `/quotations/:id/reject` | Reject |
| POST | `/quotations/:id/cancel` | Cancel |
| POST | `/quotations/:id/expire` | Mark expired |
| POST | `/quotations/:id/clone` | Clone to new draft |
| POST | `/quotations/:id/revision` | Create revision |
| GET | `/quotations/:id/approval-history` | History log |

### Items — `/quotation-items`

| Method | Path |
|--------|------|
| POST | `/quotation-items?quotationId=` |
| POST | `/quotation-items/bulk?quotationId=` |
| PATCH | `/quotation-items/:id` |
| DELETE | `/quotation-items/:id` |

### Proposals — `/proposals`

| Method | Path |
|--------|------|
| POST | `/proposals/generate/:quotationId` |
| GET | `/proposals?quotationId=` |
| GET | `/proposals/:id/pdf` |

### Templates — `/templates`

| Method | Path |
|--------|------|
| GET/POST | `/templates` |
| PATCH/DELETE | `/templates/:id` |

### Customer portal — `/customer-view/:token`

| Method | Path |
|--------|------|
| GET | `/:token` | View quotation (marks VIEWED) |
| GET | `/:token/pdf` | Download PDF |
| POST | `/:token/accept` | Customer accept |
| POST | `/:token/reject` | Customer reject |
| POST | `/:token/comment` | Customer comment |

---

## Workflow

```
Opportunity → Quotation (DRAFT) → Add items → Generate PDF
     → Send (portal token) → Customer views → Accept/Reject
     → APPROVED → (Sales Order — Phase 3D, not started)
```

**Numbering:** `QTN-2026-00001` via `CrmQuotationNumberSequence` (tenant + year).

**Portal security:** SHA-256 hashed token stored; 30-day expiry; no cross-tenant lookup.

---

## Audit events

| Event | Trigger |
|-------|---------|
| `crm.quotation_created` | Create / clone / from-opportunity / revision |
| `crm.quotation_updated` | Edit / item changes |
| `crm.quotation_sent` | Send to customer |
| `crm.quotation_viewed` | Customer portal first view |
| `crm.quotation_approved` | Internal or customer accept |
| `crm.quotation_rejected` | Internal or customer reject |
| `crm.quotation_cancelled` | Cancel |
| `crm.quotation_revision_created` | New revision |
| `crm.proposal_generated` | PDF generated |

---

## Security

- All models include `tenantId`; repositories extend `TenantScopedRepository`
- Customer portal uses token hash lookup only — no JWT, no tenant context from request
- Portal token never stored in plain text
- Tests: `apps/api/test/crm-quotation-isolation.e2e-spec.ts`

---

## UI routes

| Route | Purpose |
|-------|---------|
| `/app/crm/quotations` | Create, send, approve, items |
| `/app/crm/proposals` | Generate & view versioned PDFs |
| `/app/crm/templates` | Proposal templates |
| `/quote/:token` | Public customer portal |

**API client:** `src/lib/api/crm-quotation.ts`  
**CRM nav:** Foundation, Leads, Opportunities, **Quotations**, **Proposals**, Pipelines, **Templates**

---

## Key files

| Area | Path |
|------|------|
| Schema | `packages/database/prisma/schema.prisma` |
| Migration | `packages/database/prisma/migrations/20260625120000_phase3c_quotations/` |
| Repositories | `apps/api/src/crm/crm-quotation.repositories.ts` |
| Service | `apps/api/src/crm/crm-quotation.service.ts` |
| PDF engine | `apps/api/src/crm/proposal-pdf.service.ts` |
| Controllers | `crm-quotation.controller.ts`, `crm-customer-view.controller.ts` |
| DTOs | `apps/api/src/crm/dto/crm-quotation.dto.ts` |
| E2E tests | `apps/api/test/crm-quotation-isolation.e2e-spec.ts` |

---

## Verification

```bash
npm run db:generate
npm run db:migrate
npm run build -w @velon/api
npm run typecheck
# With DATABASE_URL + REDIS_URL:
npm run test:security -w @velon/api
```

---

## Remaining CRM roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 3A | Customers, contacts, notes, activities | ✅ |
| 3B | Leads, opportunities, pipelines | ✅ |
| 3C | Quotations, proposals, customer portal | ✅ |
| **3D** | **Sales orders** | 🔲 Not started |
| 3E | Quote-to-order, enhanced PDF export | 🔲 Future |

**Do not begin Sales Orders until Phase 3C is verified in your environment.**

---

## Out of scope (unchanged)

- Sales orders, invoicing, accounting
- Procurement, inventory, finance, HR
- Email delivery of quotations (portal link returned on send)
