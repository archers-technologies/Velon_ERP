import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { canManageProcurement, canReadProcurement, normalizeVelonRole } from "@velon/shared";
import * as crypto from "crypto";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import {
  CreateSupplierContactDto,
  CreateSupplierDto,
  CreateSupplierThreadDto,
  UpdateSupplierContactDto,
  UpdateSupplierDto,
} from "./dto/suppliers.dto";
import {
  SupplierContactRepository,
  SupplierRepository,
  SupplierThreadRepository,
} from "./suppliers.repositories";

type AuditMeta = { ip?: string; ua?: string };

@Injectable()
export class SuppliersService {
  constructor(
    private readonly suppliers: SupplierRepository,
    private readonly contacts: SupplierContactRepository,
    private readonly threads: SupplierThreadRepository,
    private readonly audit: AuditService,
  ) {}

  private role(user: AuthenticatedUser) {
    return normalizeVelonRole(user.role);
  }

  private assertRead(user: AuthenticatedUser) {
    if (!canReadProcurement(this.role(user))) {
      throw new ForbiddenException("Supplier access denied.");
    }
  }

  private assertManage(user: AuthenticatedUser) {
    if (!canManageProcurement(this.role(user))) {
      throw new ForbiddenException("Insufficient permissions to manage suppliers.");
    }
  }

  private supplierCode() {
    return `SUP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  }

  listSuppliers(user: AuthenticatedUser, search?: string) {
    this.assertRead(user);
    return this.suppliers.findMany({ search });
  }

  async getSupplier(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.suppliers.findById(id);
    if (!row) throw new NotFoundException("Supplier not found.");
    return row;
  }

  async createSupplier(user: AuthenticatedUser, dto: CreateSupplierDto, meta: AuditMeta) {
    this.assertManage(user);
    const code = dto.code?.trim() || this.supplierCode();
    const existing = await this.suppliers.findByCode(code);
    if (existing) throw new BadRequestException("Supplier code already exists.");

    const row = await this.suppliers.create({
      code,
      name: dto.name.trim(),
      legalName: dto.legalName?.trim() || null,
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
      vatNumber: dto.vatNumber?.trim() || null,
      crNumber: dto.crNumber?.trim() || null,
      country: dto.country?.trim() || null,
      address: dto.address?.trim() || null,
      status: dto.status,
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "procurement.supplier_created",
      entityType: "supplier",
      entityId: row.id,
      metadata: { code: row.code, name: row.name },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return row;
  }

  async updateSupplier(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateSupplierDto,
    meta: AuditMeta,
  ) {
    this.assertManage(user);
    const row = await this.suppliers.findById(id);
    if (!row) throw new NotFoundException("Supplier not found.");

    const updated = await this.suppliers.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.legalName !== undefined ? { legalName: dto.legalName?.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.vatNumber !== undefined ? { vatNumber: dto.vatNumber?.trim() || null } : {}),
      ...(dto.crNumber !== undefined ? { crNumber: dto.crNumber?.trim() || null } : {}),
      ...(dto.country !== undefined ? { country: dto.country?.trim() || null } : {}),
      ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "procurement.supplier_updated",
      entityType: "supplier",
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return updated;
  }

  listContacts(user: AuthenticatedUser, supplierId: string) {
    this.assertRead(user);
    return this.contacts.findBySupplier(supplierId);
  }

  async createContact(
    user: AuthenticatedUser,
    supplierId: string,
    dto: CreateSupplierContactDto,
  ) {
    this.assertManage(user);
    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) throw new NotFoundException("Supplier not found.");

    return this.contacts.create({
      supplierId,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
      jobTitle: dto.jobTitle?.trim() || null,
      isPrimary: dto.isPrimary ?? false,
    });
  }

  async updateContact(
    user: AuthenticatedUser,
    contactId: string,
    dto: UpdateSupplierContactDto,
  ) {
    this.assertManage(user);
    const row = await this.contacts.findById(contactId);
    if (!row) throw new NotFoundException("Contact not found.");

    return this.contacts.update(contactId, {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle?.trim() || null } : {}),
      ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
    });
  }

  async listThreads(user: AuthenticatedUser, supplierId: string) {
    this.assertRead(user);
    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) throw new NotFoundException("Supplier not found.");
    return this.threads.findBySupplier(supplierId);
  }

  async createThread(
    user: AuthenticatedUser,
    supplierId: string,
    dto: CreateSupplierThreadDto,
    meta: AuditMeta,
  ) {
    this.assertManage(user);
    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) throw new NotFoundException("Supplier not found.");

    const authorName = dto.authorName?.trim() || user.email;
    const row = await this.threads.create({
      supplierId,
      authorId: user.id,
      authorName,
      body: dto.body.trim(),
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "procurement.supplier_thread_posted",
      entityType: "supplier_thread",
      entityId: row.id,
      metadata: { supplierId, authorName },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return row;
  }
}
