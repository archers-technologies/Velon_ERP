import {
  ANNUAL_BILLING_MONTHS,
  mrrForPlan,
  yearlyPriceFromMonthly,
} from "./billing";
import { planRegionalPricesFromDefinition, resolvePlanPrice } from "./plan-pricing";

describe("yearlyPriceFromMonthly", () => {
  it("charges 11 months for annual billing (1 month free)", () => {
    expect(ANNUAL_BILLING_MONTHS).toBe(11);
    expect(yearlyPriceFromMonthly(650)).toBe(7150);
    expect(yearlyPriceFromMonthly(49)).toBe(539);
  });

  it("derives annual MRR equivalent from 11× monthly catalog price", () => {
    const mrr = mrrForPlan("STARTER", "YEARLY");
    expect(mrr).toBe(Math.round((yearlyPriceFromMonthly(49) / 12) * 100) / 100);
  });
});

describe("planRegionalPricesFromDefinition annual fallback", () => {
  it("defaults annual to 11× monthly when regional annual prices are omitted", () => {
    const regional = planRegionalPricesFromDefinition({
      indiaMonthlyPrice: 650,
      globalMonthlyPrice: 49,
    });
    expect(regional.india.annualPrice).toBe(7150);
    expect(regional.global.annualPrice).toBe(539);
  });

  it("uses stored annual price for yearly checkout resolution", () => {
    const regional = planRegionalPricesFromDefinition({
      indiaMonthlyPrice: 650,
      indiaAnnualPrice: 7150,
      globalMonthlyPrice: 49,
      globalAnnualPrice: 539,
    });
    const resolved = resolvePlanPrice({
      planId: "STARTER",
      billingCountry: "IN",
      billingCurrency: "INR",
      billingInterval: "YEARLY",
      regionalPrices: regional,
    });
    expect(resolved.amount).toBe(7150);
    expect(resolved.amount).toBe(yearlyPriceFromMonthly(650));
  });
});
