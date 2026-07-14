import { isIndiaBilling, planRegionalPricesFromDefinition, resolvePlanPrice } from './plan-pricing';

describe('plan-pricing', () => {
  const regionalPrices = planRegionalPricesFromDefinition({
    indiaMonthlyPrice: 199,
    indiaAnnualPrice: 1999,
    globalMonthlyPrice: 49,
    globalAnnualPrice: 539,
  });

  it('India workspace pays ₹199, not USD converted to INR', () => {
    const resolved = resolvePlanPrice({
      planId: 'STARTER',
      billingCountry: 'IN',
      billingCurrency: 'INR',
      billingInterval: 'MONTHLY',
      regionalPrices,
    });
    expect(resolved.regionApplied).toBe('INDIA');
    expect(resolved.currency).toBe('INR');
    expect(resolved.amount).toBe(199);
    expect(resolved.paymentAmountMinorUnit).toBe(19900);
    expect(resolved.displayAmount).toBe(199);
  });

  it('global workspace pays $49', () => {
    const resolved = resolvePlanPrice({
      planId: 'STARTER',
      billingCountry: 'US',
      billingCurrency: 'USD',
      billingInterval: 'MONTHLY',
      regionalPrices,
    });
    expect(resolved.regionApplied).toBe('GLOBAL');
    expect(resolved.currency).toBe('USD');
    expect(resolved.amount).toBe(49);
    expect(resolved.paymentAmountMinorUnit).toBe(4900);
  });

  it('INR currency selects India table even when country is not IN', () => {
    expect(isIndiaBilling('AE', 'INR')).toBe(true);
    const resolved = resolvePlanPrice({
      planId: 'STARTER',
      billingCountry: 'AE',
      billingCurrency: 'INR',
      billingInterval: 'MONTHLY',
      regionalPrices,
    });
    expect(resolved.amount).toBe(199);
    expect(resolved.currency).toBe('INR');
  });

  it('yearly India pricing uses annual India table', () => {
    const resolved = resolvePlanPrice({
      planId: 'STARTER',
      billingCountry: 'IN',
      billingCurrency: 'INR',
      billingInterval: 'YEARLY',
      regionalPrices,
    });
    expect(resolved.amount).toBe(1999);
    expect(resolved.paymentAmountMinorUnit).toBe(199900);
  });

  it('annual fallback equals 11× monthly when annual prices are omitted', () => {
    const derived = planRegionalPricesFromDefinition({
      indiaMonthlyPrice: 199,
      globalMonthlyPrice: 49,
    });
    expect(derived.india.annualPrice).toBe(2189);
    expect(derived.global.annualPrice).toBe(539);
  });
});
