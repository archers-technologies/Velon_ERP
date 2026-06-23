import { normalizeWorkspacePath } from "./workspace-navigation";

/** Exact admin sidebar active-state — only one item active per route. */
export function isAdminNavItemActive(pathname: string, to: string, label: string): boolean {
  const path = normalizeWorkspacePath(pathname);

  if (label === "Overview") {
    return path === "/admin" || path === "/admin/overview";
  }

  if (label === "Alerts & Logs") {
    return path === "/admin/alerts-logs" || path === "/admin/alerts";
  }

  const routeMap: Record<string, string> = {
    Tenants: "/admin/tenants",
    Users: "/admin/users",
    Subscriptions: "/admin/subscriptions",
    Website: "/admin/website",
    Infrastructure: "/admin/infrastructure",
  };

  const exact = routeMap[label] ?? to;
  return path === exact;
}
