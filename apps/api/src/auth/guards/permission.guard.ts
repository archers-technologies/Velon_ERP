import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { normalizeVelonRole, roleHasPermission, VelonRole } from "@velon/shared";
import type { AuthenticatedUser } from "../auth.types";
import { PERMISSIONS_KEY } from "../decorators/require-permission.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user) throw new ForbiddenException("Insufficient permissions.");

    const role = normalizeVelonRole(user.role) as VelonRole;
    const ok = required.some((p) => roleHasPermission(role, p));
    if (!ok) {
      throw new ForbiddenException("Insufficient permissions.");
    }
    return true;
  }
}
