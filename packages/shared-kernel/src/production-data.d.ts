export declare function productionTenantWhere(): {
  deletedAt: null;
  OR: (
    | {
        seedSource: null;
      }
    | {
        seedSource: {
          notIn: string[];
        };
      }
  )[];
};
export declare function productionPlatformUserWhere(): {
  OR: (
    | {
        seedSource: null;
      }
    | {
        seedSource: {
          notIn: string[];
        };
      }
  )[];
};
export declare function isProductionTenant(row: {
  seedSource?: string | null;
  deletedAt?: Date | null;
}): boolean;
export declare function isProductionPlatformUser(row: { seedSource?: string | null }): boolean;
