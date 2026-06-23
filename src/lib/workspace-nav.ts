import type { NavGroup } from "@/components/app-shell";
import {
  LayoutDashboard,
  Boxes,
  Receipt,
  Users,
  Truck,
  Wallet,
  UsersRound,
  BarChart3,
  FileText,
  Bell,
  Building2,
  Settings,
  ClipboardList,
} from "lucide-react";

export type WorkspaceNavBadges = {
  billingOpen: number;
  alerts: number;
};

function countBadge(n: number): string | undefined {
  if (n <= 0) return undefined;
  return n > 99 ? "99+" : String(n);
}

export function buildWorkspaceNavGroups(badges: WorkspaceNavBadges): NavGroup[] {
  return [
    {
      label: "Workspace",
      items: [
        { label: "Dashboard", to: "/app", icon: LayoutDashboard },
        { label: "Inventory", to: "/app/inventory", icon: Boxes },
        { label: "Billing & POS", to: "/app/billing-pos", icon: Receipt },
        { label: "Customers", to: "/app/customers", icon: Users },
        { label: "Sales CRM", to: "/app/sales-crm", icon: UsersRound },
        { label: "Procurement", to: "/app/procurement", icon: ClipboardList },
        { label: "Suppliers", to: "/app/suppliers", icon: Truck },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Accounting", to: "/app/accounting", icon: Wallet },
        { label: "Reports", to: "/app/reports", icon: BarChart3 },
        { label: "Documents", to: "/app/documents", icon: FileText },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          label: "Alerts",
          to: "/app/alerts",
          icon: Bell,
          badge: countBadge(badges.alerts),
        },
        { label: "Branches", to: "/app/branches", icon: Building2 },
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
