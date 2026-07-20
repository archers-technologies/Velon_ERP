-- Business Development Suite + HRMS & Payroll (tenant-isolated).
-- Does not modify SalesInvoice / invoice PDF tables.

-- Quotation document builder fields
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "coverTitle" TEXT;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "executiveSummary" TEXT;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "timeline" TEXT;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "assumptions" TEXT;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "exclusions" TEXT;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "documentJson" JSONB;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "signatureName" TEXT;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "signatureDataUrl" TEXT;
ALTER TABLE "CrmQuotation" ADD COLUMN IF NOT EXISTS "signedAt" TIMESTAMP(3);

ALTER TABLE "CrmProposalDocument" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "CrmProposalDocument" ADD COLUMN IF NOT EXISTS "documentJson" JSONB;

ALTER TABLE "CrmProposalTemplate" ADD COLUMN IF NOT EXISTS "sectionsJson" JSONB;

CREATE TABLE IF NOT EXISTS "CrmContentBlock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "contentJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmContentBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CrmContentBlock_tenantId_name_key" ON "CrmContentBlock"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "CrmContentBlock_tenantId_idx" ON "CrmContentBlock"("tenantId");
CREATE INDEX IF NOT EXISTS "CrmContentBlock_tenantId_category_idx" ON "CrmContentBlock"("tenantId", "category");

CREATE TABLE IF NOT EXISTS "CrmDocumentComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmDocumentComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CrmDocumentComment_tenantId_idx" ON "CrmDocumentComment"("tenantId");
CREATE INDEX IF NOT EXISTS "CrmDocumentComment_tenantId_quotationId_idx" ON "CrmDocumentComment"("tenantId", "quotationId");

