export const DEFAULT_WORKSPACE_PUBLIC_DOMAIN = "app.velonerp.com";

const WORKSPACE_DOMAIN_ENV_KEYS = [
  "APP_PUBLIC_WORKSPACE_DOMAIN",
  "NEXT_PUBLIC_WORKSPACE_DOMAIN",
  "PUBLIC_WORKSPACE_DOMAIN",
  "VITE_PUBLIC_WORKSPACE_DOMAIN",
] as const;

/** Resolve the public workspace parent domain from environment variables. */
export function resolveWorkspacePublicDomain(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): string {
  for (const key of WORKSPACE_DOMAIN_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return value.replace(/^\.+/, "").replace(/\/+$/, "");
    }
  }
  return DEFAULT_WORKSPACE_PUBLIC_DOMAIN;
}

function normalizeTenantSlug(slug: string): string {
  const clean =
    slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace";
  return clean;
}

/** Public workspace host shown in Super Admin tenant tables (never uses .demo). */
export function tenantWorkspaceHost(
  slug: string,
  domain = resolveWorkspacePublicDomain(),
): string {
  const parent = domain.trim().replace(/^\.+/, "").replace(/\/+$/, "");
  return `${normalizeTenantSlug(slug)}.${parent}`;
}
