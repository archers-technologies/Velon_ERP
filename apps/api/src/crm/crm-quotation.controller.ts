import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@velon/database";
import type { Request, Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePortalScope } from "../auth/decorators/portal-scope.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PortalScopeGuard } from "../auth/guards/portal-scope.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TenantScopeGuard } from "../auth/guards/tenant-scope.guard";
import { CrmQuotationService } from "./crm-quotation.service";
import {
  BulkAddCrmQuotationItemsDto,
  CreateCrmProposalTemplateDto,
  CreateCrmQuotationDto,
  CreateCrmQuotationItemDto,
  CreateQuotationRevisionDto,
  CrmQuotationQueryDto,
  QuotationActionDto,
  UpdateCrmProposalTemplateDto,
  UpdateCrmQuotationDto,
  UpdateCrmQuotationItemDto,
} from "./dto/crm-quotation.dto";

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    ua: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
  };
}

@ApiTags("crm")
@Controller("crm")
@RequirePortalScope("tenant")
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@RequirePermission("crm:read", "crm:*")
@Roles(
  UserRole.TENANT_OWNER,
  UserRole.TENANT_ADMIN,
  UserRole.DEPARTMENT_ADMIN,
  UserRole.USER,
)
@ApiBearerAuth()
export class CrmQuotationController {
  constructor(private readonly quotations: CrmQuotationService) {}

  @Get("quotation-metrics")
  getMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.quotations.getQuotationMetrics(user);
  }

  @Get("quotations")
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: CrmQuotationQueryDto) {
    return this.quotations.listQuotations(user, query);
  }

  @Get("quotations/:id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.quotations.getQuotation(user, id);
  }

  @Post("quotations")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmQuotationDto,
    @Req() req: Request,
  ) {
    return this.quotations.createQuotation(user, dto, reqMeta(req));
  }

  @Post("quotations/from-opportunity/:opportunityId")
  createFromOpportunity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("opportunityId") opportunityId: string,
    @Req() req: Request,
  ) {
    return this.quotations.createFromOpportunity(user, opportunityId, reqMeta(req));
  }

  @Patch("quotations/:id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCrmQuotationDto,
    @Req() req: Request,
  ) {
    return this.quotations.updateQuotation(user, id, dto, reqMeta(req));
  }

  @Post("quotations/:id/send")
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: QuotationActionDto,
    @Req() req: Request,
  ) {
    return this.quotations.sendQuotation(user, id, dto, reqMeta(req));
  }

  @Post("quotations/:id/approve")
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: QuotationActionDto,
    @Req() req: Request,
  ) {
    return this.quotations.approveQuotation(user, id, dto, reqMeta(req));
  }

  @Post("quotations/:id/reject")
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: QuotationActionDto,
    @Req() req: Request,
  ) {
    return this.quotations.rejectQuotation(user, id, dto, reqMeta(req));
  }

  @Post("quotations/:id/cancel")
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: QuotationActionDto,
    @Req() req: Request,
  ) {
    return this.quotations.cancelQuotation(user, id, dto, reqMeta(req));
  }

  @Post("quotations/:id/expire")
  expire(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.quotations.expireQuotation(user, id, reqMeta(req));
  }

  @Post("quotations/:id/clone")
  clone(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.quotations.cloneQuotation(user, id, reqMeta(req));
  }

  @Post("quotations/:id/revision")
  revision(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateQuotationRevisionDto,
    @Req() req: Request,
  ) {
    return this.quotations.createRevision(user, id, dto, reqMeta(req));
  }

  @Get("quotations/:id/approval-history")
  approvalHistory(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.quotations.getApprovalHistory(user, id);
  }

  // ─── Items ───────────────────────────────────────────────

  @Post("quotation-items")
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Query("quotationId") quotationId: string,
    @Body() dto: CreateCrmQuotationItemDto,
    @Req() req: Request,
  ) {
    return this.quotations.addItem(user, quotationId, dto, reqMeta(req));
  }

  @Post("quotation-items/bulk")
  bulkAdd(
    @CurrentUser() user: AuthenticatedUser,
    @Query("quotationId") quotationId: string,
    @Body() dto: BulkAddCrmQuotationItemsDto,
    @Req() req: Request,
  ) {
    return this.quotations.bulkAddItems(user, quotationId, dto, reqMeta(req));
  }

  @Patch("quotation-items/:id")
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCrmQuotationItemDto,
    @Req() req: Request,
  ) {
    return this.quotations.updateItem(user, id, dto, reqMeta(req));
  }

  @Delete("quotation-items/:id")
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.quotations.removeItem(user, id, reqMeta(req));
  }

  // ─── Proposals ───────────────────────────────────────────

  @Post("proposals/generate/:quotationId")
  generateProposal(
    @CurrentUser() user: AuthenticatedUser,
    @Param("quotationId") quotationId: string,
    @Req() req: Request,
  ) {
    return this.quotations.generateProposal(user, quotationId, reqMeta(req));
  }

  @Get("proposals")
  listProposals(
    @CurrentUser() user: AuthenticatedUser,
    @Query("quotationId") quotationId: string,
  ) {
    return this.quotations.listProposals(user, quotationId);
  }

  @Get("proposals/:id/pdf")
  async downloadProposal(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const { buffer, version } = await this.quotations.getProposalPdf(user, id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="proposal-v${version}.pdf"`);
    res.send(buffer);
  }

  // ─── Templates ───────────────────────────────────────────

  @Get("templates")
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.quotations.listTemplates(user);
  }

  @Post("templates")
  createTemplate(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCrmProposalTemplateDto) {
    return this.quotations.createTemplate(user, dto);
  }

  @Patch("templates/:id")
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCrmProposalTemplateDto,
  ) {
    return this.quotations.updateTemplate(user, id, dto);
  }

  @Delete("templates/:id")
  deleteTemplate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.quotations.deleteTemplate(user, id);
  }
}
