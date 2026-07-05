import { isIndiaBilling, planRegionalPricesFromDefinition, resolvePlanPrice } from "./plan-pricing";

describe("plan-pricing", () => {
  const regionalPrices = planRegionalPricesFromDefinition({
    indiaMonthlyPrice: 49,
    indiaAnnualPrice: 490,
    globalMonthlyPrice: 49,
    globalAnnualPrice: 490,
  });

  it("India workspace pays ₹49, not USD converted to INR", () => {
    const resolved = resolvePlanPrice({
      planId: "STARTER",
      billingCountry: "IN",
      billingCurrency: "INR",
      billingInterval: "MONTHLY",
      regionalPrices,
    });
    expect(resolved.regionApplied).toBe("INDIA");
    expect(resolved.currency).toBe("INR");
    expect(resolved.amount).toBe(49);
    expect(resolved.paymentAmountMinorUnit).toBe(4900);
    expect(resolved.displayAmount).toBe(49);
  });

  it("global workspace pays $49", () => {
    const resolved = resolvePlanPrice({
      planId: "STARTER",
      billingCountry: "US",
      billingCurrency: "USD",
      billingInterval: "MONTHLY",
      regionalPrices,
    });
    expect(resolved.regionApplied).toBe("GLOBAL");
    expect(resolved.currency).toBe("USD");
    expect(resolved.amount).toBe(49);
    expect(resolved.paymentAmountMinorUnit).toBe(4900);
  });

  it("INR currency selects India table even when country is not IN", () => {
    expect(isIndiaBilling("AE", "INR")).toBe(true);
    const resolved = resolvePlanPrice({
      planId: "STARTER",
      billingCountry: "AE",
      billingCurrency: "INR",
      billingInterval: "MONTHLY",
      regionalPrices,
    });
    expect(resolved.amount).toBe(49);
    expect(resolved.currency).toBe("INR");
  });

  it("yearly India pricing uses annual India table", () => {
    const resolved = resolvePlanPrice({
      planId: "STARTER",
      billingCountry: "IN",
      billingCurrency: "INR",
      billingInterval: "YEARLY",
      regionalPrices,
    });
    expect(resolved.amount).toBe(490);
    expect(resolved.paymentAmountMinorUnit).toBe(49000);
  });

  it("annual fallback equals 11× monthly when annual prices are omitted", () => {
    const derived = planRegionalPricesFromDefinition({
      indiaMonthlyPrice: 650,
      globalMonthlyPrice: 49,
    });
    expect(derived.india.annualPrice).toBe(7150);
    expect(derived.global.annualPrice).toBe(539);
  });
});
