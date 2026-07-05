"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_CATALOG = void 0;
exports.planCatalogEntry = planCatalogEntry;
const seats_1 = require("./seats");
exports.PLAN_CATALOG = [
    {
        id: 'STARTER',
        name: 'STARTER',
        displayName: 'Starter',
        seatLimit: seats_1.SEAT_LIMITS.STARTER,
        monthlyPrice: 49,
        description: 'For small teams getting started with Velon ERP.',
        features: ['Up to 5 users', 'CRM foundation', 'Workspace admin', 'Email support'],
    },
    {
        id: 'GROWTH',
        name: 'GROWTH',
        displayName: 'Professional',
        seatLimit: seats_1.SEAT_LIMITS.GROWTH,
        monthlyPrice: 149,
        description: 'For growing companies that need more seats and control.',
        features: ['Up to 25 users', 'Full CRM & quotations', 'Departments', 'Priority support'],
    },
    {
        id: 'ENTERPRISE',
        name: 'ENTERPRISE',
        displayName: 'Enterprise',
        seatLimit: seats_1.SEAT_LIMITS.ENTERPRISE,
        monthlyPrice: 499,
        description: 'Unlimited scale with dedicated support.',
        features: ['Unlimited users', 'All modules', 'Custom integrations', 'Dedicated support'],
    },
];
function planCatalogEntry(plan) {
    return exports.PLAN_CATALOG.find((p) => p.id === plan) ?? exports.PLAN_CATALOG[0];
}
//# sourceMappingURL=plans.js.map