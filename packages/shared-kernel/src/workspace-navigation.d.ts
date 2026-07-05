export declare const WORKSPACE_SIDEBAR_LABELS: readonly ["Dashboard", "Sales", "Purchases", "Inventory", "Customers", "Vendors", "Accounting", "HR & Payroll", "Reports", "Settings"];
export declare function workspaceNavHasDuplicateCrm(labels: readonly string[]): boolean;
export declare function normalizeWorkspacePath(pathname: string): string;
export declare function isWorkspaceNavItemActive(pathname: string, to: string, label: string): boolean;
export type DashboardErrorKind = 'api_config' | 'auth' | 'connection' | 'unknown';
export declare function classifyDashboardLoaderError(message: string): DashboardErrorKind;
