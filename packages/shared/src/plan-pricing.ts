import { yearlyPriceFromMonthly, type BillingInterval } from "./billing";

export type PricingRegion = "INDIA" | "GLOBAL";

export type PlanRegionalPrices = {
  india: { monthlyPrice: number; annualPrice: number; currency: "INR" };
  global: { monthlyPrice: number; annualPrice: number; currency: "USD" };
};

export type ResolvedPlanPrice = {
  regionApplied: PricingRegion;
  currency: string;
  amount: number;
  billingInterval: BillingInterval;
  displayAmount: number;
  paymentAmountMinorUnit: number;
  monthlyEquivalent: number;
};

/** India billing uses the India price table — never USD×FX conversion. */
export function isIndiaBilling(billingCountry: string, billingCurrency: string): boolean {
  const country = billingCountry?.trim().toUpperCase();
  const currency = billingCurrency?.trim().toUpperCase();
  return country === "IN" || currency === "INR";
}

export function planRegionalPricesFromDefinition(input: {
  indiaMonthlyPrice?: number | null;
  indiaAnnualPrice?: number | null;
  globalMonthlyPrice?: number | null;
  globalAnnualPrice?: number | null;
  monthlyPrice?: number;
  annualPrice?: number;
  currency?: string;
}): PlanRegionalPrices {
  const legacyMonthly = Number(input.monthlyPrice ?? 49);
  const legacyAnnual = Number(input.annualPrice ?? yearlyPriceFromMonthly(legacyMonthly));
  const legacyCurrency = (input.currency ?? "INR").toUpperCase();

  const indiaMonthly = Number(input.indiaMonthlyPrice ?? (legacyCurrency === "INR" ? legacyMonthly : 49));
  const indiaAnnual = Number(
    input.indiaAnnualPrice ??
      (input.indiaMonthlyPrice != null
        ? yearlyPriceFromMonthly(indiaMonthly)
        : legacyCurrency === "INR"
          ? legacyAnnual
          : yearlyPriceFromMonthly(indiaMonthly)),
  );
  const globalMonthly = Number(input.globalMonthlyPrice ?? (legacyCurrency === "USD" ? legacyMonthly : 49));
  const globalAnnual = Number(
    input.globalAnnualPrice ??
      (input.globalMonthlyPrice != null
        ? yearlyPriceFromMonthly(globalMonthly)
        : legacyCurrency === "USD"
          ? legacyAnnual
          : yearlyPriceFromMonthly(globalMonthly)),
  );

  return {
    india: { monthlyPrice: indiaMonthly, annualPrice: indiaAnnual, currency: "INR" },
    global: { monthlyPrice: globalMonthly, annualPrice: globalAnnual, currency: "USD" },
  };
}

export function resolvePlanPrice(input: {
  planId: string;
  billingCountry: string;
  billingCurrency: string;
  billingInterval: BillingInterval;
  regionalPrices: PlanRegionalPrices;
}): ResolvedPlanPrice {
  const useIndia = isIndiaBilling(input.billingCountry, input.billingCurrency);
  const interval = input.billingInterval;

  if (useIndia) {
    const amount =
      interval === "YEARLY"
        ? input.regionalPrices.india.annualPrice
        : input.regionalPrices.india.monthlyPrice;
    return {
      regionApplied: "INDIA",
      currency: "INR",
      amount,
      billingInterval: interval,
      displayAmount: amount,
      paymentAmountMinorUnit: Math.round(amount * 100),
      monthlyEquivalent:
        interval === "YEARLY" ? Math.round((amount / 12) * 100) / 100 : amount,
    };
  }

  const amount =
    interval === "YEARLY"
      ? input.regionalPrices.global.annualPrice
      : input.regionalPrices.global.monthlyPrice;

  return {
    regionApplied: "GLOBAL",
    currency: "USD",
    amount,
    billingInterval: interval,
    displayAmount: amount,
    paymentAmountMinorUnit: Math.round(amount * 100),
    monthlyEquivalent:
      interval === "YEARLY" ? Math.round((amount / 12) * 100) / 100 : amount,
  };
}
