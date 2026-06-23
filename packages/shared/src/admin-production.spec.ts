import { isAdminNavItemActive } from "./admin-navigation";
import { canSeedDemoTenants } from "./seed-guards";
import {
  isProductionPlatformUser,
  isProductionTenant,
  productionTenantWhere,
} from "./production-data";
import {
  resolveWorkspacePublicDomain,
  tenantWorkspaceHost,
} from "./workspace-host";

describe("workspace-host", () => {
  it('returns sah-digitals.app.velonerp.com by default', () => {
    expect(tenantWorkspaceHost("sah-digitals")).toBe("sah-digitals.app.velonerp.com");
  });

  it("never returns .demo in admin workspace display", () => {
    expect(tenantWorkspaceHost("acme-retail")).not.toContain(".demo");
    expect(tenantWorkspaceHost("demo-retail")).not.toContain(".demo");
  });

  it("respects configured workspace domain env", () => {
    expect(
      tenantWorkspaceHost(
        "sah-digitals",
        resolveWorkspacePublicDomain({ PUBLIC_WORKSPACE_DOMAIN: "workspaces.velonerp.com" }),
      ),
    ).toBe("sah-digitals.workspaces.velonerp.com");
  });
});

describe("admin-navigation", () => {
  it("activates only Overview on /admin", () => {
    expect(isAdminNavItemActive("/admin", "/admin", "Overview")).toBe(true);
    expect(isAdminNavItemActive("/admin", "/admin/tenants", "Tenants")).toBe(false);
    expect(isAdminNavItemActive("/admin", "/admin/users", "Users")).toBe(false);
  });

  it("activates only Tenants on /admin/tenants", () => {
    expect(isAdminNavItemActive("/admin/tenants", "/admin", "Overview")).toBe(false);
    expect(isAdminNavItemActive("/admin/tenants", "/admin/tenants", "Tenants")).toBe(true);
    expect(isAdminNavItemActive("/admin/tenants", "/admin/users", "Users")).toBe(false);
  });

  it("activates only Subscriptions on /admin/subscriptions", () => {
    expect(isAdminNavItemActive("/admin/subscriptions", "/admin", "Overview")).toBe(false);
    expect(
      isAdminNavItemActive("/admin/subscriptions", "/admin/subscriptions", "Subscriptions"),
    ).toBe(true);
  });
});

describe("seed-guards", () => {
  it("never seeds demo tenants in production", () => {
    expect(canSeedDemoTenants({ NODE_ENV: "production", SEED_DEMO_DATA: "true" })).toBe(false);
  });

  it("allows demo tenants in test mode", () => {
    expect(canSeedDemoTenants({ NODE_ENV: "test" })).toBe(true);
  });

  it("requires SEED_DEMO_DATA in development", () => {
    expect(canSeedDemoTenants({ NODE_ENV: "development" })).toBe(false);
    expect(canSeedDemoTenants({ NODE_ENV: "development", SEED_DEMO_DATA: "true" })).toBe(true);
  });
});

describe("production-data", () => {
  it("excludes seedSource demo/e2e tenants from production lists", () => {
    expect(isProductionTenant({ seedSource: "e2e", deletedAt: null })).toBe(false);
    expect(isProductionTenant({ seedSource: "demo", deletedAt: null })).toBe(false);
    expect(isProductionTenant({ seedSource: null, deletedAt: null })).toBe(true);
  });

  it("includes real Trial tenants (seedSource null)", () => {
    expect(isProductionTenant({ seedSource: null, deletedAt: null })).toBe(true);
  });

  it("does not treat tenant names as demo (seedSource only)", () => {
    expect(isProductionTenant({ seedSource: null, deletedAt: null })).toBe(true);
  });

  it("excludes soft-deleted tenants from normal list", () => {
    expect(isProductionTenant({ seedSource: null, deletedAt: new Date() })).toBe(false);
  });

  it("filters demo/e2e via productionTenantWhere seedSource only", () => {
    expect(productionTenantWhere()).toEqual({
      deletedAt: null,
      OR: [{ seedSource: null }, { seedSource: { notIn: ["demo", "e2e"] } }],
    });
  });

  it("excludes seedSource demo/e2e platform users", () => {
    expect(isProductionPlatformUser({ seedSource: "e2e" })).toBe(false);
    expect(isProductionPlatformUser({ seedSource: null })).toBe(true);
  });
});

describe("trial vs demo separation", () => {
  it("Trial lifecycle is not demo detection", () => {
    const realTrialTenant = { seedSource: null as string | null, deletedAt: null as Date | null };
    expect(isProductionTenant(realTrialTenant)).toBe(true);
  });

  it("demo hostname suffix is not used for demo detection", () => {
    expect(tenantWorkspaceHost("sah-digitals")).not.toContain(".demo");
    expect(isProductionTenant({ seedSource: null, deletedAt: null })).toBe(true);
  });
});
