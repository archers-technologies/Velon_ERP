import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CrmCustomerStatus, CrmLeadStatus, CrmOpportunityStatus } from "@velon/database";
import { canReadCrm, canWriteCrmRecords, normalizeVelonRole } from "@velon/shared";
import * as crypto from "crypto";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { DEFAULT_PIPELINE_NAME, DEFAULT_PIPELINE_STAGES } from "./crm-pipeline.defaults";
import {
  CrmLeadRepository,
  CrmOpportunityRepository,
  CrmPipelineRepository,
  CrmPipelineStageRepository,
} from "./crm-pipeline.repositories";
import { CrmCustomerRepository } from "./crm.repositories";
import type {
  AssignCrmLeadDto,
  ConvertCrmLeadDto,
  CreateCrmLeadDto,
  CreateCrmOpportunityDto,
  CreateCrmPipelineDto,
  CreateCrmStageDto,
  CrmLeadQueryDto,
  CrmOpportunityQueryDto,
  MoveCrmOpportunityStageDto,
  ReorderCrmStagesDto,
  UpdateCrmLeadDto,
  UpdateCrmOpportunityDto,
  UpdateCrmPipelineDto,
  UpdateCrmStageDto,
} from "./dto/crm-pipeline.dto";

type AuditMeta = { ip?: string; ua?: string };

@Injectable()
export class CrmPipelineService {
  constructor(
    private readonly leads: CrmLeadRepository,
    private readonly pipelines: CrmPipelineRepository,
    private readonly stages: CrmPipelineStageRepository,
    private readonly opportunities: CrmOpportunityRepository,
    private readonly customers: CrmCustomerRepository,
    private readonly audit: AuditService,
  ) {}

  private assertRead(user: AuthenticatedUser) {
    if (!canReadCrm(normalizeVelonRole(user.role))) {
      throw new ForbiddenException("CRM access denied.");
    }
  }

  private assertWrite(user: AuthenticatedUser) {
    if (!canWriteCrmRecords(normalizeVelonRole(user.role))) {
      throw new ForbiddenException("Insufficient permissions to modify CRM records.");
    }
  }

  private leadCode() {
    return `LED-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  }

  private opportunityCode() {
    return `OPP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  }

  async ensureDefaultPipeline() {
    const count = await this.pipelines.count();
    if (count > 0) return this.pipelines.findDefault();
    const pipeline = await this.pipelines.create({
      name: DEFAULT_PIPELINE_NAME,
      description: "Default sales pipeline",
      isDefault: true,
    });
    for (const stage of DEFAULT_PIPELINE_STAGES) {
      await this.stages.create({
        pipelineId: pipeline.id,
        name: stage.name,
        position: stage.position,
        probability: stage.probability,
      });
    }
    await this.audit.log({
      tenantId: pipeline.tenantId,
      action: "crm.pipeline_created",
      entityType: "crm_pipeline",
      entityId: pipeline.id,
      metadata: { default: true },
    });
    return this.pipelines.findById(pipeline.id);
  }

  // ─── Dashboard ─────────────────────────────────────────────

  async getDashboardMetrics(user: AuthenticatedUser) {
    this.assertRead(user);
    await this.ensureDefaultPipeline();

    const [
      totalLeads,
      qualifiedLeads,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      pipelineValue,
      openRows,
    ] = await Promise.all([
      this.leads.count({ archivedAt: null }),
      this.leads.count({ status: CrmLeadStatus.QUALIFIED, archivedAt: null }),
      this.opportunities.count({ status: CrmOpportunityStatus.OPEN, archivedAt: null }),
      this.opportunities.count({ status: CrmOpportunityStatus.WON, archivedAt: null }),
      this.opportunities.count({ status: CrmOpportunityStatus.LOST, archivedAt: null }),
      this.opportunities.aggregateOpenValue(),
      this.opportunities.expectedRevenue(),
    ]);

    const expectedRevenue = openRows.reduce(
      (sum, row) => sum + Number(row.value) * (row.probability / 100),
      0,
    );

    return {
      totalLeads,
      qualifiedLeads,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      pipelineValue: Number(pipelineValue._sum.value ?? 0),
      expectedRevenue: Math.round(expectedRevenue * 100) / 100,
    };
  }

  // ─── Leads ───────────────────────────────────────────────

  listLeads(user: AuthenticatedUser, query: CrmLeadQueryDto) {
    this.assertRead(user);
    return this.leads.findMany({
      search: query.search,
      status: query.status,
      source: query.source,
      assignedToId: query.assignedToId,
      includeArchived: query.includeArchived === "true",
    });
  }

