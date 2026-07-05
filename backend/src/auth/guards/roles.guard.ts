import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@velon/database';
import { normalizeVelonRole } from '@velon/shared';
import type { AuthenticatedUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user) throw new ForbiddenException('Insufficient permissions.');
    const userRole = normalizeVelonRole(user.role);
    const allowed = required.map((r) => normalizeVelonRole(r));
    if (!allowed.includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions.');
    }
    return true;
  }
}
