"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIndiaBilling = isIndiaBilling;
exports.planRegionalPricesFromDefinition = planRegionalPricesFromDefinition;
exports.resolvePlanPrice = resolvePlanPrice;
const billing_1 = require("./billing");
function isIndiaBilling(billingCountry, billingCurrency) {
    const country = billingCountry?.trim().toUpperCase();
    const currency = billingCurrency?.trim().toUpperCase();
    return country === 'IN' || currency === 'INR';
}
function planRegionalPricesFromDefinition(input) {
    const legacyMonthly = Number(input.monthlyPrice ?? 49);
    const legacyAnnual = Number(input.annualPrice ?? (0, billing_1.yearlyPriceFromMonthly)(legacyMonthly));
    const legacyCurrency = (input.currency ?? 'INR').toUpperCase();
    const indiaMonthly = Number(input.indiaMonthlyPrice ?? (legacyCurrency === 'INR' ? legacyMonthly : 49));
    const indiaAnnual = Number(input.indiaAnnualPrice ??
        (input.indiaMonthlyPrice != null
            ? (0, billing_1.yearlyPriceFromMonthly)(indiaMonthly)
            : legacyCurrency === 'INR'
                ? legacyAnnual
                : (0, billing_1.yearlyPriceFromMonthly)(indiaMonthly)));
    const globalMonthly = Number(input.globalMonthlyPrice ?? (legacyCurrency === 'USD' ? legacyMonthly : 49));
    const globalAnnual = Number(input.globalAnnualPrice ??
        (input.globalMonthlyPrice != null
            ? (0, billing_1.yearlyPriceFromMonthly)(globalMonthly)
            : legacyCurrency === 'USD'
                ? legacyAnnual
                : (0, billing_1.yearlyPriceFromMonthly)(globalMonthly)));
    return {
        india: { monthlyPrice: indiaMonthly, annualPrice: indiaAnnual, currency: 'INR' },
        global: { monthlyPrice: globalMonthly, annualPrice: globalAnnual, currency: 'USD' },
    };
}
function resolvePlanPrice(input) {
    const useIndia = isIndiaBilling(input.billingCountry, input.billingCurrency);
    const interval = input.billingInterval;
    if (useIndia) {
        const amount = interval === 'YEARLY'
            ? input.regionalPrices.india.annualPrice
            : input.regionalPrices.india.monthlyPrice;
        return {
            regionApplied: 'INDIA',
            currency: 'INR',
            amount,
            billingInterval: interval,
            displayAmount: amount,
            paymentAmountMinorUnit: Math.round(amount * 100),
            monthlyEquivalent: interval === 'YEARLY' ? Math.round((amount / 12) * 100) / 100 : amount,
        };
    }
    const amount = interval === 'YEARLY'
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
//# sourceMappingURL=plan-pricing.js.map