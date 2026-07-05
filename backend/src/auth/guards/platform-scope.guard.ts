import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth.types';

@Injectable()
export class PlatformScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user) throw new UnauthorizedException('Authentication required.');
    if (user.scope !== 'platform') {
      throw new ForbiddenException('Platform access required.');
    }
    return true;
  }
}
