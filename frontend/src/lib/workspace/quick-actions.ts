import {
  ClipboardList,
  FileText,
  Package,
  ShoppingCart,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { workspaceAdminSearch } from '@velon/shared';

export type WorkspaceQuickAction = {
  label: string;
  description: string;
  to: string;
  search?: Record<string, string>;
  icon: LucideIcon;
  /** Tailwind color classes for icon background */
  tone: string;
};

/** Daily business actions — reachable in 1–2 clicks from the dashboard. */
export const WORKSPACE_QUICK_ACTIONS: WorkspaceQuickAction[] = [
  {
    label: 'Create Invoice',
    description: 'Bill a customer and get paid',
    to: '/app/billing-pos',
    icon: FileText,
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'Add Customer',
    description: 'Save a new buyer or client',
    to: '/app/customers',
    search: { section: 'customers' },
    icon: UserPlus,
    tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Add Product',
    description: 'List what you sell or stock',
    to: '/app/inventory/products',
    icon: Package,
    tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    label: 'Record Payment',
    description: 'Log money received or paid',
    to: '/app/billing-pos',
    icon: Wallet,
    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    label: 'Create Quotation',
    description: 'Send a price quote to a customer',
    to: '/app/crm/quotations',
    icon: ClipboardList,
    tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    label: 'Add Purchase',
    description: 'Buy stock from a vendor',
    to: '/app/procurement',
    icon: ShoppingCart,
    tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
];

export const WORKSPACE_ONBOARDING_INVITE = {
  label: 'Invite team member',
  to: '/app/settings/admin',
  search: workspaceAdminSearch('invitations'),
} as const;
