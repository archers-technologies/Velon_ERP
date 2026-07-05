"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BILLING_PORTAL_PATH_PREFIXES = exports.ANNUAL_BILLING_MONTHS = exports.TRIAL_DAYS_DEFAULT = exports.PAYMENT_PROVIDERS = void 0;
exports.yearlyPriceFromMonthly = yearlyPriceFromMonthly;
exports.mrrForPlan = mrrForPlan;
exports.normalizeApiPath = normalizeApiPath;
exports.isBillingPortalPath = isBillingPortalPath;
exports.subscriptionAllowsWorkspaceAccess = subscriptionAllowsWorkspaceAccess;
exports.subscriptionAllowsBillingPortal = subscriptionAllowsBillingPortal;
exports.mapSubscriptionStatusToTenantStatus = mapSubscriptionStatusToTenantStatus;
const plans_1 = require("./plans");
exports.PAYMENT_PROVIDERS = [
    {
        id: 'STRIPE',
        name: 'Stripe',
        description: 'Card and subscription billing (global).',
        supportsRecurring: true,
        requiresManualApproval: false,
    },
    {
        id: 'RAZORPAY',
        name: 'Razorpay',
        description: 'Cards, UPI, and netbanking (India).',
        supportsRecurring: true,
        requiresManualApproval: false,
    },
    {
        id: 'STC_PAY',
        name: 'STC Pay',
        description: 'Mobile wallet checkout (Saudi Arabia).',
        supportsRecurring: false,
        requiresManualApproval: false,
    },
    {
        id: 'HYPERPAY',
        name: 'HyperPay',
        description: 'Regional card gateway (MENA).',
        supportsRecurring: true,
        requiresManualApproval: false,
    },
    {
        id: 'BANK_TRANSFER',
        name: 'Bank Transfer',
        description: 'Manual wire transfer with admin approval.',
        supportsRecurring: false,
        requiresManualApproval: true,
    },
];
exports.TRIAL_DAYS_DEFAULT = 30;
exports.ANNUAL_BILLING_MONTHS = 11;
function yearlyPriceFromMonthly(monthlyPrice) {
    return monthlyPrice * exports.ANNUAL_BILLING_MONTHS;
}
function mrrForPlan(plan, interval) {
    const entry = (0, plans_1.planCatalogEntry)(plan);
    if (interval === 'YEARLY') {
        return Math.round((yearlyPriceFromMonthly(entry.monthlyPrice) / 12) * 100) / 100;
    }
    return entry.monthlyPrice;
}
exports.BILLING_PORTAL_PATH_PREFIXES = [
    '/billing/subscription',
    '/billing/invoices',
    '/billing/payments',
    '/billing/checkout',
    '/billing/plans',
    '/billing/plans/for-workspace',
    '/billing/checkout/cancel',
    '/billing/payment-config',
    '/billing/razorpay/verify',
    '/billing/providers',
    '/workspace/context',
    '/workspace/dashboard',
    '/tenant-admin/seats',
    '/auth/',
];
function normalizeApiPath(path) {
    const trimmed = path.split('?')[0] ?? path;
    const withoutPrefix = trimmed.replace(/^\/api\/v\d+\//, '/');
    return withoutPrefix.startsWith('/') ? withoutPrefix : `/${withoutPrefix}`;
}
function isBillingPortalPath(path) {
    const normalized = normalizeApiPath(path);
    return exports.BILLING_PORTAL_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}
function subscriptionAllowsWorkspaceAccess(status) {
    return status === 'TRIAL' || status === 'ACTIVE' || status === 'PAST_DUE';
}
function subscriptionAllowsBillingPortal(status) {
    return (status === 'TRIAL' ||
        status === 'ACTIVE' ||
        status === 'PAST_DUE' ||
        status === 'SUSPENDED' ||
        status === 'CANCELLED');
}
function mapSubscriptionStatusToTenantStatus(status) {
    switch (status) {
        case 'TRIAL':
            return 'TRIAL';
        case 'ACTIVE':
            return 'ACTIVE';
        case 'PAST_DUE':
            return 'PAST_DUE';
        case 'SUSPENDED':
        case 'CANCELLED':
            return 'SUSPENDED';
        default:
            return 'SUSPENDED';
    }
}
//# sourceMappingURL=billing.js.map