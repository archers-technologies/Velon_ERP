import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { CrmActivityStatus, CrmCustomerStatus, CrmNoteTargetType } from '@velon/database';
import {
  canManageCrmActivities,
  canManageCrmCustomers,
  canReadCrm,
  canWriteCrmActivities,
  canWriteCrmRecords,
  normalizeVelonRole,
} from '@velon/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CrmActivityRepository,
  CrmContactRepository,
  CrmCustomerRepository,
  CrmNoteRepository,
} from './crm.repositories';
import type {
  AssignCrmActivityDto,
  CreateCrmActivityDto,
  CreateCrmContactDto,
  CreateCrmCustomerDto,
  CreateCrmNoteDto,
  CrmActivityQueryDto,
  CrmContactQueryDto,
  CrmCustomerQueryDto,
  CrmNoteQueryDto,
  UpdateCrmActivityDto,
  UpdateCrmContactDto,
  UpdateCrmCustomerDto,
  UpdateCrmNoteDto,
} from './dto/crm.dto';

type AuditMeta = { ip?: string; ua?: string };

@Injectable()
export class CrmService {
  constructor(
    private readonly customers: CrmCustomerRepository,
    private readonly contacts: CrmContactRepository,
    private readonly notes: CrmNoteRepository,
    private readonly activities: CrmActivityRepository,
    private readonly audit: AuditService,
  ) {}

  private role(user: AuthenticatedUser) {
    return normalizeVelonRole(user.role);
  }

  private assertRead(user: AuthenticatedUser) {
    if (!canReadCrm(this.role(user))) throw new ForbiddenException('CRM access denied.');
  }

  private assertWrite(user: AuthenticatedUser) {
    if (!canWriteCrmRecords(this.role(user))) {
      throw new ForbiddenException('Insufficient permissions to modify CRM records.');
    }
  }

  private assertManageCustomers(user: AuthenticatedUser) {
    if (!canManageCrmCustomers(this.role(user))) {
      throw new ForbiddenException('Tenant Owner permissions required.');
    }
  }

  private assertWriteActivities(user: AuthenticatedUser) {
    if (!canWriteCrmActivities(this.role(user))) {
      throw new ForbiddenException('Insufficient permissions for CRM activities.');
    }
  }

