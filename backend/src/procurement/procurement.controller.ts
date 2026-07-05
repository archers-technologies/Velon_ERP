import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import {
  ApproveDto,
  CreatePurchaseOrderDto,
  CreatePurchaseRequestDto,
  ReceivePurchaseOrderDto,
  RejectDto,
} from './dto/procurement.dto';
import { ProcurementService } from './procurement.service';

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}

@ApiTags('procurement')
@Controller('procurement')
@RequirePortalScope('tenant')
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@Roles(UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN, UserRole.DEPARTMENT_ADMIN, UserRole.USER)
@ApiBearerAuth()
export class ProcurementController {
  constructor(private readonly procurement: ProcurementService) {}

  @Get('requests')
  @RequirePermission('procurement:read', 'procurement:*')
  listRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.procurement.listRequests(user);
  }

  @Get('requests/:id')
  @RequirePermission('procurement:read', 'procurement:*')
  getRequest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.procurement.getRequest(user, id);
  }

  @Post('requests')
  @RequirePermission('procurement:write', 'procurement:*')
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseRequestDto,
    @Req() req: Request,
  ) {
    return this.procurement.createRequest(user, dto, reqMeta(req));
  }

  @Post('requests/:id/submit')
  @RequirePermission('procurement:write', 'procurement:*')
  submitRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.procurement.submitRequest(user, id, reqMeta(req));
  }

  @Post('requests/:id/approve')
  @RequirePermission('procurement:*')
  approveRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveDto,
    @Req() req: Request,
  ) {
    return this.procurement.approveRequest(user, id, dto, reqMeta(req));
  }

  @Post('requests/:id/reject')
  @RequirePermission('procurement:*')
  rejectRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectDto,
  ) {
    return this.procurement.rejectRequest(user, id, dto);
  }

  @Get('orders')
  @RequirePermission('procurement:read', 'procurement:*')
  listOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.procurement.listOrders(user);
  }

  @Get('orders/:id')
  @RequirePermission('procurement:read', 'procurement:*')
  getOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.procurement.getOrder(user, id);
  }

  @Post('orders')
  @RequirePermission('procurement:write', 'procurement:*')
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseOrderDto,
    @Req() req: Request,
  ) {
    return this.procurement.createOrder(user, dto, reqMeta(req));
  }

  @Post('orders/:id/approve')
  @RequirePermission('procurement:*')
  approveOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveDto,
    @Req() req: Request,
  ) {
    return this.procurement.approveOrder(user, id, dto, reqMeta(req));
  }

  @Post('orders/:id/send')
  @RequirePermission('procurement:write', 'procurement:*')
  sendOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.procurement.submitOrder(user, id);
  }

  @Post('orders/:id/receive')
  @RequirePermission('procurement:write', 'procurement:*')
  receiveOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @Req() req: Request,
  ) {
    return this.procurement.receiveOrder(user, id, dto, reqMeta(req));
  }
}
