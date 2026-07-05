import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../auth/auth.types';
import { runWithTenantContext } from './tenant-context.storage';

/** Binds JWT tenant context for the full request so repositories auto-scope queries. */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (
      !user ||
      user.scope !== 'tenant' ||
      !user.tenantId ||
      !user.workspaceId ||
      !user.membershipId
    ) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      runWithTenantContext(
        {
          tenantId: user.tenantId!,
          workspaceId: user.workspaceId!,
          membershipId: user.membershipId!,
          userId: user.id,
        },
        () => {
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }
}
