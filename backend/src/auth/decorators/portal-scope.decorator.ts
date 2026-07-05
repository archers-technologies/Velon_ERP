import { SetMetadata } from '@nestjs/common';
import type { AuthScope } from '@velon/shared';

export type PortalScope = AuthScope;

export const PORTAL_SCOPE_KEY = 'velon:portal_scope';

export const RequirePortalScope = (scope: PortalScope) => SetMetadata(PORTAL_SCOPE_KEY, scope);
