import type {
  IndustryTemplate,
  TenantHealth,
  TenantPlan,
  TenantStatus,
} from '@/lib/platform/admin-demo';
import type { TenantRecord } from '@/lib/types/workspace-ui';

type ApiTenant = {
  id: string;
  name: string;
  slug: string;
  tenantCode: string;
  country: string;
  countryCode?: string | null;
  currency?: string | null;
  currencySymbol?: string | null;
  plan: string;
  status: string;
  health: string;
  industryTemplate: string;
  users: number;
  mrr: number;
  storageUsedGb: number;
  storageCapGb: number;
  renewalDate: string;
  isolationVerified: boolean;
  createdAt: string;
  lastActiveLabel: string;
  modules: TenantRecord['modules'];
};

const planFromApi: Record<string, TenantPlan> = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  ENTERPRISE: 'Enterprise',
};

const planToApi: Record<TenantPlan, string> = {
  Starter: 'STARTER',
  Growth: 'GROWTH',
  Enterprise: 'ENTERPRISE',
};

const statusFromApi: Record<string, TenantStatus> = {
  ACTIVE: 'Active',
  TRIAL: 'Trial',
  PAST_DUE: 'Past due',
  SUSPENDED: 'Suspended',
};

const statusToApi: Record<TenantStatus, string> = {
  Active: 'ACTIVE',
  Trial: 'TRIAL',
  'Past due': 'PAST_DUE',
  Suspended: 'SUSPENDED',
};

const healthFromApi: Record<string, TenantHealth> = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  CRITICAL: 'critical',
};

const industryFromApi: Record<string, IndustryTemplate> = {
  RETAIL: 'Retail',
  MANUFACTURING: 'Manufacturing',
  DISTRIBUTION: 'Distribution',
  SERVICES: 'Services',
};

const industryToApi: Record<IndustryTemplate, string> = {
  Retail: 'RETAIL',
  Manufacturing: 'MANUFACTURING',
  Distribution: 'DISTRIBUTION',
  Services: 'SERVICES',
};

export function mapApiTenant(row: ApiTenant): TenantRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tenantCode: row.tenantCode,
    country: row.country,
    countryCode: row.countryCode ?? null,
    currency: row.currency ?? null,
    currencySymbol: row.currencySymbol ?? null,
    plan: planFromApi[row.plan] ?? 'Starter',
    status: statusFromApi[row.status] ?? 'Trial',
    health: healthFromApi[row.health] ?? 'healthy',
    industryTemplate: industryFromApi[row.industryTemplate] ?? 'Services',
    users: row.users,
    mrr: row.mrr,
    storageUsedGb: row.storageUsedGb,
    storageCapGb: row.storageCapGb,
    renewalDate: row.renewalDate,
    isolationVerified: row.isolationVerified,
    createdAt: row.createdAt,
    lastActiveLabel: row.lastActiveLabel,
    modules: row.modules,
  };
}

export function toApiCreateBody(input: {
  name: string;
  plan: TenantPlan;
  country: string;
  users: number;
  mrr: number;
  status: TenantStatus;
  slug?: string;
  industryTemplate: IndustryTemplate;
}) {
  return {
    name: input.name,
    country: input.country,
    plan: planToApi[input.plan],
    status: statusToApi[input.status],
    industryTemplate: industryToApi[input.industryTemplate],
    users: input.users,
    mrr: input.mrr,
    slug: input.slug,
  };
}

export function toApiUpdatePatch(patch: {
  plan?: TenantPlan;
  status?: TenantStatus;
  users?: number;
  mrr?: number;
}) {
  return {
    ...(patch.plan !== undefined ? { plan: planToApi[patch.plan] } : {}),
    ...(patch.status !== undefined ? { status: statusToApi[patch.status] } : {}),
    ...(patch.users !== undefined ? { users: patch.users } : {}),
    ...(patch.mrr !== undefined ? { mrr: patch.mrr } : {}),
  };
}
