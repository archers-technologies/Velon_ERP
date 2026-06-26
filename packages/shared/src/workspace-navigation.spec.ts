import {
  classifyDashboardLoaderError,
  isWorkspaceNavItemActive,
  workspaceNavHasDuplicateCrm,
  WORKSPACE_SIDEBAR_LABELS,
} from "./workspace-navigation";

describe("workspace-navigation", () => {
  it("does not include duplicate CRM and Sales CRM in canonical labels", () => {
    expect(workspaceNavHasDuplicateCrm(WORKSPACE_SIDEBAR_LABELS)).toBe(false);
    expect(WORKSPACE_SIDEBAR_LABELS).not.toContain("CRM");
    expect(WORKSPACE_SIDEBAR_LABELS).toContain("Sales CRM");
  });

  it("highlights only Customers on /app/customers", () => {
    expect(isWorkspaceNavItemActive("/app/customers", "/app/customers", "Customers")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/customers", "/app/sales-crm", "Sales CRM")).toBe(false);
    expect(isWorkspaceNavItemActive("/app/customers", "/app/crm/leads", "Sales CRM")).toBe(false);
  });

  it("highlights Sales CRM on /app/crm/leads and /app/sales-crm", () => {
    expect(isWorkspaceNavItemActive("/app/crm/leads", "/app/sales-crm", "Sales CRM")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/sales-crm", "/app/sales-crm", "Sales CRM")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/crm/leads", "/app/customers", "Customers")).toBe(false);
  });

  it("separates Procurement and Suppliers highlighting", () => {
    expect(isWorkspaceNavItemActive("/app/procurement", "/app/procurement", "Procurement")).toBe(
      true,
    );
    expect(isWorkspaceNavItemActive("/app/procurement", "/app/suppliers", "Suppliers")).toBe(
      false,
    );
    expect(isWorkspaceNavItemActive("/app/suppliers", "/app/suppliers", "Suppliers")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/suppliers", "/app/procurement", "Procurement")).toBe(
      false,
    );
  });

  it("highlights dashboard only on /app", () => {
    expect(isWorkspaceNavItemActive("/app", "/app", "Dashboard")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/customers", "/app", "Dashboard")).toBe(false);
  });

  it("highlights Settings for general and admin subroutes, not billing", () => {
    expect(isWorkspaceNavItemActive("/app/settings/admin", "/app/settings", "Settings")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/settings", "/app/settings", "Settings")).toBe(true);
    expect(isWorkspaceNavItemActive("/app/settings/billing", "/app/settings", "Settings")).toBe(false);
  });

  it("highlights Subscription only on billing route", () => {
    expect(
      isWorkspaceNavItemActive("/app/settings/billing", "/app/settings/billing", "Subscription"),
    ).toBe(true);
    expect(
      isWorkspaceNavItemActive("/app/settings/billing", "/app/settings", "Settings"),
    ).toBe(false);
    expect(
      isWorkspaceNavItemActive("/app/settings", "/app/settings/billing", "Subscription"),
    ).toBe(false);
    expect(
      isWorkspaceNavItemActive("/app/settings/admin", "/app/settings/billing", "Subscription"),
    ).toBe(false);
  });

  it("classifies missing API config separately from auth errors", () => {
    expect(
      classifyDashboardLoaderError("VITE_API_URL is required — workspace dashboard needs a live API connection."),
    ).toBe("api_config");
    expect(classifyDashboardLoaderError("Session expired. Sign in again.")).toBe("auth");
    expect(classifyDashboardLoaderError("Failed to fetch")).toBe("connection");
  });
});
