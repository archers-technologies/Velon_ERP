import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SubscriptionAccessService } from '../../billing/subscription-access.service';
import type { AuthenticatedUser } from '../auth.types';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionAccess: SubscriptionAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user || user.scope !== 'tenant' || !user.tenantId) {
      return true;
    }

    const path = req.path ?? req.url ?? '';
    await this.subscriptionAccess.assertWorkspaceAccess(user.tenantId, path);
    return true;
  }
}
