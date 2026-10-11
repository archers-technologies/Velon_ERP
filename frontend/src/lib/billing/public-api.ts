import type { PlanRegionalPrices } from '@velon/shared';
import { API_V1_BASE, isApiEnabled } from '@/lib/api/config';

export type PublicPlan = {
  id: string;
  displayName: string;
  monthlyPrice: number;
  seatLimit: number | null;
  description: string;
  features: string[];
  regionalPrices?: PlanRegionalPrices;
};

const FALLBACK_PLANS: PublicPlan[] = [
  {
    id: 'STARTER',
    displayName: 'Starter',
    monthlyPrice: 199,
    seatLimit: 2,
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
    regionalPrices: {
      india: { monthlyPrice: 199, annualPrice: 1999, currency: 'INR' },
      global: { monthlyPrice: 49, annualPrice: 539, currency: 'USD' },
    },
  },
  {
    id: 'GROWTH',
    displayName: 'Business',
    monthlyPrice: 399,
    seatLimit: 10,
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
    regionalPrices: {
      india: { monthlyPrice: 399, annualPrice: 3999, currency: 'INR' },
      global: { monthlyPrice: 149, annualPrice: 1639, currency: 'USD' },
    },
  },
  {
    id: 'ENTERPRISE',
    displayName: 'Professional',
    monthlyPrice: 699,
    seatLimit: 25,
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
    regionalPrices: {
      india: { monthlyPrice: 699, annualPrice: 6999, currency: 'INR' },
      global: { monthlyPrice: 499, annualPrice: 5489, currency: 'USD' },
    },
  },
];

function unwrapPublicPlans(body: unknown): PublicPlan[] {
  if (Array.isArray(body)) return body as PublicPlan[];
  if (body && typeof body === 'object' && 'success' in body) {
    const envelope = body as { success?: boolean; data?: unknown };
    if (envelope.success === true && Array.isArray(envelope.data)) {
      return envelope.data as PublicPlan[];
    }
  }
  return FALLBACK_PLANS;
}

export async function loadPublicPlans(): Promise<PublicPlan[]> {
  if (!isApiEnabled()) return FALLBACK_PLANS;
  try {
    const res = await fetch(`${API_V1_BASE}/billing/plans`);
    if (!res.ok) return FALLBACK_PLANS;
    const body = await res.json();
    return unwrapPublicPlans(body);
  } catch {
    return FALLBACK_PLANS;
  }
}

export type MarketingPlanCard = {
  id: string;
  name: string;
  monthlyPrice: number;
  regionalPrices?: PlanRegionalPrices;
  desc: string;
  features: string[];
  featured: boolean;
};

export function marketingPlanCards(plans: PublicPlan[]): MarketingPlanCard[] {
  const list = Array.isArray(plans) ? plans : FALLBACK_PLANS;
  return list.map((plan) => ({
    id: plan.id,
    name: plan.displayName,
    monthlyPrice: plan.monthlyPrice,
    regionalPrices: plan.regionalPrices,
    desc: plan.description,
    features: plan.features,
    featured: plan.id === 'GROWTH',
  }));
}
