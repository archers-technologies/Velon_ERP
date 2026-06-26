-- Regional plan pricing: India (INR) and Global (USD) price tables
ALTER TABLE "PlanDefinition"
  ADD COLUMN IF NOT EXISTS "indiaMonthlyPrice" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "indiaAnnualPrice" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "globalMonthlyPrice" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "globalAnnualPrice" DECIMAL(12, 2);

UPDATE "PlanDefinition"
SET
  "indiaMonthlyPrice" = COALESCE("indiaMonthlyPrice", CASE WHEN UPPER("currency") = 'INR' THEN "monthlyPrice" ELSE 49 END),
  "indiaAnnualPrice" = COALESCE("indiaAnnualPrice", CASE WHEN UPPER("currency") = 'INR' THEN "annualPrice" ELSE "monthlyPrice" * 10 END),
  "globalMonthlyPrice" = COALESCE("globalMonthlyPrice", CASE WHEN UPPER("currency") = 'USD' THEN "monthlyPrice" ELSE 49 END),
  "globalAnnualPrice" = COALESCE("globalAnnualPrice", CASE WHEN UPPER("currency") = 'USD' THEN "annualPrice" ELSE "monthlyPrice" * 10 END)
WHERE "indiaMonthlyPrice" IS NULL
   OR "indiaAnnualPrice" IS NULL
   OR "globalMonthlyPrice" IS NULL
   OR "globalAnnualPrice" IS NULL;
