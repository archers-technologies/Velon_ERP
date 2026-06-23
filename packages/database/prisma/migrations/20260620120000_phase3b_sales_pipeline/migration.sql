-- Phase 3B: sales pipeline (leads, pipelines, stages, opportunities)

CREATE TYPE "CrmLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED');
CREATE TYPE "CrmLeadSource" AS ENUM ('MANUAL', 'WEBSITE', 'REFERRAL', 'EMAIL', 'TRADE_SHOW', 'IMPORT', 'OTHER');
CREATE TYPE "CrmOpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST');

CREATE TABLE "CrmPipeline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmPipelineStage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPipelineStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" "CrmLeadSource" NOT NULL DEFAULT 'MANUAL',
    "industry" TEXT,
    "status" "CrmLeadStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "convertedCustomerId" TEXT,
    "convertedOpportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmOpportunity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opportunityCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerId" TEXT,
    "leadId" TEXT,
    "pipelineId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expectedCloseDate" DATE,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "description" TEXT,
    "status" "CrmOpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "CrmOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmPipeline_tenantId_name_key" ON "CrmPipeline"("tenantId", "name");
CREATE INDEX "CrmPipeline_tenantId_idx" ON "CrmPipeline"("tenantId");

CREATE UNIQUE INDEX "CrmPipelineStage_tenantId_pipelineId_name_key" ON "CrmPipelineStage"("tenantId", "pipelineId", "name");
CREATE INDEX "CrmPipelineStage_tenantId_idx" ON "CrmPipelineStage"("tenantId");
CREATE INDEX "CrmPipelineStage_tenantId_pipelineId_idx" ON "CrmPipelineStage"("tenantId", "pipelineId");

CREATE UNIQUE INDEX "CrmLead_tenantId_leadCode_key" ON "CrmLead"("tenantId", "leadCode");
CREATE INDEX "CrmLead_tenantId_idx" ON "CrmLead"("tenantId");
CREATE INDEX "CrmLead_tenantId_status_idx" ON "CrmLead"("tenantId", "status");
CREATE INDEX "CrmLead_tenantId_assignedToId_idx" ON "CrmLead"("tenantId", "assignedToId");
CREATE INDEX "CrmLead_tenantId_archivedAt_idx" ON "CrmLead"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "CrmOpportunity_tenantId_opportunityCode_key" ON "CrmOpportunity"("tenantId", "opportunityCode");
CREATE INDEX "CrmOpportunity_tenantId_idx" ON "CrmOpportunity"("tenantId");
CREATE INDEX "CrmOpportunity_tenantId_status_idx" ON "CrmOpportunity"("tenantId", "status");
CREATE INDEX "CrmOpportunity_tenantId_pipelineId_idx" ON "CrmOpportunity"("tenantId", "pipelineId");
CREATE INDEX "CrmOpportunity_tenantId_stageId_idx" ON "CrmOpportunity"("tenantId", "stageId");
CREATE INDEX "CrmOpportunity_tenantId_ownerId_idx" ON "CrmOpportunity"("tenantId", "ownerId");
CREATE INDEX "CrmOpportunity_tenantId_archivedAt_idx" ON "CrmOpportunity"("tenantId", "archivedAt");

ALTER TABLE "CrmPipeline" ADD CONSTRAINT "CrmPipeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmPipelineStage" ADD CONSTRAINT "CrmPipelineStage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmPipelineStage" ADD CONSTRAINT "CrmPipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_convertedCustomerId_fkey" FOREIGN KEY ("convertedCustomerId") REFERENCES "CrmCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CrmPipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
