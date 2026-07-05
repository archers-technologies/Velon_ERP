import { Injectable } from '@nestjs/common';
import { Prisma } from '@velon/database';
import { PrismaService } from '../prisma/prisma.service';

export type AuditInput = {
  actorId?: string;
  tenantId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    return this.prisma.client.auditLog.create({ data: input });
  }

  async logLogin(input: Omit<AuditInput, 'action' | 'entityType'>) {
    return this.log({
      ...input,
      action: 'auth.login',
      entityType: 'user',
      entityId: input.actorId,
    });
  }

  async logLogout(input: Omit<AuditInput, 'action' | 'entityType'>) {
    return this.log({
      ...input,
      action: 'auth.logout',
      entityType: 'user',
      entityId: input.actorId,
    });
  }

  async logRegistration(input: Omit<AuditInput, 'action' | 'entityType'>) {
    return this.log({
      ...input,
      action: 'auth.registration',
      entityType: 'user',
      entityId: input.actorId,
    });
  }

  async logWorkspaceCreated(input: Omit<AuditInput, 'action' | 'entityType'>) {
    return this.log({
      ...input,
      action: 'workspace.created',
      entityType: 'workspace',
      entityId: input.entityId,
    });
  }

  async logSecurityViolation(input: AuditInput) {
    return this.log({ ...input, action: input.action || 'security.violation' });
  }

  async logFailedAccess(input: AuditInput) {
    return this.log({ ...input, action: input.action || 'security.access_denied' });
  }

  async listRecent(limit = 50, tenantId?: string) {
    return this.prisma.client.auditLog.findMany({
      where: tenantId ? { tenantId } : undefined,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { email: true, name: true } } },
    });
  }
}
