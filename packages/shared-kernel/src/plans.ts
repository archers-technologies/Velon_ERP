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
    monthlyPrice: 199,
    description: 'For small shops, freelancers and new businesses.',
    features: [
      '1 business · 2 users',
      'All platforms included',
      'GST invoices & quotations',
      'Customers, suppliers & products',
      'Basic inventory & expense tracking',
      'Basic reports & PDF printing',
      'Email support',
    ],
  },
  {
    id: 'GROWTH',
    name: 'GROWTH',
    displayName: 'Business',
    seatLimit: SEAT_LIMITS.GROWTH,
    monthlyPrice: 399,
    description: 'For growing retailers, wholesalers and service businesses.',
    features: [
      'Up to 3 businesses · 10 users',
      'All platforms included',
      'Full inventory & stock transfers',
      'CRM, POS & barcode billing',
      'Purchase orders & P&L reports',
      'Multiple warehouses',
      'Role-based access',
      'Priority support',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'ENTERPRISE',
    displayName: 'Professional',
    seatLimit: SEAT_LIMITS.ENTERPRISE,
    monthlyPrice: 699,
    description: 'For established businesses needing more control.',
    features: [
      'Up to 10 businesses · 25 users',
      'All platforms included',
      'Advanced CRM & sales pipeline',
      'Department management',
      'API access & audit logs',
      'Custom roles & approvals',
      'Data import & export',
      'Faster priority support',
    ],
  },
];

export function planCatalogEntry(plan: string): PlanCatalogEntry {
  return PLAN_CATALOG.find((p) => p.id === plan) ?? PLAN_CATALOG[0];
}
