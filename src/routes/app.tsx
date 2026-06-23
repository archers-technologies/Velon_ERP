import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { WorkspaceAuthGate } from "@/components/auth-gate";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireWorkspaceAccess } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    requireWorkspaceAccess();
  },
  head: () => ({
    meta: [
      { title: "Workspace · Velon-ERP" },
      { name: "description", content: "Run your business from one beautiful command center." },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const titleByPath: Record<string, { title: string; subtitle: string }> = {
    "/app": {
      title: "Dashboard",
      subtitle: "Here's what's happening across your business today",
    },
    "/app/inventory": {
      title: "Inventory",
      subtitle:
        "Real-time stock by location, reorder automation, ABC tiers, cycle counts, and scan-ready SKUs",
    },
    "/app/billing-pos": {
      title: "Billing & POS",
      subtitle:
        "Fast checkout, multi-pay, thermal or paperless receipts, and live inventory plus invoice sync",
    },
    "/app/customers": {
      title: "Customers",
      subtitle: "Manage customer records, contacts, notes, and account information.",
    },
    "/app/suppliers": {
      title: "Suppliers",
      subtitle: "Manage supplier records, contacts, and supplier communication.",
    },
    "/app/sales-crm": {
      title: "Sales CRM",
      subtitle: "Manage leads, opportunities, quotations, proposals, and sales pipeline.",
    },
    "/app/accounting": {
      title: "Accounting",
      subtitle:
        "Financial control tower — live AR/AP, cash trends, automated matching, GL drill-down, bank feeds, and audit-ready trails",
    },
    "/app/reports": {
      title: "Reports",
      subtitle:
        "Finance analytics cockpit — live KPIs, variance alerts, interactive trends, GL drill-down, task queues, and governed exports",
    },
    "/app/documents": {
      title: "Documents",
      subtitle: "Upload and manage invoices, receipts, and contracts",
    },
    "/app/alerts": {
      title: "Alerts",
      subtitle: "Low stock, payment due, and subscription notifications",
    },
    "/app/branches": {
      title: "Branches",
      subtitle:
        "Stores & offices hub — role-based ops, live stock by site, scan-ready tasks, POS linkage, and admin workflows in fewer clicks",
    },
    "/app/procurement": {
      title: "Procurement",
      subtitle: "Manage purchase requests, purchase orders, approvals, and stock requirements.",
    },
    "/app/settings/billing": {
      title: "Subscription & Billing",
      subtitle: "Plan, invoices, payment history, and payment methods.",
    },
    "/app/settings/admin": {
      title: "Workspace administration",
      subtitle: "Manage users, departments, seats, roles, and invitations.",
    },
    "/app/settings": {
      title: "Settings",
      subtitle: "Profile, security, regional preferences, and workspace defaults",
    },
    "/app/crm/leads": {
      title: "Sales CRM",
      subtitle: "Manage leads, opportunities, quotations, proposals, and sales pipeline.",
    },
    "/app/crm/opportunities": {
      title: "Sales CRM",
      subtitle: "Manage leads, opportunities, quotations, proposals, and sales pipeline.",
    },
    "/app/crm/pipelines": {
      title: "Sales CRM",
      subtitle: "Manage leads, opportunities, quotations, proposals, and sales pipeline.",
    },
    "/app/crm/quotations": {
      title: "Sales CRM",
      subtitle: "Manage leads, opportunities, quotations, proposals, and sales pipeline.",
    },
    "/app/crm/proposals": {
      title: "Sales CRM",
      subtitle: "Manage leads, opportunities, quotations, proposals, and sales pipeline.",
    },
    "/app/crm/templates": {
      title: "Sales CRM",
      subtitle: "Manage leads, opportunities, quotations, proposals, and sales pipeline.",
    },
  };
  const page = titleByPath[pathname] ?? titleByPath["/app"];
  return (
    <WorkspaceAuthGate>
      <WorkspaceShell title={page.title} subtitle={page.subtitle}>
        <Outlet />
      </WorkspaceShell>
    </WorkspaceAuthGate>
  );
}
