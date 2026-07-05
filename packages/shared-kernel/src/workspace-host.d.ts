export declare const DEFAULT_WORKSPACE_PUBLIC_DOMAIN = "app.velonerp.com";
export declare function resolveWorkspacePublicDomain(env?: Record<string, string | undefined>): string;
export declare function tenantWorkspaceHost(slug: string, domain?: string): string;
