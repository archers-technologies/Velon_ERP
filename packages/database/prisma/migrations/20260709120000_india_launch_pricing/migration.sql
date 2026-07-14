-- India launch pricing: Starter ₹199, Business ₹399, Professional ₹699
UPDATE "PlanDefinition"
SET
  "displayName" = 'Starter',
  "monthlyPrice" = 199,
  "annualPrice" = 1999,
  "indiaMonthlyPrice" = 199,
  "indiaAnnualPrice" = 1999,
  "seatLimit" = 2,
  "branchLimit" = 1,
  "description" = 'For small shops, freelancers and new businesses.'
WHERE "plan" = 'STARTER';

UPDATE "PlanDefinition"
SET
  "displayName" = 'Business',
  "monthlyPrice" = 399,
  "annualPrice" = 3999,
  "indiaMonthlyPrice" = 399,
  "indiaAnnualPrice" = 3999,
  "seatLimit" = 10,
  "branchLimit" = 3,
  "description" = 'For growing retailers, wholesalers and service businesses.'
WHERE "plan" = 'GROWTH';

UPDATE "PlanDefinition"
SET
  "displayName" = 'Professional',
  "monthlyPrice" = 699,
  "annualPrice" = 6999,
  "indiaMonthlyPrice" = 699,
  "indiaAnnualPrice" = 6999,
  "seatLimit" = 25,
  "branchLimit" = 10,
  "description" = 'For established businesses needing more control.'
WHERE "plan" = 'ENTERPRISE';
