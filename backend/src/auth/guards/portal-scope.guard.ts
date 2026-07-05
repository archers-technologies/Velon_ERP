import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../auth.types';
import { PORTAL_SCOPE_KEY, type PortalScope } from '../decorators/portal-scope.decorator';

/**
 * Enforces platform vs tenant portal separation on API routes.
 * Tenant context is never read from query/body — only JWT + membership.
 */
@Injectable()
export class PortalScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PortalScope | undefined>(PORTAL_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context
      .switchToHttp()
      .getRequest<{
        user?: AuthenticatedUser;
        ip?: string;
        headers: Record<string, string | string[] | undefined>;
        path: string;
      }>();
    const user = req.user;
    if (!user) throw new UnauthorizedException('Authentication required.');

    if (user.scope !== required) {
      await this.audit.logSecurityViolation({
        actorId: user.id,
        tenantId: user.tenantId,
        action: 'security.portal_scope_violation',
        entityType: 'portal',
        entityId: required,
        metadata: {
          requiredScope: required,
          actualScope: user.scope,
          path: req.path,
        },
        ipAddress: req.ip,
        userAgent:
          typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      });
      throw new ForbiddenException(
        required === 'platform'
          ? 'Platform access required. Tenant sessions cannot access this resource.'
          : 'Workspace access required. Platform sessions cannot access this resource.',
      );
    }
    return true;
  }
}
