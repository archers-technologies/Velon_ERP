import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePortalScope } from '../auth/decorators/portal-scope.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortalScopeGuard } from '../auth/guards/portal-scope.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CreateTenantResourceDto } from './dto/tenant-resource.dto';
import { TenantResourcesService } from './tenant-resources.service';

@ApiTags('tenant-resources')
@Controller('tenant-resources')
@RequirePortalScope('tenant')
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard)
@ApiBearerAuth()
export class TenantResourcesController {
  constructor(
    private readonly resources: TenantResourcesService,
    private readonly audit: AuditService,
  ) {}

  @Post('customers')
  createCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantResourceDto,
    @Req() req: Request,
  ) {
    this.warnIfSpoofedTenantId(req, user, dto);
    return this.resources.createCustomer(user, dto.name);
  }

  @Get('customers')
  listCustomers(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    this.warnIfSpoofedTenantId(req, user, req.query);
    return this.resources.listCustomers(user);
  }

  @Get('customers/:id')
  getCustomer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resources.getCustomer(user, id);
  }

  @Post('projects')
  createProject(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantResourceDto,
    @Req() req: Request,
  ) {
    this.warnIfSpoofedTenantId(req, user, dto);
    return this.resources.createProject(user, dto.name);
  }

  @Get('projects/:id')
  getProject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resources.getProject(user, id);
  }

  @Post('assets')
  createAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantResourceDto & { tag?: string },
    @Req() req: Request,
  ) {
    this.warnIfSpoofedTenantId(req, user, dto);
    return this.resources.createAsset(user, dto.name, dto.tag);
  }

  @Get('assets')
  listAssets(@CurrentUser() user: AuthenticatedUser) {
    return this.resources.listAssets(user);
  }

  @Get('assets/:id')
  getAsset(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resources.getAsset(user, id);
  }

  @Post('files')
  createFile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantResourceDto & { mimeType?: string; sizeBytes?: number },
    @Req() req: Request,
  ) {
    this.warnIfSpoofedTenantId(req, user, dto);
    return this.resources.createFile(user, dto.name, dto.mimeType, dto.sizeBytes);
  }

  @Get('files')
  listFiles(@CurrentUser() user: AuthenticatedUser) {
    return this.resources.listFiles(user);
  }

  @Get('files/:id')
  getFile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resources.getFile(user, id);
  }

  @Post('notifications')
  createNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { title: string; body: string; tenantId?: string },
    @Req() req: Request,
  ) {
    this.warnIfSpoofedTenantId(req, user, dto);
    return this.resources.createNotification(user, dto.title, dto.body);
  }

  @Get('notifications')
  listNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.resources.listNotifications(user);
  }

  @Get('notifications/:id')
  getNotification(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resources.getNotification(user, id);
  }

  @Get('audit-logs')
  listAuditLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.resources.listAuditLogs(user);
  }

  @Get('audit-logs/:id')
  getAuditLog(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resources.getAuditLog(user, id);
  }

  private warnIfSpoofedTenantId(
    req: Request,
    user: AuthenticatedUser,
    payload: object & { tenantId?: string },
  ) {
    const supplied = 'tenantId' in payload ? payload.tenantId : undefined;
    if (typeof supplied === 'string' && supplied && supplied !== user.tenantId) {
      void this.audit.logSecurityViolation({
        actorId: user.id,
        tenantId: user.tenantId,
        action: 'security.tenant_id_spoof_attempt',
        entityType: 'tenant',
        entityId: user.tenantId,
        metadata: { suppliedTenantId: supplied, path: req.path },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
  }
}
