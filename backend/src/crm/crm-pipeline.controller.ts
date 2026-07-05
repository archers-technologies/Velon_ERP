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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@velon/database';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePortalScope } from '../auth/decorators/portal-scope.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { PortalScopeGuard } from '../auth/guards/portal-scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CrmPipelineService } from './crm-pipeline.service';
import {
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
} from './dto/crm-pipeline.dto';

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}

@ApiTags('crm')
@Controller('crm')
@RequirePortalScope('tenant')
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@RequirePermission('crm:read', 'crm:*')
@Roles(UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN, UserRole.DEPARTMENT_ADMIN, UserRole.USER)
@ApiBearerAuth()
export class CrmPipelineController {
  constructor(private readonly pipeline: CrmPipelineService) {}

  @Get('dashboard-metrics')
  getDashboardMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.pipeline.getDashboardMetrics(user);
  }

  // ─── Leads ───────────────────────────────────────────────

  @Get('leads')
  listLeads(@CurrentUser() user: AuthenticatedUser, @Query() query: CrmLeadQueryDto) {
    return this.pipeline.listLeads(user, query);
  }

  @Get('leads/:id')
  getLead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pipeline.getLead(user, id);
  }

  @Post('leads')
  createLead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmLeadDto,
    @Req() req: Request,
  ) {
    return this.pipeline.createLead(user, dto, reqMeta(req));
  }

  @Patch('leads/:id')
  updateLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmLeadDto,
    @Req() req: Request,
  ) {
    return this.pipeline.updateLead(user, id, dto, reqMeta(req));
  }

  @Post('leads/:id/assign')
  assignLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignCrmLeadDto,
    @Req() req: Request,
  ) {
    return this.pipeline.assignLead(user, id, dto, reqMeta(req));
  }

  @Post('leads/:id/convert')
  convertLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConvertCrmLeadDto,
    @Req() req: Request,
  ) {
    return this.pipeline.convertLead(user, id, dto, reqMeta(req));
  }

  @Post('leads/:id/archive')
  archiveLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.pipeline.archiveLead(user, id, reqMeta(req));
  }

  // ─── Pipelines ───────────────────────────────────────────

  @Get('pipelines')
  listPipelines(@CurrentUser() user: AuthenticatedUser) {
    return this.pipeline.listPipelines(user);
  }

  @Get('pipelines/:id')
  getPipeline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pipeline.getPipeline(user, id);
  }

  @Post('pipelines')
  createPipeline(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmPipelineDto,
    @Req() req: Request,
  ) {
    return this.pipeline.createPipeline(user, dto, reqMeta(req));
  }

  @Patch('pipelines/:id')
  updatePipeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmPipelineDto,
    @Req() req: Request,
  ) {
    return this.pipeline.updatePipeline(user, id, dto, reqMeta(req));
  }

  @Post('pipelines/:id/default')
  setDefaultPipeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.pipeline.setDefaultPipeline(user, id, reqMeta(req));
  }

  @Delete('pipelines/:id')
  deletePipeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.pipeline.deletePipeline(user, id, reqMeta(req));
  }

  // ─── Stages ──────────────────────────────────────────────

  @Get('stages')
  listStages(@CurrentUser() user: AuthenticatedUser, @Query('pipelineId') pipelineId: string) {
    return this.pipeline.listStages(user, pipelineId);
  }

  @Post('stages')
  createStage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmStageDto,
    @Req() req: Request,
  ) {
    return this.pipeline.createStage(user, dto, reqMeta(req));
  }

  @Patch('stages/:id')
  updateStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmStageDto,
    @Req() req: Request,
  ) {
    return this.pipeline.updateStage(user, id, dto, reqMeta(req));
  }

  @Post('stages/reorder')
  reorderStages(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderCrmStagesDto,
    @Req() req: Request,
  ) {
    return this.pipeline.reorderStages(user, dto, reqMeta(req));
  }

  @Delete('stages/:id')
  deleteStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.pipeline.deleteStage(user, id, reqMeta(req));
  }

  // ─── Opportunities ───────────────────────────────────────

  @Get('opportunities')
  listOpportunities(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CrmOpportunityQueryDto,
  ) {
    return this.pipeline.listOpportunities(user, query);
  }

  @Get('opportunities/:id')
  getOpportunity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pipeline.getOpportunity(user, id);
  }

  @Post('opportunities')
  createOpportunity(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmOpportunityDto,
    @Req() req: Request,
  ) {
    return this.pipeline.createOpportunity(user, dto, reqMeta(req));
  }

  @Patch('opportunities/:id')
  updateOpportunity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmOpportunityDto,
    @Req() req: Request,
  ) {
    return this.pipeline.updateOpportunity(user, id, dto, reqMeta(req));
  }

  @Post('opportunities/:id/move-stage')
  moveOpportunityStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveCrmOpportunityStageDto,
    @Req() req: Request,
  ) {
    return this.pipeline.moveOpportunityStage(user, id, dto, reqMeta(req));
  }

  @Post('opportunities/:id/won')
  closeWon(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() req: Request) {
    return this.pipeline.closeWon(user, id, reqMeta(req));
  }

  @Post('opportunities/:id/lost')
  closeLost(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() req: Request) {
    return this.pipeline.closeLost(user, id, reqMeta(req));
  }

  @Post('opportunities/:id/archive')
  archiveOpportunity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.pipeline.archiveOpportunity(user, id, reqMeta(req));
  }
}
