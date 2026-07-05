import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth.types';

export type TenantContext = {
  tenantId: string;
  workspaceId: string;
  membershipId: string;
};

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user?.tenantId || !user.workspaceId || !user.membershipId) {
      throw new Error('Tenant context missing on request.');
    }
    return {
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      membershipId: user.membershipId,
    };
  },
);
