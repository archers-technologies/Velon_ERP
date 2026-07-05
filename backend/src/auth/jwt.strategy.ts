import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TenantStatus, UserRole } from '@velon/database';
import {
  AuthScope,
  isPlatformRole,
  JwtPayload,
  normalizeVelonRole,
  VelonRole,
} from '@velon/shared';
import { getJwtAccessSecret } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.client.user.findUnique({ where: { id: payload.sub } });
    if (!user?.isActive) throw new UnauthorizedException('Session expired. Sign in again.');

    const scope: AuthScope =
      payload.scope ?? (isPlatformRole(payload.role) ? 'platform' : 'tenant');

    if (scope === 'platform') {
      if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.PLATFORM_SUPPORT) {
        throw new UnauthorizedException('Invalid platform session.');
      }
      return {
        id: user.id,
        email: user.email,
        scope: 'platform',
        role: user.role as VelonRole,
      };
    }

    if (!payload.membershipId || !payload.tenantId || !payload.workspaceId) {
      throw new UnauthorizedException('Invalid workspace session.');
    }

    const membership = await this.prisma.client.tenantMembership.findUnique({
      where: { id: payload.membershipId },
      include: { tenant: { include: { workspace: true } } },
    });

    if (
      !membership?.isActive ||
      membership.userId !== user.id ||
      membership.tenantId !== payload.tenantId ||
      !membership.tenant.workspace ||
      membership.tenant.workspace.id !== payload.workspaceId ||
      !membership.tenant.workspace.isActive
    ) {
      throw new UnauthorizedException('Workspace access revoked or expired.');
    }

    if (membership.tenant.status === TenantStatus.SUSPENDED) {
      throw new UnauthorizedException('Workspace suspended. Contact support.');
    }

    return {
      id: user.id,
      email: user.email,
      scope: 'tenant',
      role: normalizeVelonRole(membership.role) as VelonRole,
      tenantId: membership.tenantId,
      workspaceId: membership.tenant.workspace.id,
      membershipId: membership.id,
    };
  }
}
