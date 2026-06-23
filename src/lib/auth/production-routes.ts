import { redirect } from "@tanstack/react-router";

/** Platform admin routes hidden from nav — direct URL access is blocked. */
export const DISABLED_ADMIN_ROUTES: Record<string, string> = {
  "/admin/automations": "Platform automations",
  "/admin/sales-partners": "Sales partners",
  "/admin/reports": "Platform reports",
  "/admin/compliance": "Compliance center",
  "/admin/integrations": "Integrations",
  "/admin/settings": "Global settings",
};

/** Public showcase routes — not production ERP modules. */
export const SHOWCASE_PUBLIC_ROUTES: Record<string, string> = {
  "/portal": "Staff portal",
  "/partner": "Partner portal",
  "/demo": "Demo booking",
};

function normalizePath(path: string): string {
  if (path !== "/" && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function blockDisabledAdminFeature(feature: string): never {
  throw redirect({
    to: "/admin/unavailable",
    search: { feature },
  });
}

export function guardDisabledAdminPath(pathname: string): void {
  if (typeof window === "undefined") return;
  const feature = DISABLED_ADMIN_ROUTES[normalizePath(pathname)];
  if (feature) blockDisabledAdminFeature(feature);
}

export function blockShowcaseFeature(feature: string): never {
  throw redirect({
    to: "/unavailable",
    search: { feature },
  });
}

export function guardShowcasePath(pathname: string): void {
  if (typeof window === "undefined") return;
  const feature = SHOWCASE_PUBLIC_ROUTES[normalizePath(pathname)];
  if (feature) blockShowcaseFeature(feature);
}
