-- Workspace localization fields (country, currency symbol, date/number formats)
ALTER TABLE "Workspace"
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS "currencySymbol" TEXT,
  ADD COLUMN IF NOT EXISTS "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS "numberFormat" TEXT NOT NULL DEFAULT 'en-IN';

-- Backfill from tenant / company profile where possible
UPDATE "Workspace" w
SET "countryCode" = CASE
  WHEN cp."country" ILIKE '%india%' THEN 'IN'
  WHEN cp."country" ILIKE '%saudi%' THEN 'SA'
  WHEN cp."country" ILIKE '%bahrain%' THEN 'BH'
  WHEN cp."country" ILIKE '%oman%' THEN 'OM'
  WHEN cp."country" ILIKE '%qatar%' THEN 'QA'
  WHEN cp."country" ILIKE '%kuwait%' THEN 'KW'
  WHEN cp."country" ILIKE '%emirates%' OR cp."country" ILIKE '%uae%' THEN 'AE'
  WHEN cp."country" ILIKE '%united states%' OR cp."country" ILIKE '%usa%' THEN 'US'
  WHEN cp."country" ILIKE '%united kingdom%' OR cp."country" ILIKE '%uk%' THEN 'GB'
  ELSE COALESCE(w."countryCode", 'IN')
END
FROM "CompanyProfile" cp
WHERE cp."tenantId" = w."tenantId";

UPDATE "Workspace"
SET "currencySymbol" = CASE "currency"
  WHEN 'INR' THEN '₹'
  WHEN 'USD' THEN '$'
  WHEN 'AED' THEN 'د.إ'
  WHEN 'SAR' THEN '﷼'
  WHEN 'BHD' THEN '.د.ب'
  WHEN 'OMR' THEN 'ر.ع.'
  WHEN 'QAR' THEN 'ر.ق'
  WHEN 'KWD' THEN 'د.ك'
  WHEN 'GBP' THEN '£'
  WHEN 'EUR' THEN '€'
  ELSE "currency"
END
WHERE "currencySymbol" IS NULL;
