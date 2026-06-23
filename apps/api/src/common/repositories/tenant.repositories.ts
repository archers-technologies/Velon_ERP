import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { TenantScopedRepository } from "../repositories/tenant-scoped.repository";

@Injectable()
export class TenantCustomerRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  create(name: string) {
    return this.prisma.client.tenantCustomer.create({
      data: { tenantId: this.tenantId, name: name.trim() },
    });
  }

  findMany() {
    return this.prisma.client.tenantCustomer.findMany({
      where: this.where(),
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.tenantCustomer.findFirst({
      where: this.where({ id }),
    });
  }
}

@Injectable()
export class TenantProjectRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  create(name: string) {
    return this.prisma.client.tenantProject.create({
      data: { tenantId: this.tenantId, name: name.trim() },
    });
  }

  findById(id: string) {
    return this.prisma.client.tenantProject.findFirst({
      where: this.where({ id }),
    });
  }
}

@Injectable()
export class TenantAssetRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  create(name: string, tag?: string) {
    return this.prisma.client.tenantAsset.create({
      data: { tenantId: this.tenantId, name: name.trim(), tag: tag?.trim() || null },
    });
  }

  findMany() {
    return this.prisma.client.tenantAsset.findMany({
      where: this.where(),
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.tenantAsset.findFirst({
      where: this.where({ id }),
    });
  }
}

@Injectable()
export class TenantFileRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  create(name: string, mimeType?: string, sizeBytes?: number) {
    return this.prisma.client.tenantFile.create({
      data: {
        tenantId: this.tenantId,
        name: name.trim(),
        mimeType: mimeType?.trim() || "application/octet-stream",
        sizeBytes: sizeBytes ?? 0,
      },
    });
  }

  findMany() {
    return this.prisma.client.tenantFile.findMany({
      where: this.where(),
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.tenantFile.findFirst({
      where: this.where({ id }),
    });
  }
}

@Injectable()
export class TenantNotificationRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  create(input: { userId: string; title: string; body: string }) {
    return this.prisma.client.notification.create({
      data: {
        tenantId: this.tenantId,
        userId: input.userId,
        title: input.title,
        body: input.body,
      },
    });
  }

  findManyForUser(userId: string) {
    return this.prisma.client.notification.findMany({
      where: this.where({ userId }),
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string) {
    return this.prisma.client.notification.findFirst({
      where: this.where({ id }),
    });
  }
}

@Injectable()
export class TenantAuditRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  findMany(limit = 50) {
    return this.prisma.client.auditLog.findMany({
      where: this.where(),
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  findById(id: string) {
    return this.prisma.client.auditLog.findFirst({
      where: this.where({ id }),
    });
  }
}

export const TENANT_REPOSITORIES = [
  TenantCustomerRepository,
  TenantProjectRepository,
  TenantAssetRepository,
  TenantFileRepository,
  TenantNotificationRepository,
  TenantAuditRepository,
];
