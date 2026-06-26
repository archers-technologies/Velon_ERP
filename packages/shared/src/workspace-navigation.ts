/** Flat nav labels for workspace sidebar — used in tests to prevent duplicate CRM entries. */
export const WORKSPACE_SIDEBAR_LABELS = [
  "Dashboard",
  "Inventory",
  "Billing & POS",
  "Customers",
  "Sales CRM",
  "Procurement",
  "Suppliers",
  "Accounting",
  "Reports",
  "Documents",
  "Alerts",
  "Branches",
  "Settings",
] as const;

export function workspaceNavHasDuplicateCrm(labels: readonly string[]): boolean {
  const crm = labels.filter((l) => l === "CRM" || l === "Sales CRM");
  return labels.includes("CRM") && labels.includes("Sales CRM");
}

export function normalizeWorkspacePath(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isWorkspaceNavItemActive(pathname: string, to: string, label: string): boolean {
  const path = normalizeWorkspacePath(pathname);

  if (to === "/app") {
    return path === "/app";
  }

  if (label === "Sales CRM") {
    return path.startsWith("/app/sales-crm") || path.startsWith("/app/crm");
  }

  if (label === "Customers") {
    return path.startsWith("/app/customers");
  }

  if (label === "Procurement") {
    return path === "/app/procurement" || path.startsWith("/app/procurement/");
  }

  if (label === "Suppliers") {
    return path === "/app/suppliers" || path.startsWith("/app/suppliers/");
  }

  if (label === "Subscription") {
    return path === "/app/settings/billing" || path.startsWith("/app/settings/billing/");
  }

  if (label === "Settings") {
    if (path === "/app/settings/billing" || path.startsWith("/app/settings/billing/")) {
      return false;
    }
    return path === "/app/settings" || path === "/app/settings/" || path.startsWith("/app/settings/");
  }

  return path === to || path.startsWith(`${to}/`);
}

export type DashboardErrorKind = "api_config" | "auth" | "connection" | "unknown";

export function classifyDashboardLoaderError(message: string): DashboardErrorKind {
  const m = message.toLowerCase();
  if (m.includes("vite_api_url") || m.includes("api url is not configured")) {
    return "api_config";
  }
  if (
    m.includes("unauthorized") ||
    m.includes("401") ||
    m.includes("session expired") ||
    m.includes("sign in")
  ) {
    return "auth";
  }
  if (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("cannot reach the api") ||
    m.includes("connection")
  ) {
    return "connection";
  }
  return "unknown";
}
