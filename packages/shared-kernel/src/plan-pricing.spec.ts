import { isSaudiBilling, planRegionalPricesFromDefinition, resolvePlanPrice } from './plan-pricing';

describe('plan-pricing', () => {
  const regionalPrices = planRegionalPricesFromDefinition({
    saudiMonthlyPrice: 199,
    saudiAnnualPrice: 1999,
    globalMonthlyPrice: 49,
    globalAnnualPrice: 539,
  });

  it('Saudi workspace pays SAR 199 from the Saudi table', () => {
    const resolved = resolvePlanPrice({
      planId: 'STARTER',
      billingCountry: 'SA',
      billingCurrency: 'SAR',
      billingInterval: 'MONTHLY',
      regionalPrices,
    });
    expect(resolved.regionApplied).toBe('SAUDI');
    expect(resolved.currency).toBe('SAR');
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

  it('SAR currency selects the Saudi table even when the country code is not SA', () => {
    expect(isSaudiBilling('AE', 'SAR')).toBe(true);
    const resolved = resolvePlanPrice({
      planId: 'STARTER',
      billingCountry: 'AE',
      billingCurrency: 'SAR',
      billingInterval: 'MONTHLY',
      regionalPrices,
    });
    expect(resolved.amount).toBe(199);
    expect(resolved.currency).toBe('SAR');
  });

  it('yearly Saudi pricing uses the annual Saudi table', () => {
    const resolved = resolvePlanPrice({
      planId: 'STARTER',
      billingCountry: 'SA',
      billingCurrency: 'SAR',
      billingInterval: 'YEARLY',
      regionalPrices,
    });
    expect(resolved.amount).toBe(1999);
    expect(resolved.paymentAmountMinorUnit).toBe(199900);
  });

  it('annual fallback equals 11× monthly when annual prices are omitted', () => {
    const derived = planRegionalPricesFromDefinition({
      saudiMonthlyPrice: 199,
      globalMonthlyPrice: 49,
    });
    expect(derived.saudi.annualPrice).toBe(2189);
    expect(derived.global.annualPrice).toBe(539);
  });
});
