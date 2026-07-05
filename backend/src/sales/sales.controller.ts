import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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
import { SalesService } from './sales.service';

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}

@ApiTags('sales')
@Controller('sales')
@RequirePortalScope('tenant')
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@RequirePermission('sales:read', 'sales:*')
@Roles(UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN, UserRole.DEPARTMENT_ADMIN, UserRole.USER)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('orders')
  listOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.sales.listOrders(user);
  }

  @Get('orders/:id')
  getOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sales.getOrder(user, id);
  }

  @Post('orders/from-quotation/:quotationId')
  @RequirePermission('sales:write', 'sales:*')
  createFromQuotation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('quotationId') quotationId: string,
    @Req() req: Request,
  ) {
    return this.sales.createFromQuotation(user, quotationId, reqMeta(req));
  }
}