  private customerCode() {
    return `CUS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private mapCustomer(row: { archivedAt: Date | null; [key: string]: unknown }) {
    return {
      ...row,
      isArchived: row.archivedAt != null,
    };
  }

  // ─── Customers ─────────────────────────────────────────────

  listCustomers(user: AuthenticatedUser, query: CrmCustomerQueryDto) {
    this.assertRead(user);
    return this.customers
      .findMany({
        search: query.search,
        status: query.status,
        includeArchived: query.includeArchived === 'true',
      })
      .then((rows) => rows.map((r) => this.mapCustomer(r)));
  }

  async getCustomer(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.customers.findById(id, true);
    if (!row) throw new NotFoundException('Customer not found.');
    if (row.archivedAt && !canManageCrmCustomers(this.role(user))) {
      throw new NotFoundException('Customer not found.');
    }
    return this.mapCustomer(row);
  }

  async createCustomer(user: AuthenticatedUser, dto: CreateCrmCustomerDto, meta: AuditMeta) {
    this.assertWrite(user);
    const row = await this.customers.create({
      customerCode: this.customerCode(),
      companyName: dto.companyName.trim(),
      legalName: dto.legalName?.trim() || null,
      industry: dto.industry?.trim() || null,
      website: dto.website?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      phone: dto.phone?.trim() || null,
      country: dto.country?.trim() || null,
      city: dto.city?.trim() || null,
      address: dto.address?.trim() || null,
      status: dto.status ?? CrmCustomerStatus.PROSPECT,
      createdById: user.id,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.customer_created',
      entityType: 'crm_customer',
      entityId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.mapCustomer(row);
  }

  async updateCustomer(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCrmCustomerDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.customers.findByIdAny(id);
    if (!existing) throw new NotFoundException('Customer not found.');
    const row = await this.customers.update(id, {
      ...(dto.companyName !== undefined ? { companyName: dto.companyName.trim() } : {}),
      ...(dto.legalName !== undefined ? { legalName: dto.legalName?.trim() || null } : {}),
      ...(dto.industry !== undefined ? { industry: dto.industry?.trim() || null } : {}),
      ...(dto.website !== undefined ? { website: dto.website?.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.country !== undefined ? { country: dto.country?.trim() || null } : {}),
      ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
      ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.customer_updated',
      entityType: 'crm_customer',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.mapCustomer({ ...row, archivedAt: existing.archivedAt });
  }

  async archiveCustomer(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertManageCustomers(user);
    const existing = await this.customers.findByIdAny(id);
    if (!existing) throw new NotFoundException('Customer not found.');
    if (existing.archivedAt) throw new BadRequestException('Customer is already archived.');
    await this.customers.update(id, {
      archivedAt: new Date(),
      status: CrmCustomerStatus.INACTIVE,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.customer_updated',
      entityType: 'crm_customer',
      entityId: id,
      metadata: { archived: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  async restoreCustomer(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertManageCustomers(user);
    const existing = await this.customers.findByIdAny(id);
    if (!existing) throw new NotFoundException('Customer not found.');
    if (!existing.archivedAt) throw new BadRequestException('Customer is not archived.');
    await this.customers.update(id, {
      archivedAt: null,
      status: CrmCustomerStatus.ACTIVE,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.customer_updated',
      entityType: 'crm_customer',
      entityId: id,
      metadata: { restored: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  async deleteCustomer(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertManageCustomers(user);
    const existing = await this.customers.findByIdAny(id);
    if (!existing) throw new NotFoundException('Customer not found.');
    await this.customers.delete(id);
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.customer_deleted',
      entityType: 'crm_customer',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  // ─── Contacts ──────────────────────────────────────────────

  listContacts(user: AuthenticatedUser, query: CrmContactQueryDto) {
    this.assertRead(user);
    return this.contacts.findMany({
      search: query.search,
      customerId: query.customerId,
      includeArchived: query.includeArchived === 'true',
    });
  }

  async getContact(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.contacts.findById(id, true);
    if (!row) throw new NotFoundException('Contact not found.');
    if (row.archivedAt && !canManageCrmCustomers(this.role(user))) {
      throw new NotFoundException('Contact not found.');
    }
    return row;
  }

  async createContact(user: AuthenticatedUser, dto: CreateCrmContactDto, meta: AuditMeta) {
    this.assertWrite(user);
    const customer = await this.customers.findById(dto.customerId);
    if (!customer) throw new BadRequestException('Customer not found.');
    const row = await this.contacts.create({
      customerId: dto.customerId,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      jobTitle: dto.jobTitle?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      phone: dto.phone?.trim() || null,
      mobile: dto.mobile?.trim() || null,
      department: dto.department?.trim() || null,
      notes: dto.notes?.trim() || null,
      createdById: user.id,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.contact_created',
      entityType: 'crm_contact',
      entityId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async updateContact(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCrmContactDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.contacts.findByIdAny(id);
    if (!existing) throw new NotFoundException('Contact not found.');
    const row = await this.contacts.update(id, {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle?.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.mobile !== undefined ? { mobile: dto.mobile?.trim() || null } : {}),
      ...(dto.department !== undefined ? { department: dto.department?.trim() || null } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.contact_updated',
      entityType: 'crm_contact',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async archiveContact(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const existing = await this.contacts.findByIdAny(id);
    if (!existing) throw new NotFoundException('Contact not found.');
    await this.contacts.update(id, { archivedAt: new Date(), updatedById: user.id });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.contact_updated',
      entityType: 'crm_contact',
      entityId: id,
      metadata: { archived: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  async restoreContact(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const existing = await this.contacts.findByIdAny(id);
    if (!existing) throw new NotFoundException('Contact not found.');
    await this.contacts.update(id, { archivedAt: null, updatedById: user.id });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.contact_updated',
      entityType: 'crm_contact',
      entityId: id,
      metadata: { restored: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  // ─── Notes ─────────────────────────────────────────────────

  async listNotes(user: AuthenticatedUser, query: CrmNoteQueryDto) {
    this.assertRead(user);
    if (query.targetId && query.targetType) {
      await this.assertNoteTargetVisible(user, query.targetType, query.targetId);
    }
    return this.notes.findMany({
      targetType: query.targetType,
      targetId: query.targetId,
    });
  }

  private async assertNoteTargetVisible(
    user: AuthenticatedUser,
    targetType: CrmNoteTargetType,
    targetId: string,
  ) {
    if (targetType === CrmNoteTargetType.CUSTOMER) {
      await this.getCustomer(user, targetId);
    } else {
      await this.getContact(user, targetId);
    }
  }

  async createNote(user: AuthenticatedUser, dto: CreateCrmNoteDto, meta: AuditMeta) {
    this.assertRead(user);
    await this.assertNoteTargetVisible(user, dto.targetType, dto.targetId);
    const row = await this.notes.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      content: dto.content.trim(),
      createdById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.note_added',
      entityType: 'crm_note',
      entityId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async updateNote(user: AuthenticatedUser, id: string, dto: UpdateCrmNoteDto, meta: AuditMeta) {
    this.assertRead(user);
    const existing = await this.notes.findById(id);
    if (!existing) throw new NotFoundException('Note not found.');
    if (existing.createdById !== user.id && !canWriteCrmRecords(this.role(user))) {
      throw new ForbiddenException('You can only edit your own notes.');
    }
    const row = await this.notes.update(id, dto.content.trim());
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.note_added',
      entityType: 'crm_note',
      entityId: id,
      metadata: { updated: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async deleteNote(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertRead(user);
    const existing = await this.notes.findById(id);
    if (!existing) throw new NotFoundException('Note not found.');
    if (existing.createdById !== user.id && !canWriteCrmRecords(this.role(user))) {
      throw new ForbiddenException('You can only delete your own notes.');
    }
    await this.notes.delete(id);
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.note_added',
      entityType: 'crm_note',
      entityId: id,
      metadata: { deleted: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  // ─── Activities ────────────────────────────────────────────

  listActivities(user: AuthenticatedUser, query: CrmActivityQueryDto) {
    this.assertRead(user);
    return this.activities.findMany({
      customerId: query.customerId,
      ownerId: query.ownerId,
      status: query.status,
      type: query.type,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  async getActivity(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.activities.findById(id);
    if (!row) throw new NotFoundException('Activity not found.');
    return row;
  }

  async createActivity(user: AuthenticatedUser, dto: CreateCrmActivityDto, meta: AuditMeta) {
    this.assertWriteActivities(user);
    const customer = await this.customers.findById(dto.customerId);
    if (!customer) throw new BadRequestException('Customer not found.');
    if (dto.contactId) {
      const contact = await this.contacts.findById(dto.contactId);
      if (!contact || contact.customerId !== dto.customerId) {
        throw new BadRequestException('Contact not found for this customer.');
      }
    }
    const row = await this.activities.create({
      customerId: dto.customerId,
      contactId: dto.contactId || null,
      type: dto.type,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      activityDate: new Date(dto.activityDate),
      ownerId: dto.ownerId || user.id,
      status: CrmActivityStatus.OPEN,
      createdById: user.id,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.activity_created',
      entityType: 'crm_activity',
      entityId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async assignActivity(
    user: AuthenticatedUser,
    id: string,
    dto: AssignCrmActivityDto,
    meta: AuditMeta,
  ) {
    if (!canManageCrmActivities(this.role(user))) {
      throw new ForbiddenException('Insufficient permissions to assign activities.');
    }
    const existing = await this.activities.findById(id);
    if (!existing) throw new NotFoundException('Activity not found.');
    const row = await this.activities.update(id, {
      ownerId: dto.ownerId,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.activity_created',
      entityType: 'crm_activity',
      entityId: id,
      metadata: { assigned: dto.ownerId },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async completeActivity(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWriteActivities(user);
    const existing = await this.activities.findById(id);
    if (!existing) throw new NotFoundException('Activity not found.');
    if (existing.status !== CrmActivityStatus.OPEN) {
      throw new BadRequestException('Activity is not open.');
    }
    const row = await this.activities.update(id, {
      status: CrmActivityStatus.COMPLETED,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.activity_completed',
      entityType: 'crm_activity',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async cancelActivity(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWriteActivities(user);
    const existing = await this.activities.findById(id);
    if (!existing) throw new NotFoundException('Activity not found.');
    if (existing.status !== CrmActivityStatus.OPEN) {
      throw new BadRequestException('Activity is not open.');
    }
    const row = await this.activities.update(id, {
      status: CrmActivityStatus.CANCELLED,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.activity_cancelled',
      entityType: 'crm_activity',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async updateActivity(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCrmActivityDto,
    meta: AuditMeta,
  ) {
    this.assertWriteActivities(user);
    const existing = await this.activities.findById(id);
    if (!existing) throw new NotFoundException('Activity not found.');
    const row = await this.activities.update(id, {
      ...(dto.contactId !== undefined ? { contactId: dto.contactId || null } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.activityDate !== undefined ? { activityDate: new Date(dto.activityDate) } : {}),
      ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.activity_created',
      entityType: 'crm_activity',
      entityId: id,
      metadata: { updated: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }
}
