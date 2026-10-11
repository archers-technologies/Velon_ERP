import { ANNUAL_BILLING_MONTHS, mrrForPlan, yearlyPriceFromMonthly } from './billing';
import { planRegionalPricesFromDefinition, resolvePlanPrice } from './plan-pricing';

describe('yearlyPriceFromMonthly', () => {
  it('charges 11 months for annual billing (1 month free)', () => {
    expect(ANNUAL_BILLING_MONTHS).toBe(11);
    expect(yearlyPriceFromMonthly(199)).toBe(2189);
    expect(yearlyPriceFromMonthly(49)).toBe(539);
  });

  it('derives annual MRR equivalent from 11× monthly catalog price', () => {
    const mrr = mrrForPlan('STARTER', 'YEARLY');
    expect(mrr).toBe(Math.round((yearlyPriceFromMonthly(199) / 12) * 100) / 100);
  });
});

describe('planRegionalPricesFromDefinition annual fallback', () => {
  it('defaults annual to 11× monthly when regional annual prices are omitted', () => {
    const regional = planRegionalPricesFromDefinition({
      indiaMonthlyPrice: 199,
      globalMonthlyPrice: 49,
    });
    expect(regional.india.annualPrice).toBe(2189);
    expect(regional.global.annualPrice).toBe(539);
  });

  it('uses stored annual price for yearly checkout resolution', () => {
    const regional = planRegionalPricesFromDefinition({
      indiaMonthlyPrice: 199,
      indiaAnnualPrice: 1999,
      globalMonthlyPrice: 49,
      globalAnnualPrice: 539,
    });
    const resolved = resolvePlanPrice({
      planId: 'STARTER',
      billingCountry: 'IN',
      billingCurrency: 'INR',
      billingInterval: 'YEARLY',
      regionalPrices: regional,
    });
    expect(resolved.amount).toBe(1999);
    expect(resolved.monthlyEquivalent).toBe(166.58);
  });
});
