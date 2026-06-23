-- Phase 3C: quotations, proposal documents, templates

CREATE TYPE "CrmQuotationStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "CrmQuotationApprovalAction" AS ENUM ('SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'REVISION_CREATED', 'COMMENT');

ALTER TABLE "CompanyProfile" ADD COLUMN "address" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN "website" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN "taxId" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN "logoDataUrl" TEXT;

CREATE TABLE "CrmQuotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "opportunityId" TEXT,
    "customerId" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "expiryDate" DATE,
    "status" "CrmQuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "scopeOfWork" TEXT,
    "deliverables" TEXT,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "parentQuotationId" TEXT,
    "revisionReason" TEXT,
    "portalTokenHash" TEXT,
    "portalTokenExpiresAt" TIMESTAMP(3),
    "portalViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "approvedById" TEXT,

    CONSTRAINT "CrmQuotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmQuotationItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmQuotationItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmQuotationApprovalHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "action" "CrmQuotationApprovalAction" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmQuotationApprovalHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmProposalDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "pdfContent" BYTEA NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,

    CONSTRAINT "CrmProposalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmProposalTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverTitle" TEXT,
    "scopeTemplate" TEXT,
    "deliverablesTemplate" TEXT,
    "termsTemplate" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmProposalTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmQuotationNumberSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CrmQuotationNumberSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmQuotation_portalTokenHash_key" ON "CrmQuotation"("portalTokenHash");
CREATE UNIQUE INDEX "CrmQuotation_tenantId_quotationNumber_key" ON "CrmQuotation"("tenantId", "quotationNumber");
CREATE INDEX "CrmQuotation_tenantId_idx" ON "CrmQuotation"("tenantId");
CREATE INDEX "CrmQuotation_tenantId_status_idx" ON "CrmQuotation"("tenantId", "status");
CREATE INDEX "CrmQuotation_tenantId_customerId_idx" ON "CrmQuotation"("tenantId", "customerId");
CREATE INDEX "CrmQuotation_tenantId_opportunityId_idx" ON "CrmQuotation"("tenantId", "opportunityId");

CREATE INDEX "CrmQuotationItem_tenantId_idx" ON "CrmQuotationItem"("tenantId");
CREATE INDEX "CrmQuotationItem_tenantId_quotationId_idx" ON "CrmQuotationItem"("tenantId", "quotationId");

CREATE INDEX "CrmQuotationApprovalHistory_tenantId_idx" ON "CrmQuotationApprovalHistory"("tenantId");
CREATE INDEX "CrmQuotationApprovalHistory_tenantId_quotationId_idx" ON "CrmQuotationApprovalHistory"("tenantId", "quotationId");

CREATE UNIQUE INDEX "CrmProposalDocument_tenantId_quotationId_version_key" ON "CrmProposalDocument"("tenantId", "quotationId", "version");
CREATE INDEX "CrmProposalDocument_tenantId_idx" ON "CrmProposalDocument"("tenantId");
CREATE INDEX "CrmProposalDocument_tenantId_quotationId_idx" ON "CrmProposalDocument"("tenantId", "quotationId");

CREATE UNIQUE INDEX "CrmProposalTemplate_tenantId_name_key" ON "CrmProposalTemplate"("tenantId", "name");
CREATE INDEX "CrmProposalTemplate_tenantId_idx" ON "CrmProposalTemplate"("tenantId");

CREATE UNIQUE INDEX "CrmQuotationNumberSequence_tenantId_year_key" ON "CrmQuotationNumberSequence"("tenantId", "year");
CREATE INDEX "CrmQuotationNumberSequence_tenantId_idx" ON "CrmQuotationNumberSequence"("tenantId");

ALTER TABLE "CrmQuotation" ADD CONSTRAINT "CrmQuotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmQuotation" ADD CONSTRAINT "CrmQuotation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmQuotation" ADD CONSTRAINT "CrmQuotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmQuotation" ADD CONSTRAINT "CrmQuotation_parentQuotationId_fkey" FOREIGN KEY ("parentQuotationId") REFERENCES "CrmQuotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmQuotation" ADD CONSTRAINT "CrmQuotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmQuotation" ADD CONSTRAINT "CrmQuotation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmQuotationItem" ADD CONSTRAINT "CrmQuotationItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmQuotationItem" ADD CONSTRAINT "CrmQuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "CrmQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmQuotationApprovalHistory" ADD CONSTRAINT "CrmQuotationApprovalHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmQuotationApprovalHistory" ADD CONSTRAINT "CrmQuotationApprovalHistory_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "CrmQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmQuotationApprovalHistory" ADD CONSTRAINT "CrmQuotationApprovalHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmProposalDocument" ADD CONSTRAINT "CrmProposalDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmProposalDocument" ADD CONSTRAINT "CrmProposalDocument_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "CrmQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmProposalDocument" ADD CONSTRAINT "CrmProposalDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmProposalTemplate" ADD CONSTRAINT "CrmProposalTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmQuotationNumberSequence" ADD CONSTRAINT "CrmQuotationNumberSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
