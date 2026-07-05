import type { PrismaService } from "../../prisma/prisma.service";
import { getActiveTenantContext } from "../tenant-context.storage";

/**
 * Base repository — every query is automatically scoped to JWT tenantId.
 * Developers must not pass tenantId from request body, query, or headers.
 */
export abstract class TenantScopedRepository {
  constructor(protected readonly prisma: PrismaService) {}

  protected get tenantId(): string {
    return getActiveTenantContext().tenantId;
  }

  protected where<T extends Record<string, unknown>>(extra?: T): T & { tenantId: string } {
    return { ...(extra ?? ({} as T)), tenantId: this.tenantId };
  }
}
