export type TenantPlan = 'Starter' | 'Growth' | 'Enterprise';
export type TenantStatus = 'Active' | 'Trial' | 'Past due' | 'Suspended';

export type TenantHealth = 'healthy' | 'degraded' | 'critical';

export type TenantModuleFlags = {
  hrm: boolean;
  crm: boolean;
  finance: boolean;
  inventory: boolean;
  manufacturing: boolean;
};

export const INDUSTRY_TEMPLATES = ['Retail', 'Manufacturing', 'Distribution', 'Services'] as const;
export type IndustryTemplate = (typeof INDUSTRY_TEMPLATES)[number];

export type TenantPlatformSeed = {
  name: string;
  plan: TenantPlan;
  country: string;
  countryCode?: string | null;
  currency?: string | null;
  currencySymbol?: string | null;
  users: number;
  mrr: number;
  status: TenantStatus;
  slug: string;
  tenantCode: string;
  createdAt: string;
  lastActiveLabel: string;
  health: TenantHealth;
  isolationVerified: boolean;
  storageUsedGb: number;
  storageCapGb: number;
  renewalDate: string;
  modules: TenantModuleFlags;
  industryTemplate: IndustryTemplate;
};

export function defaultModulesForIndustry(template: IndustryTemplate): TenantModuleFlags {
  switch (template) {
    case 'Manufacturing':
      return { hrm: true, crm: true, finance: true, inventory: true, manufacturing: true };
    case 'Distribution':
      return { hrm: true, crm: true, finance: true, inventory: true, manufacturing: false };
    case 'Services':
      return { hrm: true, crm: true, finance: true, inventory: false, manufacturing: false };
    case 'Retail':
    default:
      return { hrm: true, crm: true, finance: true, inventory: true, manufacturing: false };
  }
}

export const SALES_DEMO_INR_PER_USD = 83.5;

export type AdminUserStatus = 'Active' | 'Suspended' | 'Invited';

export type AdminPlatformUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  status: AdminUserStatus;
  mfaEnabled: boolean;
};
