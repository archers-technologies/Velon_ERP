import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeVelonRole, type VelonRole } from "@velon/shared";

export type WorkspaceContext = {
  tenantId: string;
  workspaceId: string;
  membershipId: string;
  role: VelonRole;
  user: { id: string; email: string; name: string | null };
  workspace: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    language: string;
    isActive: boolean;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
    renewalDate: Date;
  };
  companyProfile: {
    legalName: string;
    email: string;
    phone: string;
    country: string;
    industry: string;
    address: string | null;
    website: string | null;
    taxId: string | null;
    logoDataUrl: string | null;
  } | null;
  subscription: {
    plan: string;
    status: string;
    renewalDate: string;
  };
};

/**
 * Single source of truth for tenant workspace context.
 * All tenant-scoped modules MUST resolve tenantId via this service — never from
 * localStorage, query params, URL segments, or request body fields.
 */
@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  assertTenantUser(user: AuthenticatedUser | undefined): asserts user is AuthenticatedUser {
    if (!user) throw new UnauthorizedException("Authentication required.");
    if (user.scope !== "tenant" || !user.tenantId || !user.workspaceId || !user.membershipId) {
      throw new ForbiddenException("Workspace access required.");
    }
  }

  async resolve(user: AuthenticatedUser): Promise<WorkspaceContext> {
    this.assertTenantUser(user);

    const membership = await this.prisma.client.tenantMembership.findUnique({
      where: { id: user.membershipId },
      include: {
        user: { select: { id: true, email: true, name: true, isActive: true } },
        tenant: {
          include: {
            workspace: true,
            companyProfile: true,
          },
        },
      },
    });

    if (
      !membership?.isActive ||
      !membership.user.isActive ||
      membership.userId !== user.id ||
      membership.tenantId !== user.tenantId ||
      !membership.tenant.workspace ||
      membership.tenant.workspace.id !== user.workspaceId ||
      !membership.tenant.workspace.isActive
    ) {
      throw new ForbiddenException("Workspace membership invalid or revoked.");
    }

    const ws = membership.tenant.workspace;
    const profile = membership.tenant.companyProfile;

    return {
      tenantId: membership.tenantId,
      workspaceId: ws.id,
      membershipId: membership.id,
      role: normalizeVelonRole(membership.role) as VelonRole,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
      },
      workspace: {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        timezone: ws.timezone,
        currency: ws.currency,
        language: ws.language,
        isActive: ws.isActive,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        status: membership.tenant.status,
        plan: membership.tenant.plan,
        renewalDate: membership.tenant.renewalDate,
      },
      companyProfile: profile
        ? {
            legalName: profile.legalName,
            email: profile.email,
            phone: profile.phone,
            country: profile.country,
            industry: profile.industry,
            address: profile.address,
            website: profile.website,
            taxId: profile.taxId,
            logoDataUrl: profile.logoDataUrl,
          }
        : null,
      subscription: {
        plan: membership.tenant.plan,
        status: membership.tenant.status,
        renewalDate: membership.tenant.renewalDate.toISOString(),
      },
    };
  }

  /** Returns JWT-validated tenantId only — ignores any client-supplied tenantId. */
  tenantIdFromAuth(user: AuthenticatedUser): string {
    this.assertTenantUser(user);
    return user.tenantId!;
  }
}
