import { yearlyPriceFromMonthly, type BillingInterval } from './billing';

export type PricingRegion = 'SAUDI' | 'GLOBAL';

export type PlanRegionalPrices = {
  saudi: { monthlyPrice: number; annualPrice: number; currency: 'SAR' };
  global: { monthlyPrice: number; annualPrice: number; currency: 'USD' };
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

/** Saudi billing uses the SAR price table. Other countries use the USD table. */
export function isSaudiBilling(billingCountry: string, billingCurrency: string): boolean {
  const country = billingCountry?.trim().toUpperCase();
  const currency = billingCurrency?.trim().toUpperCase();
  return country === 'SA' || currency === 'SAR';
}

export function planRegionalPricesFromDefinition(input: {
  saudiMonthlyPrice?: number | null;
  saudiAnnualPrice?: number | null;
  globalMonthlyPrice?: number | null;
  globalAnnualPrice?: number | null;
  monthlyPrice?: number;
  annualPrice?: number;
  currency?: string;
}): PlanRegionalPrices {
  const legacyMonthly = Number(input.monthlyPrice ?? 199);
  const legacyAnnual = Number(input.annualPrice ?? yearlyPriceFromMonthly(legacyMonthly));
  const legacyCurrency = (input.currency ?? 'SAR').toUpperCase();

  const saudiMonthly = Number(
    input.saudiMonthlyPrice ?? (legacyCurrency === 'SAR' ? legacyMonthly : 199),
  );
  const saudiAnnual = Number(
    input.saudiAnnualPrice ??
      (input.saudiMonthlyPrice != null
        ? yearlyPriceFromMonthly(saudiMonthly)
        : legacyCurrency === 'SAR'
          ? legacyAnnual
          : yearlyPriceFromMonthly(saudiMonthly)),
  );
  const globalMonthly = Number(
    input.globalMonthlyPrice ?? (legacyCurrency === 'USD' ? legacyMonthly : 49),
  );
  const globalAnnual = Number(
    input.globalAnnualPrice ??
      (input.globalMonthlyPrice != null
        ? yearlyPriceFromMonthly(globalMonthly)
        : legacyCurrency === 'USD'
          ? legacyAnnual
          : yearlyPriceFromMonthly(globalMonthly)),
  );

  return {
    saudi: { monthlyPrice: saudiMonthly, annualPrice: saudiAnnual, currency: 'SAR' },
    global: { monthlyPrice: globalMonthly, annualPrice: globalAnnual, currency: 'USD' },
  };
}

export function resolvePlanPrice(input: {
  planId: string;
  billingCountry: string;
  billingCurrency: string;
  billingInterval: BillingInterval;
  regionalPrices: PlanRegionalPrices;
}): ResolvedPlanPrice {
  const useSaudi = isSaudiBilling(input.billingCountry, input.billingCurrency);
  const interval = input.billingInterval;
  const currency = input.billingCurrency?.trim().toUpperCase();

  if (currency === 'INR') {
    const amount =
      interval === 'YEARLY'
        ? input.regionalPrices.global.annualPrice
        : input.regionalPrices.global.monthlyPrice;
    return {
      regionApplied: 'GLOBAL',
      currency: 'INR',
      amount,
      billingInterval: interval,
      displayAmount: amount,
      paymentAmountMinorUnit: Math.round(amount * 100),
      monthlyEquivalent: interval === 'YEARLY' ? Math.round((amount / 12) * 100) / 100 : amount,
    };
  }

  if (useSaudi) {
    const amount =
      interval === 'YEARLY'
        ? input.regionalPrices.saudi.annualPrice
        : input.regionalPrices.saudi.monthlyPrice;
    return {
      regionApplied: 'SAUDI',
      currency: 'SAR',
      amount,
      billingInterval: interval,
      displayAmount: amount,
      paymentAmountMinorUnit: Math.round(amount * 100),
      monthlyEquivalent: interval === 'YEARLY' ? Math.round((amount / 12) * 100) / 100 : amount,
    };
  }

  const amount =
    interval === 'YEARLY'
      ? input.regionalPrices.global.annualPrice
      : input.regionalPrices.global.monthlyPrice;

  return {
    regionApplied: 'GLOBAL',
    currency: 'USD',
    amount,
    billingInterval: interval,
    displayAmount: amount,
    paymentAmountMinorUnit: Math.round(amount * 100),
    monthlyEquivalent: interval === 'YEARLY' ? Math.round((amount / 12) * 100) / 100 : amount,
  };
}
