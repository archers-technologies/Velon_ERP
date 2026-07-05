import type { AuthScope, VelonRole } from '@velon/shared';

/** Attached to request after JWT validation. */
export type AuthenticatedUser = {
  id: string;
  email: string;
  scope: AuthScope;
  role: VelonRole;
  tenantId?: string;
  workspaceId?: string;
  membershipId?: string;
};

export type TokenIssueContext =
  | {
      scope: 'platform';
      userId: string;
      email: string;
      role: VelonRole;
    }
  | {
      scope: 'tenant';
      userId: string;
      email: string;
      role: VelonRole;
      tenantId: string;
      workspaceId: string;
      membershipId: string;
    };

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: string;
  email: string;
  scope: AuthScope;
  route: 'admin' | 'app';
  tenantId?: string;
  workspaceId?: string;
  membershipId?: string;
};
