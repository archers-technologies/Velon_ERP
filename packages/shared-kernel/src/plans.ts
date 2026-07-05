import { SEAT_LIMITS, type SeatPlan } from './seats';

export type PlanCatalogEntry = {
  id: SeatPlan;
  name: string;
  displayName: string;
  seatLimit: number | null;
  monthlyPrice: number;
  description: string;
  features: string[];
};

/** Single source of truth for subscription plan metadata. */
export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    id: 'STARTER',
    name: 'STARTER',
    displayName: 'Starter',
    seatLimit: SEAT_LIMITS.STARTER,
    monthlyPrice: 49,
    description: 'For small teams getting started with Velon ERP.',
    features: ['Up to 5 users', 'CRM foundation', 'Workspace admin', 'Email support'],
  },
  {
    id: 'GROWTH',
    name: 'GROWTH',
    displayName: 'Professional',
    seatLimit: SEAT_LIMITS.GROWTH,
    monthlyPrice: 149,
    description: 'For growing companies that need more seats and control.',
    features: ['Up to 25 users', 'Full CRM & quotations', 'Departments', 'Priority support'],
  },
  {
    id: 'ENTERPRISE',
    name: 'ENTERPRISE',
    displayName: 'Enterprise',
    seatLimit: SEAT_LIMITS.ENTERPRISE,
    monthlyPrice: 499,
    description: 'Unlimited scale with dedicated support.',
    features: ['Unlimited users', 'All modules', 'Custom integrations', 'Dedicated support'],
  },
];

export function planCatalogEntry(plan: string): PlanCatalogEntry {
  return PLAN_CATALOG.find((p) => p.id === plan) ?? PLAN_CATALOG[0];
}
