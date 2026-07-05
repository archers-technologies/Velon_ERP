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
    monthlyPrice: 49,
    seatLimit: 5,
    description: 'For small teams getting started with Velon ERP.',
    features: ['Up to 5 users', 'CRM foundation', 'Workspace admin', 'Email support'],
  },
  {
    id: 'GROWTH',
    displayName: 'Professional',
    monthlyPrice: 149,
    seatLimit: 25,
    description: 'For growing companies that need more seats and control.',
    features: ['Up to 25 users', 'Full CRM & quotations', 'Departments', 'Priority support'],
  },
  {
    id: 'ENTERPRISE',
    displayName: 'Enterprise',
    monthlyPrice: 499,
    seatLimit: null,
    description: 'Unlimited scale with dedicated support.',
    features: ['Unlimited users', 'All modules', 'Custom integrations', 'Dedicated support'],
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

export function marketingPlanCards(plans: PublicPlan[]) {
  const list = Array.isArray(plans) ? plans : FALLBACK_PLANS;
  return list.map((plan) => ({
    id: plan.id,
    name: plan.displayName,
    monthlyPrice: plan.monthlyPrice,
    regionalPrices: plan.regionalPrices,
    desc: plan.description,
    features: plan.features,
    featured: plan.id === 'GROWTH',
    isCustom: plan.id === 'ENTERPRISE',
  }));
}
