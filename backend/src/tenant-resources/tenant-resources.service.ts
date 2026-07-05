import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import {
  TenantAssetRepository,
  TenantAuditRepository,
  TenantCustomerRepository,
  TenantFileRepository,
  TenantNotificationRepository,
  TenantProjectRepository,
} from "../common/repositories/tenant.repositories";

@Injectable()
export class TenantResourcesService {
  constructor(
    private readonly customers: TenantCustomerRepository,
    private readonly projects: TenantProjectRepository,
    private readonly assets: TenantAssetRepository,
    private readonly files: TenantFileRepository,
    private readonly notifications: TenantNotificationRepository,
    private readonly audit: TenantAuditRepository,
  ) {}

  createCustomer(_user: AuthenticatedUser, name: string) {
    return this.customers.create(name);
  }

  listCustomers(_user: AuthenticatedUser) {
    return this.customers.findMany();
  }

  async getCustomer(_user: AuthenticatedUser, id: string) {
    const row = await this.customers.findById(id);
    if (!row) throw new NotFoundException("Customer not found.");
    return row;
  }

  createProject(_user: AuthenticatedUser, name: string) {
    return this.projects.create(name);
  }

  async getProject(_user: AuthenticatedUser, id: string) {
    const row = await this.projects.findById(id);
    if (!row) throw new NotFoundException("Project not found.");
    return row;
  }

  createAsset(_user: AuthenticatedUser, name: string, tag?: string) {
    return this.assets.create(name, tag);
  }

  listAssets(_user: AuthenticatedUser) {
    return this.assets.findMany();
  }

  async getAsset(_user: AuthenticatedUser, id: string) {
    const row = await this.assets.findById(id);
    if (!row) throw new NotFoundException("Asset not found.");
    return row;
  }

  createFile(_user: AuthenticatedUser, name: string, mimeType?: string, sizeBytes?: number) {
    return this.files.create(name, mimeType, sizeBytes);
  }

  listFiles(_user: AuthenticatedUser) {
    return this.files.findMany();
  }

  async getFile(_user: AuthenticatedUser, id: string) {
    const row = await this.files.findById(id);
    if (!row) throw new NotFoundException("File not found.");
    return row;
  }

  createNotification(_user: AuthenticatedUser, title: string, body: string) {
    return this.notifications.create({ userId: _user.id, title, body });
  }

  listNotifications(user: AuthenticatedUser) {
    return this.notifications.findManyForUser(user.id);
  }

  async getNotification(user: AuthenticatedUser, id: string) {
    const row = await this.notifications.findById(id);
    if (!row || row.userId !== user.id) throw new NotFoundException("Notification not found.");
    return row;
  }

  listAuditLogs(_user: AuthenticatedUser) {
    return this.audit.findMany();
  }

  async getAuditLog(_user: AuthenticatedUser, id: string) {
    const row = await this.audit.findById(id);
    if (!row) throw new NotFoundException("Audit log not found.");
    return row;
  }
}
