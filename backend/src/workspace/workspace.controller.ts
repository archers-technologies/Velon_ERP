import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePortalScope } from '../auth/decorators/portal-scope.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortalScopeGuard } from '../auth/guards/portal-scope.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { CommitPosSaleDto } from './dto/pos-sale.dto';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { WorkspaceContextService } from './workspace-context.service';
import { WorkspaceDataService } from './workspace-data.service';

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    ua: req.headers['user-agent'],
  };
}

@ApiTags('workspace')
@Controller('workspace')
@RequirePortalScope('tenant')
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard)
@ApiBearerAuth()
export class WorkspaceController {
  constructor(
    private readonly workspaceContext: WorkspaceContextService,
    private readonly workspaceData: WorkspaceDataService,
  ) {}

  @Get('context')
  getContext(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceContext.resolve(user);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.dashboard(user);
  }

  @Get('nav-badges')
  navBadges(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.navBadges(user);
  }

  @Get('alerts')
  alerts(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.alerts(user);
  }

  @Post('notifications/:id/read')
  markNotificationRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workspaceData.markNotificationRead(user, id);
  }

  @Post('notifications/read-all')
  markAllNotificationsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.markAllNotificationsRead(user);
  }

  @Get('customers')
  customers(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.customers(user);
  }

  @Get('suppliers')
  suppliers(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.suppliers(user);
  }

  @Get('sales-crm')
  salesCrm(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.salesCrm(user);
  }

  @Get('accounting')
  accounting(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportsQueryDto) {
    return this.workspaceData.accounting(user, query);
  }

  @Get('reports')
  reports(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportsQueryDto) {
    return this.workspaceData.reports(user, query);
  }

  @Get('reports/export')
  async exportReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportsQueryDto,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
    @Res() res: Response,
  ) {
    const result = await this.workspaceData.exportReport(user, query, format);
    if (result.format === 'csv' && 'body' in result) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.body);
    }
    return res.json(result);
  }

  @Get('branches')
  branches(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.branches(user);
  }

  @Get('inventory')
  inventory(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.inventory(user);
  }

  @Get('pos/bootstrap')
  posBootstrap(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceData.posBootstrap(user);
  }

  @Post('pos/sales')
  commitPosSale(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CommitPosSaleDto,
    @Req() req: Request,
  ) {
    return this.workspaceData.commitPosSale(user, dto, reqMeta(req));
  }
}
