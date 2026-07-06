import { type BillingInterval } from './billing';

export type PricingRegion = 'INDIA' | 'GLOBAL';
export type PlanRegionalPrices = {
  india: {
    monthlyPrice: number;
    annualPrice: number;
    currency: 'INR';
  };
  global: {
    monthlyPrice: number;
    annualPrice: number;
    currency: 'USD';
  };
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
export declare function isIndiaBilling(billingCountry: string, billingCurrency: string): boolean;
export declare function planRegionalPricesFromDefinition(input: {
  indiaMonthlyPrice?: number | null;
  indiaAnnualPrice?: number | null;
  globalMonthlyPrice?: number | null;
  globalAnnualPrice?: number | null;
  monthlyPrice?: number;
  annualPrice?: number;
  currency?: string;
}): PlanRegionalPrices;
export declare function resolvePlanPrice(input: {
  planId: string;
  billingCountry: string;
  billingCurrency: string;
  billingInterval: BillingInterval;
  regionalPrices: PlanRegionalPrices;
}): ResolvedPlanPrice;
