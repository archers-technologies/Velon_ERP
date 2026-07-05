export declare const SETTINGS_USER_TABS: readonly ["general", "regional", "printers", "profile", "security"];
export type SettingsUserTab = (typeof SETTINGS_USER_TABS)[number];
export declare const WORKSPACE_ADMIN_SECTIONS: readonly ["company", "workspace", "users", "departments", "seats", "invitations", "security", "audit"];
export type WorkspaceAdminSection = (typeof WORKSPACE_ADMIN_SECTIONS)[number];
export declare const SETTINGS_PATHS: {
    readonly user: "/app/settings";
    readonly billing: "/app/settings/billing";
    readonly admin: "/app/settings/admin";
    readonly billingPos: "/app/billing-pos";
};
export declare function parseSettingsUserTab(value: unknown): SettingsUserTab;
export declare function parseWorkspaceAdminSection(value: unknown): WorkspaceAdminSection;
export declare function workspaceAdminSearch(section?: WorkspaceAdminSection): {
    tab: SettingsUserTab;
    section: "workspace" | "departments" | "invitations" | "security" | "company" | "users" | "seats" | "audit";
};
export declare function settingsBillingSearch(): {
    tab: SettingsUserTab;
};
export declare function canManageWorkspaceSettings(role: string): boolean;
export declare function canManageWorkspaceBilling(role: string): boolean;
