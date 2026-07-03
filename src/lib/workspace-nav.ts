import type { NavGroup } from "@/components/app-shell";
import {
  LayoutDashboard,
  Boxes,
  Users,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  ShoppingBag,
  ShoppingCart,
  UserCircle,
} from "lucide-react";

export type WorkspaceNavBadges = {
  billingOpen: number;
  alerts: number;
};

function countBadge(n: number): string | undefined {
  if (n <= 0) return undefined;
  return n > 99 ? "99+" : String(n);
}

/** Simple, flat sidebar — business words, not ERP jargon. */
export function buildWorkspaceNavGroups(badges: WorkspaceNavBadges): NavGroup[] {
  return [
    {
      label: "Menu",
      items: [
        { label: "Dashboard", to: "/app", icon: LayoutDashboard },
        { label: "Sales", to: "/app/sales-crm", icon: ShoppingBag },
        { label: "Purchases", to: "/app/procurement", icon: ShoppingCart },
        { label: "Inventory", to: "/app/inventory", icon: Boxes },
        { label: "Customers", to: "/app/customers", icon: Users },
        { label: "Vendors", to: "/app/suppliers", icon: Truck },
        { label: "Accounting", to: "/app/accounting", icon: Wallet },
        { label: "HR & Payroll", to: "/app/hr-payroll", icon: UserCircle },
        {
          label: "Reports",
          to: "/app/reports",
          icon: BarChart3,
          badge: countBadge(badges.alerts),
        },
        {
          label: "Settings",
          to: "/app/settings",
          search: { tab: "general" },
          icon: Settings,
        },
      ],
    },
  ];
}

export function flattenWorkspaceNavLabels(groups: NavGroup[]): string[] {
  return groups.flatMap((g) => g.items.map((i) => i.label));
}
