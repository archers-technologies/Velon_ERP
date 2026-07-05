import {
  classifyDashboardLoaderError,
  isWorkspaceNavItemActive,
  workspaceNavHasDuplicateCrm,
  WORKSPACE_SIDEBAR_LABELS,
} from "./workspace-navigation";

describe("workspace-navigation", () => {
  it("uses simple business labels without duplicate sales entries", () => {
    expect(workspaceNavHasDuplicateCrm(WORKSPACE_SIDEBAR_LABELS)).toBe(false);
    expect(WORKSPACE_SIDEBAR_LABELS).not.toContain("CRM");
    expect(WORKSPACE_SIDEBAR_LABELS).not.toContain("Sales CRM");
    expect(WORKSPACE_SIDEBAR_LABELS).toContain("Sales");
    expect(WORKSPACE_SIDEBAR_LABELS).toContain("Purchases");
    expect(WORKSPACE_SIDEBAR_LABELS).toContain("Vendors");
  });

  it("highlights only Customers on /app/customers", () => {
    expect(isWorkspaceNavItemActive("/app/customers", "/app/customers", "Customers")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/customers", "/app/sales-crm", "Sales")).toBe(false);
    expect(isWorkspaceNavItemActive("/app/customers", "/app/crm/leads", "Sales")).toBe(false);
  });

  it("highlights Sales on /app/crm/leads and /app/sales-crm", () => {
    expect(isWorkspaceNavItemActive("/app/crm/leads", "/app/sales-crm", "Sales")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/sales-crm", "/app/sales-crm", "Sales")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/crm/leads", "/app/customers", "Customers")).toBe(false);
  });

  it("separates Purchases and Vendors highlighting", () => {
    expect(isWorkspaceNavItemActive("/app/procurement", "/app/procurement", "Purchases")).toBe(
      true,
    );
    expect(isWorkspaceNavItemActive("/app/procurement", "/app/suppliers", "Vendors")).toBe(false);
    expect(isWorkspaceNavItemActive("/app/suppliers", "/app/suppliers", "Vendors")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/suppliers", "/app/procurement", "Purchases")).toBe(false);
  });

  it("highlights HR & Payroll on its hub route", () => {
    expect(isWorkspaceNavItemActive("/app/hr-payroll", "/app/hr-payroll", "HR & Payroll")).toBe(
      true,
    );
    expect(isWorkspaceNavItemActive("/app/settings/admin", "/app/hr-payroll", "HR & Payroll")).toBe(
      false,
    );
  });

  it("highlights dashboard only on /app", () => {
    expect(isWorkspaceNavItemActive("/app", "/app", "Dashboard")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/customers", "/app", "Dashboard")).toBe(false);
  });

  it("highlights Settings for general and admin subroutes, not billing or HR hub", () => {
    expect(isWorkspaceNavItemActive("/app/settings/admin", "/app/settings", "Settings")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/settings", "/app/settings", "Settings")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/settings/billing", "/app/settings", "Settings")).toBe(
      false,
    );
    expect(isWorkspaceNavItemActive("/app/hr-payroll", "/app/settings", "Settings")).toBe(false);
  });

  it("classifies missing API config separately from auth errors", () => {
    expect(
      classifyDashboardLoaderError(
        "VITE_API_URL is required — workspace dashboard needs a live API connection.",
      ),
    ).toBe("api_config");
    expect(classifyDashboardLoaderError("Session expired. Sign in again.")).toBe("auth");
    expect(classifyDashboardLoaderError("Failed to fetch")).toBe("connection");
  });
});
