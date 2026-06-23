import {
  SETTINGS_PATHS,
  canManageWorkspaceBilling,
  canManageWorkspaceSettings,
  parseWorkspaceAdminSection,
  settingsBillingSearch,
  workspaceAdminSearch,
  WORKSPACE_ADMIN_SECTIONS,
} from "./settings-routes";

describe("settings-routes", () => {
  it("defines canonical billing and admin paths", () => {
    expect(SETTINGS_PATHS.billing).toBe("/app/settings/billing");
    expect(SETTINGS_PATHS.admin).toBe("/app/settings/admin");
    expect(SETTINGS_PATHS.billingPos).toBe("/app/billing-pos");
  });

  it("falls back unknown admin section to users", () => {
    expect(parseWorkspaceAdminSection("users")).toBe("users");
    expect(parseWorkspaceAdminSection("invalid")).toBe("users");
    expect(parseWorkspaceAdminSection(undefined)).toBe("users");
  });

  it("builds admin search with parent settings tab", () => {
    expect(workspaceAdminSearch("users")).toEqual({ tab: "general", section: "users" });
    expect(workspaceAdminSearch("invitations")).toEqual({ tab: "general", section: "invitations" });
  });

  it("lists all workspace admin sections", () => {
    expect(WORKSPACE_ADMIN_SECTIONS).toContain("users");
    expect(WORKSPACE_ADMIN_SECTIONS).toContain("departments");
    expect(WORKSPACE_ADMIN_SECTIONS).toContain("invitations");
  });

  it("builds billing search with parent settings tab", () => {
    expect(settingsBillingSearch()).toEqual({ tab: "general" });
  });

  it("allows billing and admin management for tenant owner and admin only", () => {
    expect(canManageWorkspaceBilling("TENANT_OWNER")).toBe(true);
    expect(canManageWorkspaceBilling("TENANT_ADMIN")).toBe(true);
    expect(canManageWorkspaceBilling("USER")).toBe(false);
    expect(canManageWorkspaceSettings("TENANT_OWNER")).toBe(true);
    expect(canManageWorkspaceSettings("USER")).toBe(false);
  });
});
