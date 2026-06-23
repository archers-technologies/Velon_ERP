import { Outlet, createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminAuthGate } from "@/components/auth-gate";
import { AdminShell } from "@/components/admin-shell";
import { isApiEnabled } from "@/lib/api/config";
import { isAuthenticated } from "@/lib/auth/session";
import { requireAdminAccess } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    requireAdminAccess();
  },
  head: () => ({
    meta: [
      { title: "Super Admin · Velon-ERP" },
      {
        name: "description",
        content:
          "Platform-wide control center for Velon-ERP tenants, subscriptions and infrastructure.",
      },
    ],
  }),
  component: AdminLayout,
});

const titles: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Platform Overview", subtitle: "Real-time SaaS health across all tenants" },
  "/admin/tenants": {
    title: "Tenants",
    subtitle: "Create, edit, suspend and monitor all businesses on the platform",
  },
  "/admin/users": {
    title: "Users",
    subtitle: "Business admins, partners, staff and support agents",
  },
  "/admin/subscriptions": {
    title: "Subscriptions",
    subtitle: "Plans, trials, coupons and billing lifecycle",
  },
  "/admin/website": {
    title: "Website CMS",
    subtitle: "Manage homepage, pricing, FAQ, and marketing content",
  },
  "/admin/automations": {
    title: "Automations",
    subtitle: "Platform-wide rules and scheduled jobs",
  },
  "/admin/alerts-logs": {
    title: "Alerts & Logs",
    subtitle: "System notifications, webhooks and audit trail",
  },
  "/admin/reports": { title: "Reports", subtitle: "MRR, ARR, churn and partner commissions" },
  "/admin/sales-partners": {
    title: "Sales Partners",
    subtitle: "Platform revenue pulse, live money alerts, audit trail, and partner commissions",
  },
  "/admin/infrastructure": {
    title: "Infrastructure",
    subtitle: "Regions, capacity and service health",
  },
  "/admin/integrations": {
    title: "Integrations",
    subtitle: "Gateways, webhooks and third-party connectors",
  },
  "/admin/compliance": {
    title: "Compliance",
    subtitle: "Security posture, certifications and policies",
  },
  "/admin/settings": {
    title: "Global Settings",
    subtitle: "Global policy engine — fiscal rules, mail identity, and admin escalation",
  },
  "/admin/unavailable": {
    title: "Feature unavailable",
    subtitle: "This platform module is not enabled in production",
  },
};

function AdminLayout() {
  const router = useRouter();

  useEffect(() => {
    if (!isApiEnabled() || !isAuthenticated("admin")) return;
    void router.invalidate();
  }, [router]);

  const pathname = useRouterState({
    select: (s) => {
      const p = s.location.pathname;
      return p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p;
    },
  });
  const page = titles[pathname] ?? titles["/admin"];
  return (
    <AdminAuthGate>
      <AdminShell title={page.title} subtitle={page.subtitle}>
        <Outlet />
      </AdminShell>
    </AdminAuthGate>
  );
}
