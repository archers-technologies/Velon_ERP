import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { CrmQuotationApprovalAction, CrmQuotationStatus } from '@velon/database';
import { canReadCrm, canWriteCrmRecords, normalizeVelonRole } from '@velon/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationService } from '../email/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { CrmOpportunityRepository } from './crm-pipeline.repositories';
import {
  CrmProposalDocumentRepository,
  CrmProposalTemplateRepository,
  CrmQuotationApprovalRepository,
  CrmQuotationItemRepository,
  CrmQuotationRepository,
} from './crm-quotation.repositories';
import { CrmCustomerRepository } from './crm.repositories';
import {
  defaultProposalDocument,
  defaultQuotationDocument,
  type DocumentBody,
} from './document-builder.types';
import type {
  BulkAddCrmQuotationItemsDto,
  CreateCrmProposalTemplateDto,
  CreateCrmQuotationDto,
  CreateCrmQuotationItemDto,
  CreateQuotationRevisionDto,
  CrmQuotationQueryDto,
  CustomerViewCommentDto,
  QuotationActionDto,
  UpdateCrmProposalTemplateDto,
  UpdateCrmQuotationDto,
  UpdateCrmQuotationItemDto,
} from './dto/crm-quotation.dto';
import { ProposalPdfService } from './proposal-pdf.service';
import { QuotationDocumentPdfService } from './quotation-document-pdf.service';

type AuditMeta = { ip?: string; ua?: string };

function hashPortalToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function calcLineTotal(qty: number, unitPrice: number, discount: number, taxRate: number) {
  const sub = qty * unitPrice - discount;
  const tax = sub * (taxRate / 100);
  return Math.round((sub + tax) * 100) / 100;
}