DO $$ BEGIN
  CREATE TYPE "CompanyLibraryAssetCategory" AS ENUM ('COMPANY_PROFILE', 'PRODUCT_CATALOG', 'BROCHURE', 'CERTIFICATION', 'LICENSE', 'CASE_STUDY', 'AWARD', 'PRESENTATION', 'MARKETING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CompanyLibraryAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CompanyLibraryAssetCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "fileContent" BYTEA NOT NULL,
    "contentJson" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanyLibraryAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompanyLibraryAsset_tenantId_idx" ON "CompanyLibraryAsset"("tenantId");
CREATE INDEX IF NOT EXISTS "CompanyLibraryAsset_tenantId_category_idx" ON "CompanyLibraryAsset"("tenantId", "category");

-- HR enums
DO $$ BEGIN CREATE TYPE "HrEmploymentStatus" AS ENUM ('ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HrLeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HrAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HrPayrollRunStatus" AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HrSalaryComponentType" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HrExpenseClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HrApplicantStatus" AS ENUM ('NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HrJobOpeningStatus" AS ENUM ('DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED', 'FILLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "HrDesignation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrDesignation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrDesignation_tenantId_name_key" ON "HrDesignation"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "HrDesignation_tenantId_idx" ON "HrDesignation"("tenantId");

CREATE TABLE IF NOT EXISTS "HrSalaryStructure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrSalaryStructure_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrSalaryStructure_tenantId_name_key" ON "HrSalaryStructure"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "HrSalaryStructure_tenantId_idx" ON "HrSalaryStructure"("tenantId");

CREATE TABLE IF NOT EXISTS "HrSalaryComponent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "HrSalaryComponentType" NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrSalaryComponent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrSalaryComponent_tenantId_code_key" ON "HrSalaryComponent"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "HrSalaryComponent_tenantId_idx" ON "HrSalaryComponent"("tenantId");

CREATE TABLE IF NOT EXISTS "HrSalaryStructureItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "percentage" DECIMAL(8,2),
    "formula" TEXT,
    CONSTRAINT "HrSalaryStructureItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrSalaryStructureItem_tenantId_structureId_componentId_key" ON "HrSalaryStructureItem"("tenantId", "structureId", "componentId");
CREATE INDEX IF NOT EXISTS "HrSalaryStructureItem_tenantId_idx" ON "HrSalaryStructureItem"("tenantId");

CREATE TABLE IF NOT EXISTS "HrEmployee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" DATE,
    "hireDate" DATE NOT NULL,
    "probationEndDate" DATE,
    "terminationDate" DATE,
    "status" "HrEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" TEXT,
    "designationId" TEXT,
    "managerId" TEXT,
    "userId" TEXT,
    "branchName" TEXT,
    "workLocation" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "baseSalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "salaryStructureId" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEmployee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrEmployee_tenantId_employeeCode_key" ON "HrEmployee"("tenantId", "employeeCode");
CREATE INDEX IF NOT EXISTS "HrEmployee_tenantId_idx" ON "HrEmployee"("tenantId");
CREATE INDEX IF NOT EXISTS "HrEmployee_tenantId_status_idx" ON "HrEmployee"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "HrEmployee_tenantId_departmentId_idx" ON "HrEmployee"("tenantId", "departmentId");
CREATE INDEX IF NOT EXISTS "HrEmployee_tenantId_managerId_idx" ON "HrEmployee"("tenantId", "managerId");

CREATE TABLE IF NOT EXISTS "HrEmployeeDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "fileContent" BYTEA NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEmployeeDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HrEmployeeDocument_tenantId_idx" ON "HrEmployeeDocument"("tenantId");
CREATE INDEX IF NOT EXISTS "HrEmployeeDocument_tenantId_employeeId_idx" ON "HrEmployeeDocument"("tenantId", "employeeId");

CREATE TABLE IF NOT EXISTS "HrEmployeeNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEmployeeNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HrEmployeeNote_tenantId_idx" ON "HrEmployeeNote"("tenantId");
CREATE INDEX IF NOT EXISTS "HrEmployeeNote_tenantId_employeeId_idx" ON "HrEmployeeNote"("tenantId", "employeeId");

CREATE TABLE IF NOT EXISTS "HrJobOpening" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT,
    "description" TEXT,
    "location" TEXT,
    "status" "HrJobOpeningStatus" NOT NULL DEFAULT 'DRAFT',
    "openings" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrJobOpening_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HrJobOpening_tenantId_idx" ON "HrJobOpening"("tenantId");
CREATE INDEX IF NOT EXISTS "HrJobOpening_tenantId_status_idx" ON "HrJobOpening"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "HrApplicant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobOpeningId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resumeText" TEXT,
    "resumeMime" TEXT,
    "resumeFile" BYTEA,
    "status" "HrApplicantStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrApplicant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HrApplicant_tenantId_idx" ON "HrApplicant"("tenantId");
CREATE INDEX IF NOT EXISTS "HrApplicant_tenantId_jobOpeningId_idx" ON "HrApplicant"("tenantId", "jobOpeningId");
CREATE INDEX IF NOT EXISTS "HrApplicant_tenantId_status_idx" ON "HrApplicant"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "HrLeaveType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "annualAllowance" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "accrualEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrLeaveType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrLeaveType_tenantId_code_key" ON "HrLeaveType"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "HrLeaveType_tenantId_idx" ON "HrLeaveType"("tenantId");

CREATE TABLE IF NOT EXISTS "HrLeaveBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "entitled" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "used" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "pending" DECIMAL(8,2) NOT NULL DEFAULT 0,
    CONSTRAINT "HrLeaveBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrLeaveBalance_tenantId_employeeId_leaveTypeId_year_key" ON "HrLeaveBalance"("tenantId", "employeeId", "leaveTypeId", "year");
CREATE INDEX IF NOT EXISTS "HrLeaveBalance_tenantId_idx" ON "HrLeaveBalance"("tenantId");

CREATE TABLE IF NOT EXISTS "HrLeaveRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" DECIMAL(8,2) NOT NULL,
    "reason" TEXT,
    "status" "HrLeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrLeaveRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HrLeaveRequest_tenantId_idx" ON "HrLeaveRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "HrLeaveRequest_tenantId_employeeId_idx" ON "HrLeaveRequest"("tenantId", "employeeId");
CREATE INDEX IF NOT EXISTS "HrLeaveRequest_tenantId_status_idx" ON "HrLeaveRequest"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "HrShift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakMins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrShift_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrShift_tenantId_name_key" ON "HrShift"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "HrShift_tenantId_idx" ON "HrShift"("tenantId");

CREATE TABLE IF NOT EXISTS "HrAttendanceRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "shiftId" TEXT,
    "status" "HrAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "overtimeMins" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrAttendanceRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrAttendanceRecord_tenantId_employeeId_workDate_key" ON "HrAttendanceRecord"("tenantId", "employeeId", "workDate");
CREATE INDEX IF NOT EXISTS "HrAttendanceRecord_tenantId_idx" ON "HrAttendanceRecord"("tenantId");
CREATE INDEX IF NOT EXISTS "HrAttendanceRecord_tenantId_workDate_idx" ON "HrAttendanceRecord"("tenantId", "workDate");

CREATE TABLE IF NOT EXISTS "HrHolidayCalendar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrHolidayCalendar_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrHolidayCalendar_tenantId_name_year_key" ON "HrHolidayCalendar"("tenantId", "name", "year");
CREATE INDEX IF NOT EXISTS "HrHolidayCalendar_tenantId_idx" ON "HrHolidayCalendar"("tenantId");

CREATE TABLE IF NOT EXISTS "HrHoliday" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "holidayDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HrHoliday_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HrHoliday_tenantId_idx" ON "HrHoliday"("tenantId");
CREATE INDEX IF NOT EXISTS "HrHoliday_tenantId_calendarId_idx" ON "HrHoliday"("tenantId", "calendarId");

CREATE TABLE IF NOT EXISTS "HrPayrollRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" "HrPayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrPayrollRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HrPayrollRun_tenantId_idx" ON "HrPayrollRun"("tenantId");
CREATE INDEX IF NOT EXISTS "HrPayrollRun_tenantId_status_idx" ON "HrPayrollRun"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "HrPayslip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grossPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "linesJson" JSONB,
    "pdfContent" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrPayslip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HrPayslip_tenantId_payrollRunId_employeeId_key" ON "HrPayslip"("tenantId", "payrollRunId", "employeeId");
CREATE INDEX IF NOT EXISTS "HrPayslip_tenantId_idx" ON "HrPayslip"("tenantId");
CREATE INDEX IF NOT EXISTS "HrPayslip_tenantId_employeeId_idx" ON "HrPayslip"("tenantId", "employeeId");

CREATE TABLE IF NOT EXISTS "HrExpenseClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "HrExpenseClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "receiptMime" TEXT,
    "receiptFile" BYTEA,
    "notes" TEXT,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExpenseClaim_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HrExpenseClaim_tenantId_idx" ON "HrExpenseClaim"("tenantId");
CREATE INDEX IF NOT EXISTS "HrExpenseClaim_tenantId_employeeId_idx" ON "HrExpenseClaim"("tenantId", "employeeId");
CREATE INDEX IF NOT EXISTS "HrExpenseClaim_tenantId_status_idx" ON "HrExpenseClaim"("tenantId", "status");

-- Foreign keys (best-effort; ignore if already present)
DO $$ BEGIN
  ALTER TABLE "CrmContentBlock" ADD CONSTRAINT "CrmContentBlock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CrmDocumentComment" ADD CONSTRAINT "CrmDocumentComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CrmDocumentComment" ADD CONSTRAINT "CrmDocumentComment_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "CrmQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CrmDocumentComment" ADD CONSTRAINT "CrmDocumentComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyLibraryAsset" ADD CONSTRAINT "CompanyLibraryAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyLibraryAsset" ADD CONSTRAINT "CompanyLibraryAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "HrDesignation" ADD CONSTRAINT "HrDesignation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrSalaryStructure" ADD CONSTRAINT "HrSalaryStructure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrSalaryComponent" ADD CONSTRAINT "HrSalaryComponent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrSalaryStructureItem" ADD CONSTRAINT "HrSalaryStructureItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrSalaryStructureItem" ADD CONSTRAINT "HrSalaryStructureItem_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "HrSalaryStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrSalaryStructureItem" ADD CONSTRAINT "HrSalaryStructureItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "HrSalaryComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "HrDesignation"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "HrEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "HrSalaryStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployeeDocument" ADD CONSTRAINT "HrEmployeeDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployeeDocument" ADD CONSTRAINT "HrEmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployeeNote" ADD CONSTRAINT "HrEmployeeNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrEmployeeNote" ADD CONSTRAINT "HrEmployeeNote_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrJobOpening" ADD CONSTRAINT "HrJobOpening_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrJobOpening" ADD CONSTRAINT "HrJobOpening_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrApplicant" ADD CONSTRAINT "HrApplicant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrApplicant" ADD CONSTRAINT "HrApplicant_jobOpeningId_fkey" FOREIGN KEY ("jobOpeningId") REFERENCES "HrJobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveType" ADD CONSTRAINT "HrLeaveType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveBalance" ADD CONSTRAINT "HrLeaveBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveBalance" ADD CONSTRAINT "HrLeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveBalance" ADD CONSTRAINT "HrLeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "HrLeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveRequest" ADD CONSTRAINT "HrLeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveRequest" ADD CONSTRAINT "HrLeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveRequest" ADD CONSTRAINT "HrLeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "HrLeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveRequest" ADD CONSTRAINT "HrLeaveRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrLeaveRequest" ADD CONSTRAINT "HrLeaveRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrShift" ADD CONSTRAINT "HrShift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrAttendanceRecord" ADD CONSTRAINT "HrAttendanceRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrAttendanceRecord" ADD CONSTRAINT "HrAttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrAttendanceRecord" ADD CONSTRAINT "HrAttendanceRecord_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "HrShift"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrHolidayCalendar" ADD CONSTRAINT "HrHolidayCalendar_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrHoliday" ADD CONSTRAINT "HrHoliday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrHoliday" ADD CONSTRAINT "HrHoliday_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "HrHolidayCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrPayrollRun" ADD CONSTRAINT "HrPayrollRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrPayrollRun" ADD CONSTRAINT "HrPayrollRun_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "HrPayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrPayslip" ADD CONSTRAINT "HrPayslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrExpenseClaim" ADD CONSTRAINT "HrExpenseClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrExpenseClaim" ADD CONSTRAINT "HrExpenseClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrExpenseClaim" ADD CONSTRAINT "HrExpenseClaim_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "HrExpenseClaim" ADD CONSTRAINT "HrExpenseClaim_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