  async getLead(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.leads.findById(id, true);
    if (!row) throw new NotFoundException("Lead not found.");
    return row;
  }

  async createLead(user: AuthenticatedUser, dto: CreateCrmLeadDto, meta: AuditMeta) {
    this.assertWrite(user);
    const row = await this.leads.create({
      leadCode: this.leadCode(),
      companyName: dto.companyName.trim(),
      contactName: dto.contactName?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      phone: dto.phone?.trim() || null,
      source: dto.source ?? "MANUAL",
      industry: dto.industry?.trim() || null,
      status: dto.status ?? CrmLeadStatus.NEW,
      assignedToId: dto.assignedToId || user.id,
      notes: dto.notes?.trim() || null,
      createdById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.lead_created",
      entityType: "crm_lead",
      entityId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async updateLead(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCrmLeadDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.leads.findByIdAny(id);
    if (!existing) throw new NotFoundException("Lead not found.");
    if (existing.status === CrmLeadStatus.CONVERTED) {
      throw new BadRequestException("Converted leads cannot be edited.");
    }
    const row = await this.leads.update(id, {
      ...(dto.companyName !== undefined ? { companyName: dto.companyName.trim() } : {}),
      ...(dto.contactName !== undefined ? { contactName: dto.contactName?.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.industry !== undefined ? { industry: dto.industry?.trim() || null } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.lead_updated",
      entityType: "crm_lead",
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async assignLead(
    user: AuthenticatedUser,
    id: string,
    dto: AssignCrmLeadDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.leads.findByIdAny(id);
    if (!existing) throw new NotFoundException("Lead not found.");
    const row = await this.leads.update(id, { assignedToId: dto.assignedToId });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.lead_assigned",
      entityType: "crm_lead",
      entityId: id,
      metadata: { assignedToId: dto.assignedToId },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async archiveLead(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const existing = await this.leads.findByIdAny(id);
    if (!existing) throw new NotFoundException("Lead not found.");
    await this.leads.update(id, { archivedAt: new Date() });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.lead_updated",
      entityType: "crm_lead",
      entityId: id,
      metadata: { archived: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  async convertLead(
    user: AuthenticatedUser,
    id: string,
    dto: ConvertCrmLeadDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const lead = await this.leads.findByIdAny(id);
    if (!lead) throw new NotFoundException("Lead not found.");
    if (lead.status === CrmLeadStatus.CONVERTED) {
      throw new BadRequestException("Lead is already converted.");
    }
    if (lead.status === CrmLeadStatus.DISQUALIFIED) {
      throw new BadRequestException("Disqualified leads cannot be converted.");
    }

    const pipeline = dto.pipelineId
      ? await this.pipelines.findById(dto.pipelineId)
      : await this.ensureDefaultPipeline();
    if (!pipeline) throw new BadRequestException("Pipeline not found.");

    const qualifiedStage =
      pipeline.stages.find((s) => s.name === "Qualified") ??
      pipeline.stages.find((s) => s.name === "New") ??
      pipeline.stages[0];
    if (!qualifiedStage) throw new BadRequestException("Pipeline has no stages.");

    const customer = await this.customers.create({
      customerCode: `CUS-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      companyName: lead.companyName,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      status: CrmCustomerStatus.PROSPECT,
      createdById: user.id,
      updatedById: user.id,
    });

    const opportunity = await this.opportunities.create({
      opportunityCode: this.opportunityCode(),
      title: dto.title?.trim() || `${lead.companyName} opportunity`,
      customerId: customer.id,
      leadId: lead.id,
      pipelineId: pipeline.id,
      stageId: qualifiedStage.id,
      value: dto.value ?? 0,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
      probability: qualifiedStage.probability,
      ownerId: lead.assignedToId ?? user.id,
      description: lead.notes,
      status: CrmOpportunityStatus.OPEN,
      createdById: user.id,
    });

    await this.leads.update(id, {
      status: CrmLeadStatus.CONVERTED,
      convertedCustomerId: customer.id,
      convertedOpportunityId: opportunity.id,
    });

    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.lead_converted",
      entityType: "crm_lead",
      entityId: id,
      metadata: { customerId: customer.id, opportunityId: opportunity.id },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.opportunity_created",
      entityType: "crm_opportunity",
      entityId: opportunity.id,
      metadata: { fromLeadId: id },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return { customer, opportunity };
  }

  // ─── Pipelines ───────────────────────────────────────────

  async listPipelines(user: AuthenticatedUser) {
    this.assertRead(user);
    await this.ensureDefaultPipeline();
    return this.pipelines.findMany();
  }

  async getPipeline(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.pipelines.findById(id);
    if (!row) throw new NotFoundException("Pipeline not found.");
    return row;
  }

  async createPipeline(user: AuthenticatedUser, dto: CreateCrmPipelineDto, meta: AuditMeta) {
    this.assertWrite(user);
    if (dto.isDefault) await this.pipelines.clearDefaultFlag();
    const pipeline = await this.pipelines.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      isDefault: dto.isDefault ?? false,
    });
    if (pipeline.stages.length === 0) {
      for (const stage of DEFAULT_PIPELINE_STAGES) {
        await this.stages.create({
          pipelineId: pipeline.id,
          name: stage.name,
          position: stage.position,
          probability: stage.probability,
        });
      }
    }
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.pipeline_created",
      entityType: "crm_pipeline",
      entityId: pipeline.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.pipelines.findById(pipeline.id);
  }

  async updatePipeline(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCrmPipelineDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.pipelines.findById(id);
    if (!existing) throw new NotFoundException("Pipeline not found.");
    const row = await this.pipelines.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.pipeline_updated",
      entityType: "crm_pipeline",
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async setDefaultPipeline(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const existing = await this.pipelines.findById(id);
    if (!existing) throw new NotFoundException("Pipeline not found.");
    await this.pipelines.clearDefaultFlag();
    const row = await this.pipelines.update(id, { isDefault: true });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.pipeline_updated",
      entityType: "crm_pipeline",
      entityId: id,
      metadata: { isDefault: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async deletePipeline(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const existing = await this.pipelines.findById(id);
    if (!existing) throw new NotFoundException("Pipeline not found.");
    if (existing.isDefault) {
      throw new BadRequestException("Cannot delete the default pipeline.");
    }
    const oppCount = await this.opportunities.count({ pipelineId: id });
    if (oppCount > 0) {
      throw new BadRequestException("Pipeline has opportunities. Archive or move them first.");
    }
    await this.pipelines.delete(id);
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.pipeline_updated",
      entityType: "crm_pipeline",
      entityId: id,
      metadata: { deleted: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  // ─── Stages ──────────────────────────────────────────────

  listStages(user: AuthenticatedUser, pipelineId: string) {
    this.assertRead(user);
    return this.stages.findByPipeline(pipelineId);
  }

  async createStage(user: AuthenticatedUser, dto: CreateCrmStageDto, meta: AuditMeta) {
    this.assertWrite(user);
    const pipeline = await this.pipelines.findById(dto.pipelineId);
    if (!pipeline) throw new NotFoundException("Pipeline not found.");
    const max = await this.stages.maxPosition(dto.pipelineId);
    const position = dto.position ?? (max._max.position ?? -1) + 1;
    const row = await this.stages.create({
      pipelineId: dto.pipelineId,
      name: dto.name.trim(),
      position,
      probability: dto.probability ?? 0,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.pipeline_updated",
      entityType: "crm_pipeline_stage",
      entityId: row.id,
      metadata: { pipelineId: dto.pipelineId, created: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async updateStage(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCrmStageDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.stages.findById(id);
    if (!existing) throw new NotFoundException("Stage not found.");
    const row = await this.stages.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.probability !== undefined ? { probability: dto.probability } : {}),
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.pipeline_updated",
      entityType: "crm_pipeline_stage",
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async reorderStages(user: AuthenticatedUser, dto: ReorderCrmStagesDto, meta: AuditMeta) {
    this.assertWrite(user);
    const pipeline = await this.pipelines.findById(dto.pipelineId);
    if (!pipeline) throw new NotFoundException("Pipeline not found.");
    const stageIds = new Set(pipeline.stages.map((s) => s.id));
    if (dto.stageIds.length !== stageIds.size || !dto.stageIds.every((id) => stageIds.has(id))) {
      throw new BadRequestException("Invalid stage order.");
    }
    await Promise.all(
      dto.stageIds.map((stageId, position) =>
        this.stages.update(stageId, { position }),
      ),
    );
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.pipeline_updated",
      entityType: "crm_pipeline",
      entityId: dto.pipelineId,
      metadata: { reordered: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return this.stages.findByPipeline(dto.pipelineId);
  }

  async deleteStage(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const existing = await this.stages.findById(id);
    if (!existing) throw new NotFoundException("Stage not found.");
    if (["Won", "Lost"].includes(existing.name)) {
      throw new BadRequestException("Cannot delete Won/Lost stages.");
    }
    const count = await this.opportunities.count({ stageId: id });
    if (count > 0) throw new BadRequestException("Stage has opportunities.");
    await this.stages.delete(id);
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.pipeline_updated",
      entityType: "crm_pipeline_stage",
      entityId: id,
      metadata: { deleted: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }

  // ─── Opportunities ───────────────────────────────────────

  listOpportunities(user: AuthenticatedUser, query: CrmOpportunityQueryDto) {
    this.assertRead(user);
    return this.opportunities.findMany({
      search: query.search,
      pipelineId: query.pipelineId,
      stageId: query.stageId,
      status: query.status,
      ownerId: query.ownerId,
      includeArchived: query.includeArchived === "true",
    });
  }

  async getOpportunity(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.opportunities.findById(id);
    if (!row) throw new NotFoundException("Opportunity not found.");
    return row;
  }

  async createOpportunity(
    user: AuthenticatedUser,
    dto: CreateCrmOpportunityDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const pipeline = await this.pipelines.findById(dto.pipelineId);
    if (!pipeline) throw new BadRequestException("Pipeline not found.");
    const stage = pipeline.stages.find((s) => s.id === dto.stageId);
    if (!stage) throw new BadRequestException("Stage not found in pipeline.");
    const row = await this.opportunities.create({
      opportunityCode: this.opportunityCode(),
      title: dto.title.trim(),
      customerId: dto.customerId || null,
      leadId: dto.leadId || null,
      pipelineId: dto.pipelineId,
      stageId: dto.stageId,
      value: dto.value ?? 0,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
      probability: dto.probability ?? stage.probability,
      ownerId: dto.ownerId || user.id,
      description: dto.description?.trim() || null,
      status: CrmOpportunityStatus.OPEN,
      createdById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.opportunity_created",
      entityType: "crm_opportunity",
      entityId: row.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async updateOpportunity(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateCrmOpportunityDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.opportunities.findByIdAny(id);
    if (!existing) throw new NotFoundException("Opportunity not found.");
    const row = await this.opportunities.update(id, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.customerId !== undefined ? { customerId: dto.customerId || null } : {}),
      ...(dto.value !== undefined ? { value: dto.value } : {}),
      ...(dto.expectedCloseDate !== undefined
        ? { expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null }
        : {}),
      ...(dto.probability !== undefined ? { probability: dto.probability } : {}),
      ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.opportunity_updated",
      entityType: "crm_opportunity",
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  async moveOpportunityStage(
    user: AuthenticatedUser,
    id: string,
    dto: MoveCrmOpportunityStageDto,
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.opportunities.findByIdAny(id);
    if (!existing) throw new NotFoundException("Opportunity not found.");
    const stage = await this.stages.findById(dto.stageId);
    if (!stage || stage.pipelineId !== existing.pipelineId) {
      throw new BadRequestException("Invalid stage for this pipeline.");
    }
    const row = await this.opportunities.update(id, {
      stageId: dto.stageId,
      probability: stage.probability,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.opportunity_stage_changed",
      entityType: "crm_opportunity",
      entityId: id,
      metadata: { stageId: dto.stageId, stageName: stage.name },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  private async closeOpportunity(
    user: AuthenticatedUser,
    id: string,
    outcome: "WON" | "LOST",
    meta: AuditMeta,
  ) {
    this.assertWrite(user);
    const existing = await this.opportunities.findByIdAny(id);
    if (!existing) throw new NotFoundException("Opportunity not found.");
    const stage = await this.stages.findByName(existing.pipelineId, outcome === "WON" ? "Won" : "Lost");
    if (!stage) throw new BadRequestException("Pipeline missing Won/Lost stage.");
    const row = await this.opportunities.update(id, {
      status: outcome === "WON" ? CrmOpportunityStatus.WON : CrmOpportunityStatus.LOST,
      stageId: stage.id,
      probability: stage.probability,
      updatedById: user.id,
    });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: outcome === "WON" ? "crm.opportunity_won" : "crm.opportunity_lost",
      entityType: "crm_opportunity",
      entityId: id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return row;
  }

  closeWon(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    return this.closeOpportunity(user, id, "WON", meta);
  }

  closeLost(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    return this.closeOpportunity(user, id, "LOST", meta);
  }

  async archiveOpportunity(user: AuthenticatedUser, id: string, meta: AuditMeta) {
    this.assertWrite(user);
    const existing = await this.opportunities.findByIdAny(id);
    if (!existing) throw new NotFoundException("Opportunity not found.");
    await this.opportunities.update(id, { archivedAt: new Date(), updatedById: user.id });
    await this.audit.log({
      actorId: user.id,
      tenantId: user.tenantId,
      action: "crm.opportunity_updated",
      entityType: "crm_opportunity",
      entityId: id,
      metadata: { archived: true },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { ok: true };
  }
}
