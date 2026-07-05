export declare const DEMO_SEED_SOURCES: readonly ["demo", "e2e", "seed"];
export type DemoSeedSource = (typeof DEMO_SEED_SOURCES)[number];
export declare function isDemoSeedSource(value: string | null | undefined): boolean;
export declare function canSeedDemoTenants(env?: NodeJS.ProcessEnv): boolean;
export declare function inferDemoSeedSourceFromEmail(email: string): DemoSeedSource | null;
export declare function inferDemoSeedSourceFromTenantName(name: string): DemoSeedSource | null;