@Injectable()
export class CrmQuotationService {
  constructor(
    private readonly quotations: CrmQuotationRepository,
    private readonly items: CrmQuotationItemRepository,
    private readonly approvals: CrmQuotationApprovalRepository,
    private readonly proposals: CrmProposalDocumentRepository,
    private readonly templates: CrmProposalTemplateRepository,
    private readonly customers: CrmCustomerRepository,
    private readonly opportunities: CrmOpportunityRepository,
    private readonly pdf: ProposalPdfService,
    private readonly quotationPdf: QuotationDocumentPdfService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private assertRead(user: AuthenticatedUser) {
    if (!canReadCrm(normalizeVelonRole(user.role))) {
      throw new ForbiddenException('CRM access denied.');
    }
  }

  private assertWrite(user: AuthenticatedUser) {
    if (!canWriteCrmRecords(normalizeVelonRole(user.role))) {
      throw new ForbiddenException('Insufficient permissions to modify quotations.');
    }
  }

  private async recalculateTotals(quotationId: string, quotationDiscount = 0) {
    const rows = await this.items.findByQuotation(quotationId);
    let subtotal = 0;
    let tax = 0;
    for (const row of rows) {
      const qty = Number(row.quantity);
      const unitPrice = Number(row.unitPrice);
      const disc = Number(row.discount);
      const taxRate = Number(row.taxRate);
      const lineSub = qty * unitPrice - disc;
      const lineTax = lineSub * (taxRate / 100);
      subtotal += lineSub;
      tax += lineTax;
    }
    subtotal = Math.round(subtotal * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    const total = Math.round((subtotal - quotationDiscount + tax) * 100) / 100;
    return this.quotations.update(quotationId, {
      subtotal,
      tax,
      total,
      discount: quotationDiscount,
    });
  }

  // ─── Dashboard metrics ───────────────────────────────────

  async getQuotationMetrics(user: AuthenticatedUser) {
    this.assertRead(user);
    const groups = await this.quotations.aggregateByStatus();
    const byStatus = Object.fromEntries(groups.map((g) => [g.status, g._count]));
    const totalQuotations = groups.reduce((s, g) => s + g._count, 0);
    const approved = byStatus[CrmQuotationStatus.APPROVED] ?? 0;
    const rejected = byStatus[CrmQuotationStatus.REJECTED] ?? 0;
    const expired = byStatus[CrmQuotationStatus.EXPIRED] ?? 0;
    const sent =
      (byStatus[CrmQuotationStatus.SENT] ?? 0) + (byStatus[CrmQuotationStatus.VIEWED] ?? 0);
    const decided = approved + rejected;
    const conversionRate = decided > 0 ? Math.round((approved / decided) * 10000) / 100 : 0;
    const quotationValue = groups.reduce((s, g) => s + Number(g._sum.total ?? 0), 0);
    const wonRevenue = groups
      .filter((g) => g.status === CrmQuotationStatus.APPROVED)
      .reduce((s, g) => s + Number(g._sum.total ?? 0), 0);

    return {
      totalQuotations,
      approvedQuotations: approved,
      rejectedQuotations: rejected,
      expiredQuotations: expired,
      pendingQuotations: sent,
      conversionRate,
      quotationValue,
      wonRevenue,
    };
  }

  private async workspaceName(user: AuthenticatedUser): Promise<string> {
    if (!user.workspaceId || !user.tenantId) return 'your workspace';
    const workspace = await this.prisma.client.workspace.findFirst({
      where: { id: user.workspaceId, tenantId: user.tenantId },
      select: { name: true },
    });
    return workspace?.name ?? 'your workspace';
  }

  private notifyQuotation(
    user: AuthenticatedUser,
    row: {
      id: string;
      quotationNumber: string;
      status: string;
      total?: unknown;
      currency?: string;
    },
    kind: 'created' | 'sent' | 'approved' | 'rejected',
  ) {
    if (!user.tenantId) return;

    void (async () => {
      try {
        const workspaceName = await this.workspaceName(user);
        const base = {
          tenantId: user.tenantId!,
          quotationId: row.id,
          quotationNumber: row.quotationNumber,
          userId: user.id,
          email: user.email,
          userName: user.email,
          workspaceName,
        };

        switch (kind) {
          case 'created':
            await this.notifications.notifyQuotationCreated({
              ...base,
              status: row.status,
            });
            break;
          case 'sent':
            await this.notifications.notifyQuotationSent({
              ...base,
              total: String(row.total ?? '0'),
              currency: row.currency ?? 'USD',
            });
            break;
          case 'approved':
            await this.notifications.notifyQuotationApproved(base);
            break;
          case 'rejected':
            await this.notifications.notifyQuotationRejected(base);
            break;
        }
      } catch {
        /* notification must not block CRM operations */
      }
    })();
  }

  // ─── Quotations ──────────────────────────────────────────

  listQuotations(user: AuthenticatedUser, query: CrmQuotationQueryDto) {
    this.assertRead(user);
    return this.quotations.findMany(query);
  }

  async getQuotation(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.quotations.findById(id);
    if (!row) throw new NotFoundException('Quotation not found.');
    return row;
  }

  async createQuotation(user: AuthenticatedUser, dto: CreateCrmQuotationDto, meta: AuditMeta) {
    this.assertWrite(user);
    const customer = await this.customers.findById(dto.customerId);
    if (!customer) throw new BadRequestException('Customer not found.');
    if (dto.opportunityId) {
      const opp = await this.opportunities.findById(dto.opportunityId);
      if (!opp) throw new BadRequestException('Opportunity not found.');
    }
    const year = new Date().getFullYear();
    const quotationNumber = await this.quotations.nextQuotationNumber(year);
    const documentJson = defaultQuotationDocument(dto.coverTitle?.trim() || undefined);
    const row = await this.quotations.create({
      quotationNumber,
      customerId: dto.customerId,
      opportunityId: dto.opportunityId || null,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      currency: dto.currency?.trim() || 'USD',
      language: dto.language?.trim() || 'en',
      notes: dto.notes?.trim() || null,
      terms: dto.terms?.trim() || null,
      scopeOfWork: dto.scopeOfWork?.trim() || null,
      deliverables: dto.deliverables?.trim() || null,
      coverTitle: dto.coverTitle?.trim() || null,
      executiveSummary: dto.executiveSummary?.trim() || null,
      timeline: dto.timeline?.trim() || null,
      assumptions: dto.assumptions?.trim() || null,
      exclusions: dto.exclusions?.trim() || null,
      documentJson,
      qrCode: crypto.randomBytes(16).toString('hex'),
      discount: dto.discount ?? 0,
      status: CrmQuotationStatus.DRAFT,
      createdById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_created',
      entityType: 'crm_quotation',
      entityId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    this.notifyQuotation(user, row, 'created');
    return row;
  }

  async updateQuotation(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCrmQuotationDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.quotations.findByIdAny(id);
    if (!existing) throw new NotFoundException('Quotation not found.');
    const editable: CrmQuotationStatus[] = [
      CrmQuotationStatus.DRAFT,
      CrmQuotationStatus.SENT,
      CrmQuotationStatus.VIEWED,
    ];
    if (!editable.includes(existing.status)) {
      throw new BadRequestException('Quotation cannot be edited in current status.');
    }
    const row = await this.quotations.update(id, {
      ...(dto.customerId !== undefined ? { customerId: dto.customerId } : {}),
      ...(dto.opportunityId !== undefined ? { opportunityId: dto.opportunityId || null } : {}),
      ...(dto.issueDate !== undefined ? { issueDate: new Date(dto.issueDate) } : {}),
      ...(dto.expiryDate !== undefined
        ? { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency.trim() || 'USD' } : {}),
      ...(dto.language !== undefined ? { language: dto.language.trim() || 'en' } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      ...(dto.terms !== undefined ? { terms: dto.terms?.trim() || null } : {}),
      ...(dto.scopeOfWork !== undefined ? { scopeOfWork: dto.scopeOfWork?.trim() || null } : {}),
      ...(dto.deliverables !== undefined ? { deliverables: dto.deliverables?.trim() || null } : {}),
      ...(dto.coverTitle !== undefined ? { coverTitle: dto.coverTitle?.trim() || null } : {}),
      ...(dto.executiveSummary !== undefined
        ? { executiveSummary: dto.executiveSummary?.trim() || null }
        : {}),
      ...(dto.timeline !== undefined ? { timeline: dto.timeline?.trim() || null } : {}),
      ...(dto.assumptions !== undefined ? { assumptions: dto.assumptions?.trim() || null } : {}),
      ...(dto.exclusions !== undefined ? { exclusions: dto.exclusions?.trim() || null } : {}),
      ...(dto.documentJson !== undefined ? { documentJson: dto.documentJson as object } : {}),
      ...(dto.signatureName !== undefined
        ? { signatureName: dto.signatureName?.trim() || null }
        : {}),
      ...(dto.signatureDataUrl !== undefined
        ? { signatureDataUrl: dto.signatureDataUrl || null }
        : {}),
    });
    if (dto.discount !== undefined) {
      await this.recalculateTotals(id, dto.discount);
    }
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_updated',
      entityType: 'crm_quotation',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.quotations.findById(id);
  }

  async createFromOpportunity(user: AuthenticatedUser, opportunityId: string, meta: AuditMeta) {
    this.assertWrite(user);
    const opp = await this.opportunities.findById(opportunityId);
    if (!opp) throw new NotFoundException('Opportunity not found.');
    if (!opp.customerId) throw new BadRequestException('Opportunity has no customer.');
    const year = new Date().getFullYear();
    const quotationNumber = await this.quotations.nextQuotationNumber(year);
    const row = await this.quotations.create({
      quotationNumber,
      customerId: opp.customerId,
      opportunityId: opp.id,
      issueDate: new Date(),
      expiryDate: opp.expectedCloseDate,
      notes: opp.description,
      scopeOfWork: opp.description,
      status: CrmQuotationStatus.DRAFT,
      createdById: user.id,
    });
    if (Number(opp.value) > 0) {
      await this.items.create({
        quotationId: row.id,
        itemName: opp.title,
        quantity: 1,
        unitPrice: Number(opp.value),
        lineTotal: Number(opp.value),
        position: 0,
      });
      await this.recalculateTotals(row.id, 0);
    }
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_created',
      entityType: 'crm_quotation',
      entityId: row.id,
      metadata: { fromOpportunityId: opportunityId },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.quotations.findById(row.id);
  }

  // ─── Items ───────────────────────────────────────────────

  async addItem(
    user: AuthenticatedUser,
    quotationId: string,
    dto: CreateCrmQuotationItemDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const q = await this.quotations.findByIdAny(quotationId);
    if (!q) throw new NotFoundException('Quotation not found.');
    if (q.status !== CrmQuotationStatus.DRAFT) {
      throw new BadRequestException('Items can only be added to draft quotations.');
    }
    const max = await this.items.maxPosition(quotationId);
    const qty = dto.quantity ?? 1;
    const unitPrice = dto.unitPrice ?? 0;
    const discount = dto.discount ?? 0;
    const taxRate = dto.taxRate ?? 0;
    const lineTotal = calcLineTotal(qty, unitPrice, discount, taxRate);
    const row = await this.items.create({
      quotationId,
      itemName: dto.itemName.trim(),
      description: dto.description?.trim() || null,
      quantity: qty,
      unitPrice,
      discount,
      taxRate,
      lineTotal,
      position: dto.position ?? (max._max.position ?? -1) + 1,
    });
    await this.recalculateTotals(quotationId, Number(q.discount));
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_updated',
      entityType: 'crm_quotation',
      entityId: quotationId,
      metadata: { itemAdded: row.id },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async bulkAddItems(
    user: AuthenticatedUser,
    quotationId: string,
    dto: BulkAddCrmQuotationItemsDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const q = await this.quotations.findByIdAny(quotationId);
    if (!q) throw new NotFoundException('Quotation not found.');
    if (q.status !== CrmQuotationStatus.DRAFT) {
      throw new BadRequestException('Items can only be added to draft quotations.');
    }
    let pos = (await this.items.maxPosition(quotationId))._max.position ?? -1;
    for (const item of dto.items) {
      pos += 1;
      const qty = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      const discount = item.discount ?? 0;
      const taxRate = item.taxRate ?? 0;
      await this.items.create({
        quotationId,
        itemName: item.itemName.trim(),
        description: item.description?.trim() || null,
        quantity: qty,
        unitPrice,
        discount,
        taxRate,
        lineTotal: calcLineTotal(qty, unitPrice, discount, taxRate),
        position: item.position ?? pos,
      });
    }
    await this.recalculateTotals(quotationId, Number(q.discount));
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_updated',
      entityType: 'crm_quotation',
      entityId: quotationId,
      metadata: { bulkItems: dto.items.length },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.items.findByQuotation(quotationId);
  }

  async updateItem(
    user: AuthenticatedUser,
    itemId: string,
    dto: UpdateCrmQuotationItemDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.items.findById(itemId);
    if (!existing) throw new NotFoundException('Item not found.');
    const q = await this.quotations.findByIdAny(existing.quotationId);
    if (!q || q.status !== CrmQuotationStatus.DRAFT) {
      throw new BadRequestException('Items can only be edited on draft quotations.');
    }
    const qty = dto.quantity ?? Number(existing.quantity);
    const unitPrice = dto.unitPrice ?? Number(existing.unitPrice);
    const discount = dto.discount ?? Number(existing.discount);
    const taxRate = dto.taxRate ?? Number(existing.taxRate);
    const row = await this.items.update(itemId, {
      ...(dto.itemName !== undefined ? { itemName: dto.itemName.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
      ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
      ...(dto.taxRate !== undefined ? { taxRate: dto.taxRate } : {}),
      ...(dto.position !== undefined ? { position: dto.position } : {}),
      lineTotal: calcLineTotal(qty, unitPrice, discount, taxRate),
    });
    await this.recalculateTotals(existing.quotationId, Number(q.discount));
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_updated',
      entityType: 'crm_quotation_item',
      entityId: itemId,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async removeItem(user: AuthenticatedUser, itemId: string, meta: AuditMeta) {
    this.assertWrite(user);
    const existing = await this.items.findById(itemId);
    if (!existing) throw new NotFoundException('Item not found.');
    const q = await this.quotations.findByIdAny(existing.quotationId);
    if (!q || q.status !== CrmQuotationStatus.DRAFT) {
      throw new BadRequestException('Items can only be removed from draft quotations.');
    }
    await this.items.delete(itemId);
    await this.recalculateTotals(existing.quotationId, Number(q.discount));
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_updated',
      entityType: 'crm_quotation',
      entityId: existing.quotationId,
      metadata: { itemRemoved: itemId },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  // ─── Workflow actions ──────────────────────────────────────

  private async recordApproval(
    quotationId: string,
    action: CrmQuotationApprovalAction,
    actorId: string | null,
    actorName: string | null,
    comments?: string,
  ) {
    return this.approvals.create({
      quotationId,
      action,
      actorId,
      actorName,
      comments: comments?.trim() || null,
    });
  }

  async sendQuotation(
    user: AuthenticatedUser,
    id: string,
    dto: QuotationActionDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const q = await this.quotations.findById(id);
    if (!q) throw new NotFoundException('Quotation not found.');
    if (q.status !== CrmQuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be sent.');
    }
    const portalToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const row = await this.quotations.update(id, {
      status: CrmQuotationStatus.SENT,
      portalTokenHash: hashPortalToken(portalToken),
      portalTokenExpiresAt: expires,
    });
    await this.recordApproval(
      id,
      CrmQuotationApprovalAction.SENT,
      user.id,
      user.email,
      dto.comments,
    );
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_sent',
      entityType: 'crm_quotation',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    this.notifyQuotation(user, row, 'sent');
    return { ...row, portalToken };
  }

  async approveQuotation(
    user: AuthenticatedUser,
    id: string,
    dto: QuotationActionDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const q = await this.quotations.findByIdAny(id);
    if (!q) throw new NotFoundException('Quotation not found.');
    const row = await this.quotations.update(id, {
      status: CrmQuotationStatus.APPROVED,
      approvedById: user.id,
    });
    await this.recordApproval(
      id,
      CrmQuotationApprovalAction.APPROVED,
      user.id,
      user.email,
      dto.comments,
    );
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_approved',
      entityType: 'crm_quotation',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    this.notifyQuotation(user, row, 'approved');
    return row;
  }

  async rejectQuotation(
    user: AuthenticatedUser,
    id: string,
    dto: QuotationActionDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const q = await this.quotations.findByIdAny(id);
    if (!q) throw new NotFoundException('Quotation not found.');
    const row = await this.quotations.update(id, { status: CrmQuotationStatus.REJECTED });
    await this.recordApproval(
      id,
      CrmQuotationApprovalAction.REJECTED,
      user.id,
      user.email,
      dto.comments,
    );
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_rejected',
      entityType: 'crm_quotation',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    this.notifyQuotation(user, row, 'rejected');
    return row;
  }

  async cancelQuotation(
    user: AuthenticatedUser,
    id: string,
    dto: QuotationActionDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const q = await this.quotations.findByIdAny(id);
    if (!q) throw new NotFoundException('Quotation not found.');
    const row = await this.quotations.update(id, { status: CrmQuotationStatus.CANCELLED });
    await this.recordApproval(
      id,
      CrmQuotationApprovalAction.CANCELLED,
      user.id,
      user.email,
      dto.comments,
    );
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_cancelled',
      entityType: 'crm_quotation',
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async expireQuotation(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const q = await this.quotations.findByIdAny(id);
    if (!q) throw new NotFoundException('Quotation not found.');
    const row = await this.quotations.update(id, { status: CrmQuotationStatus.EXPIRED });
    await this.recordApproval(id, CrmQuotationApprovalAction.EXPIRED, user.id, user.email);
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_updated',
      entityType: 'crm_quotation',
      entityId: id,
      metadata: { expired: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async cloneQuotation(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const source = await this.quotations.findById(id);
    if (!source) throw new NotFoundException('Quotation not found.');
    const year = new Date().getFullYear();
    const quotationNumber = await this.quotations.nextQuotationNumber(year);
    const row = await this.quotations.create({
      quotationNumber,
      customerId: source.customerId,
      opportunityId: source.opportunityId,
      issueDate: new Date(),
      expiryDate: source.expiryDate,
      notes: source.notes,
      terms: source.terms,
      scopeOfWork: source.scopeOfWork,
      deliverables: source.deliverables,
      discount: Number(source.discount),
      status: CrmQuotationStatus.DRAFT,
      createdById: user.id,
    });
    for (const item of source.items) {
      await this.items.create({
        quotationId: row.id,
        itemName: item.itemName,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        taxRate: Number(item.taxRate),
        lineTotal: Number(item.lineTotal),
        position: item.position,
      });
    }
    await this.recalculateTotals(row.id, Number(source.discount));
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_created',
      entityType: 'crm_quotation',
      entityId: row.id,
      metadata: { clonedFrom: id },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.quotations.findById(row.id);
  }

  async createRevision(
    user: AuthenticatedUser,
    id: string,
    dto: CreateQuotationRevisionDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const source = await this.quotations.findById(id);
    if (!source) throw new NotFoundException('Quotation not found.');
    const year = new Date().getFullYear();
    const quotationNumber = await this.quotations.nextQuotationNumber(year);
    const row = await this.quotations.create({
      quotationNumber,
      customerId: source.customerId,
      opportunityId: source.opportunityId,
      issueDate: new Date(),
      expiryDate: source.expiryDate,
      notes: source.notes,
      terms: source.terms,
      scopeOfWork: source.scopeOfWork,
      deliverables: source.deliverables,
      discount: Number(source.discount),
      revisionNumber: source.revisionNumber + 1,
      parentQuotationId: source.parentQuotationId ?? source.id,
      revisionReason: dto.revisionReason.trim(),
      status: CrmQuotationStatus.DRAFT,
      createdById: user.id,
    });
    for (const item of source.items) {
      await this.items.create({
        quotationId: row.id,
        itemName: item.itemName,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        taxRate: Number(item.taxRate),
        lineTotal: Number(item.lineTotal),
        position: item.position,
      });
    }
    await this.recalculateTotals(row.id, Number(source.discount));
    await this.recordApproval(
      source.id,
      CrmQuotationApprovalAction.REVISION_CREATED,
      user.id,
      user.email,
      dto.revisionReason,
    );
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.quotation_revision_created',
      entityType: 'crm_quotation',
      entityId: row.id,
      metadata: { parentId: source.id },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.quotations.findById(row.id);
  }

  // ─── Proposals (PDF) ─────────────────────────────────────

  async generateProposal(user: AuthenticatedUser, quotationId: string, meta: AuditMeta) {
    this.assertWrite(user);
    const q = await this.quotations.findById(quotationId);
    if (!q) throw new NotFoundException('Quotation not found.');
    const tenant = await this.prisma.client.tenant.findUnique({
      where: { id: q.tenantId },
      include: { companyProfile: true, workspace: true },
    });
    const profile = tenant?.companyProfile;
    const document =
      (q.documentJson as DocumentBody | null) ??
      defaultProposalDocument(q.coverTitle ?? q.quotationNumber);
    const synced = this.syncLegacyFieldsIntoDocument(document, q);
    const pdfBuffer = await this.pdf.generate({
      quotationNumber: q.quotationNumber,
      revisionNumber: q.revisionNumber,
      issueDate: q.issueDate.toISOString().slice(0, 10),
      expiryDate: q.expiryDate?.toISOString().slice(0, 10),
      status: q.status,
      currency: q.currency ?? 'USD',
      title: q.coverTitle ?? 'Proposal',
      document: synced,
      qrPayload: q.qrCode
        ? `velon-quote:${q.quotationNumber}:${q.qrCode}`
        : `velon-quote:${q.quotationNumber}`,
      subtotal: Number(q.subtotal),
      discount: Number(q.discount),
      tax: Number(q.tax),
      total: Number(q.total),
      notes: q.notes,
      terms: q.terms,
      scopeOfWork: q.scopeOfWork,
      deliverables: q.deliverables,
      company: {
        name: tenant?.workspace?.name ?? tenant?.name ?? 'Company',
        legalName: profile?.legalName,
        email: profile?.email,
        phone: profile?.phone,
        address: profile?.address,
        website: profile?.website,
        taxId: profile?.taxId,
        logoDataUrl: profile?.logoDataUrl,
      },
      customer: {
        companyName: q.customer.companyName,
        email: q.customer.email,
        phone: q.customer.phone,
        address: q.customer.address,
      },
      items: q.items.map((i) => ({
        itemName: i.itemName,
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        taxRate: Number(i.taxRate),
        lineTotal: Number(i.lineTotal),
      })),
    });
    const max = await this.proposals.maxVersion(quotationId);
    const version = (max._max.version ?? 0) + 1;
    const doc = await this.proposals.create({
      quotationId,
      version,
      title: q.coverTitle ?? `Proposal ${q.quotationNumber}`,
      documentJson: synced,
      pdfContent: new Uint8Array(pdfBuffer),
      generatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: 'crm.proposal_generated',
      entityType: 'crm_proposal',
      entityId: doc.id,
      metadata: { quotationId, version },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return doc;
  }

  async getQuotationPdf(user: AuthenticatedUser, quotationId: string) {
    this.assertRead(user);
    const q = await this.quotations.findById(quotationId);
    if (!q) throw new NotFoundException('Quotation not found.');
    const tenant = await this.prisma.client.tenant.findUnique({
      where: { id: q.tenantId },
      include: { companyProfile: true, workspace: true },
    });
    const profile = tenant?.companyProfile;
    const document =
      (q.documentJson as DocumentBody | null) ??
      defaultQuotationDocument(q.coverTitle ?? q.quotationNumber);
    const synced = this.syncLegacyFieldsIntoDocument(document, q);
    const buffer = await this.quotationPdf.generate({
      quotationNumber: q.quotationNumber,
      revisionNumber: q.revisionNumber,
      issueDate: q.issueDate.toISOString().slice(0, 10),
      expiryDate: q.expiryDate?.toISOString().slice(0, 10),
      status: q.status,
      currency: q.currency ?? 'USD',
      document: synced,
      qrPayload: q.qrCode
        ? `velon-quote:${q.quotationNumber}:${q.qrCode}`
        : `velon-quote:${q.quotationNumber}`,
      subtotal: Number(q.subtotal),
      discount: Number(q.discount),
      tax: Number(q.tax),
      total: Number(q.total),
      signature: {
        customerName: q.signatureName,
        customerSignatureDataUrl: q.signatureDataUrl,
        authorizedBy: profile?.legalName ?? tenant?.workspace?.name ?? tenant?.name,
      },
      company: {
        name: tenant?.workspace?.name ?? tenant?.name ?? 'Company',
        legalName: profile?.legalName,
        email: profile?.email,
        phone: profile?.phone,
        address: profile?.address,
        website: profile?.website,
        taxId: profile?.taxId,
        logoDataUrl: profile?.logoDataUrl,
      },
      customer: {
        companyName: q.customer.companyName,
        email: q.customer.email,
        phone: q.customer.phone,
        address: q.customer.address,
      },
      items: q.items.map((i) => ({
        itemName: i.itemName,
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        taxRate: Number(i.taxRate),
        lineTotal: Number(i.lineTotal),
      })),
    });
    await this.quotations.update(quotationId, { downloadCount: { increment: 1 } });
    return { buffer, quotationNumber: q.quotationNumber };
  }

  private syncLegacyFieldsIntoDocument(
    document: DocumentBody,
    q: {
      coverTitle?: string | null;
      executiveSummary?: string | null;
      scopeOfWork?: string | null;
      deliverables?: string | null;
      timeline?: string | null;
      assumptions?: string | null;
      exclusions?: string | null;
      terms?: string | null;
      notes?: string | null;
    },
  ): DocumentBody {
    const map: Partial<Record<string, string | null | undefined>> = {
      COVER: q.coverTitle,
      EXECUTIVE_SUMMARY: q.executiveSummary ?? q.notes,
      SCOPE_OF_WORK: q.scopeOfWork,
      DELIVERABLES: q.deliverables,
      TIMELINE: q.timeline,
      ASSUMPTIONS: q.assumptions,
      EXCLUSIONS: q.exclusions,
      TERMS: q.terms,
    };
    return {
      ...document,
      sections: document.sections.map((s) => {
        const legacy = map[s.type];
        if (legacy && !s.body?.trim()) {
          return { ...s, body: legacy };
        }
        return s;
      }),
    };
  }

  async listProposals(user: AuthenticatedUser, quotationId: string) {
    this.assertRead(user);
    return this.proposals.findByQuotation(quotationId);
  }

  async getProposalPdf(user: AuthenticatedUser, proposalId: string) {
    this.assertRead(user);
    const doc = await this.proposals.findById(proposalId);
    if (!doc) throw new NotFoundException('Proposal not found.');
    return { buffer: Buffer.from(doc.pdfContent), version: doc.version };
  }

  // ─── Templates ───────────────────────────────────────────

  listTemplates(user: AuthenticatedUser) {
    this.assertRead(user);
    return this.templates.findMany();
  }

  async createTemplate(user: AuthenticatedUser, dto: CreateCrmProposalTemplateDto) {
    this.assertWrite(user);
    return this.templates.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      coverTitle: dto.coverTitle?.trim() || null,
      scopeTemplate: dto.scopeTemplate?.trim() || null,
      deliverablesTemplate: dto.deliverablesTemplate?.trim() || null,
      termsTemplate: dto.termsTemplate?.trim() || null,
    });
  }

  async updateTemplate(user: AuthenticatedUser, id: string, dto: UpdateCrmProposalTemplateDto) {
    this.assertWrite(user);
    const existing = await this.templates.findById(id);
    if (!existing) throw new NotFoundException('Template not found.');
    return this.templates.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.coverTitle !== undefined ? { coverTitle: dto.coverTitle?.trim() || null } : {}),
      ...(dto.scopeTemplate !== undefined
        ? { scopeTemplate: dto.scopeTemplate?.trim() || null }
        : {}),
      ...(dto.deliverablesTemplate !== undefined
        ? { deliverablesTemplate: dto.deliverablesTemplate?.trim() || null }
        : {}),
      ...(dto.termsTemplate !== undefined
        ? { termsTemplate: dto.termsTemplate?.trim() || null }
        : {}),
    });
  }

  async deleteTemplate(user: AuthenticatedUser, id: string) {
    this.assertWrite(user);
    const existing = await this.templates.findById(id);
    if (!existing) throw new NotFoundException('Template not found.');
    await this.templates.delete(id);
    return { ok: true };
  }

  getApprovalHistory(user: AuthenticatedUser, quotationId: string) {
    this.assertRead(user);
    return this.approvals.findByQuotation(quotationId);
  }

  // ─── Customer portal (token-based, no auth) ──────────────

  private async resolveByToken(token: string) {
    const hash = hashPortalToken(token);
    const q = await this.quotations.findByPortalTokenHash(hash);
    if (!q) throw new NotFoundException('Quotation link invalid or expired.');
    if (q.portalTokenExpiresAt && q.portalTokenExpiresAt < new Date()) {
      throw new BadRequestException('Quotation link has expired.');
    }
    if (q.status === CrmQuotationStatus.CANCELLED) {
      throw new BadRequestException('Quotation has been cancelled.');
    }
    return q;
  }

  async customerView(token: string) {
    const q = await this.resolveByToken(token);
    if (q.status === CrmQuotationStatus.SENT) {
      await this.prisma.client.crmQuotation.update({
        where: { id: q.id },
        data: { status: CrmQuotationStatus.VIEWED, portalViewedAt: new Date() },
      });
      await this.prisma.client.crmQuotationApprovalHistory.create({
        data: {
          quotationId: q.id,
          action: CrmQuotationApprovalAction.VIEWED,
          actorName: 'Customer',
          tenantId: q.tenantId,
        },
      });
      await this.audit.log({
        tenantId: q.tenantId,
        action: 'crm.quotation_viewed',
        entityType: 'crm_quotation',
        entityId: q.id,
      });
    }
    const profile = q.tenant.companyProfile;
    return {
      quotationNumber: q.quotationNumber,
      status: q.status === CrmQuotationStatus.SENT ? CrmQuotationStatus.VIEWED : q.status,
      issueDate: q.issueDate,
      expiryDate: q.expiryDate,
      subtotal: q.subtotal,
      discount: q.discount,
      tax: q.tax,
      total: q.total,
      notes: q.notes,
      terms: q.terms,
      scopeOfWork: q.scopeOfWork,
      deliverables: q.deliverables,
      revisionNumber: q.revisionNumber,
      customer: q.customer,
      company: {
        name: q.tenant.workspace?.name ?? q.tenant.name,
        legalName: profile?.legalName,
        email: profile?.email,
        phone: profile?.phone,
      },
      items: q.items,
    };
  }

  async customerViewPdf(token: string) {
    const q = await this.resolveByToken(token);
    const latest = await this.prisma.client.crmProposalDocument.findFirst({
      where: { quotationId: q.id, tenantId: q.tenantId },
      orderBy: { version: 'desc' },
    });
    if (latest) return Buffer.from(latest.pdfContent);
    const profile = q.tenant.companyProfile;
    return this.pdf.generate({
      quotationNumber: q.quotationNumber,
      revisionNumber: q.revisionNumber,
      issueDate: q.issueDate.toISOString().slice(0, 10),
      expiryDate: q.expiryDate?.toISOString().slice(0, 10),
      status: q.status,
      subtotal: Number(q.subtotal),
      discount: Number(q.discount),
      tax: Number(q.tax),
      total: Number(q.total),
      notes: q.notes,
      terms: q.terms,
      scopeOfWork: q.scopeOfWork,
      deliverables: q.deliverables,
      company: {
        name: q.tenant.workspace?.name ?? q.tenant.name,
        legalName: profile?.legalName,
        email: profile?.email,
        phone: profile?.phone,
        address: profile?.address,
        website: profile?.website,
        taxId: profile?.taxId,
      },
      customer: {
        companyName: q.customer.companyName,
        email: q.customer.email,
        phone: q.customer.phone,
        address: q.customer.address,
      },
      items: q.items.map((i) => ({
        itemName: i.itemName,
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount),
        taxRate: Number(i.taxRate),
        lineTotal: Number(i.lineTotal),
      })),
    });
  }

  async customerAccept(token: string, dto: CustomerViewCommentDto) {
    const q = await this.resolveByToken(token);
    const finalized: CrmQuotationStatus[] = [
      CrmQuotationStatus.APPROVED,
      CrmQuotationStatus.REJECTED,
      CrmQuotationStatus.EXPIRED,
    ];
    if (finalized.includes(q.status)) {
      throw new BadRequestException('Quotation is already finalized.');
    }
    await this.prisma.client.crmQuotation.update({
      where: { id: q.id },
      data: { status: CrmQuotationStatus.APPROVED },
    });
    await this.prisma.client.crmQuotationApprovalHistory.create({
      data: {
        quotationId: q.id,
        action: CrmQuotationApprovalAction.APPROVED,
        actorName: dto.actorName?.trim() || 'Customer',
        comments: dto.comments?.trim() || null,
        tenantId: q.tenantId,
      },
    });
    return { ok: true, status: CrmQuotationStatus.APPROVED };
  }

  async customerReject(token: string, dto: CustomerViewCommentDto) {
    const q = await this.resolveByToken(token);
    const closed: CrmQuotationStatus[] = [CrmQuotationStatus.APPROVED, CrmQuotationStatus.REJECTED];
    if (closed.includes(q.status)) {
      throw new BadRequestException('Quotation is already finalized.');
    }
    await this.prisma.client.crmQuotation.update({
      where: { id: q.id },
      data: { status: CrmQuotationStatus.REJECTED },
    });
    await this.prisma.client.crmQuotationApprovalHistory.create({
      data: {
        quotationId: q.id,
        action: CrmQuotationApprovalAction.REJECTED,
        actorName: dto.actorName?.trim() || 'Customer',
        comments: dto.comments?.trim() || null,
        tenantId: q.tenantId,
      },
    });
    return { ok: true, status: CrmQuotationStatus.REJECTED };
  }

  async customerComment(token: string, dto: CustomerViewCommentDto) {
    const q = await this.resolveByToken(token);
    await this.prisma.client.crmQuotationApprovalHistory.create({
      data: {
        quotationId: q.id,
        action: CrmQuotationApprovalAction.COMMENT,
        actorName: dto.actorName?.trim() || 'Customer',
        comments: dto.comments.trim(),
        tenantId: q.tenantId,
      },
    });
    return { ok: true };
  }
}
