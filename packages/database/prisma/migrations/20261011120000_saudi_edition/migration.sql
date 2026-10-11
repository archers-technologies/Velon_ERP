-- Saudi edition defaults and VAT configuration.
-- Existing workspace rows and issued invoices are left unchanged.

ALTER TABLE "PlanDefinition" ALTER COLUMN "currency" SET DEFAULT 'SAR';
ALTER TABLE "PlanDefinition" ADD COLUMN IF NOT EXISTS "saudiMonthlyPrice" DECIMAL(12,2);
ALTER TABLE "PlanDefinition" ADD COLUMN IF NOT EXISTS "saudiAnnualPrice" DECIMAL(12,2);

ALTER TABLE "Workspace" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Riyadh';
ALTER TABLE "Workspace" ALTER COLUMN "countryCode" SET DEFAULT 'SA';
ALTER TABLE "Workspace" ALTER COLUMN "currency" SET DEFAULT 'SAR';
ALTER TABLE "Workspace" ALTER COLUMN "language" SET DEFAULT 'ar';
ALTER TABLE "Workspace" ALTER COLUMN "numberFormat" SET DEFAULT 'ar-SA';

ALTER TABLE "SalesInvoice" ALTER COLUMN "currency" SET DEFAULT 'SAR';
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "invoiceKind" TEXT NOT NULL DEFAULT 'TAX_INVOICE';
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "zatcaUuid" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "zatcaQrPayload" TEXT;
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "zatcaStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "zatcaStatusDetail" TEXT;

ALTER TABLE "SalesInvoiceItem" ADD COLUMN IF NOT EXISTS "taxTreatment" TEXT;

ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "legalNameAr" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "commercialRegistrationNumber" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "vatRegistrationNumber" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "buildingNumber" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "streetName" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "additionalNumber" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "region" TEXT;

ALTER TABLE "SubscriptionInvoice" ALTER COLUMN "currency" SET DEFAULT 'SAR';
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "currency" SET DEFAULT 'SAR';
ALTER TABLE "HrExpenseClaim" ALTER COLUMN "currency" SET DEFAULT 'SAR';

CREATE TABLE IF NOT EXISTS "VatTaxRule" (
  "id" TEXT NOT NULL,
  "treatment" TEXT NOT NULL,
  "ratePercent" DECIMAL(5,2) NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "sourceUrl" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VatTaxRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VatTaxRule_treatment_effectiveFrom_key"
  ON "VatTaxRule"("treatment", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "VatTaxRule_treatment_idx" ON "VatTaxRule"("treatment");

INSERT INTO "VatTaxRule" ("id", "treatment", "ratePercent", "effectiveFrom", "effectiveTo", "sourceUrl", "notes")
SELECT
  'vat-standard-5-2018',
  'STANDARD',
  5,
  DATE '2018-01-01',
  DATE '2020-06-30',
  'https://zatca.gov.sa/en/MediaCenter/News/Pages/News-320.aspx',
  'Standard rate before the 1 July 2020 increase. Historical invoices keep this rate.'
WHERE NOT EXISTS (
  SELECT 1 FROM "VatTaxRule" WHERE "treatment" = 'STANDARD' AND "effectiveFrom" = DATE '2018-01-01'
);

INSERT INTO "VatTaxRule" ("id", "treatment", "ratePercent", "effectiveFrom", "effectiveTo", "sourceUrl", "notes")
SELECT
  'vat-standard-15-2020',
  'STANDARD',
  15,
  DATE '2020-07-01',
  NULL,
  'https://zatca.gov.sa/en/HelpCenter/guidelines/Documents/Amendments-to-the-Implementing-Regulation-of-%28VAT%29.PDF',
  'Current standard rate stated by ZATCA. Zero-rated and exempt supplies are selected per transaction.'
WHERE NOT EXISTS (
  SELECT 1 FROM "VatTaxRule" WHERE "treatment" = 'STANDARD' AND "effectiveFrom" = DATE '2020-07-01'
);
