import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
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
  CreateSupplierContactDto,
  CreateSupplierDto,
  CreateSupplierThreadDto,
  UpdateSupplierContactDto,
  UpdateSupplierDto,
} from './dto/suppliers.dto';
import { SuppliersService } from './suppliers.service';

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}

@ApiTags('suppliers')
@Controller('suppliers')
@RequirePortalScope('tenant')
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@Roles(UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN, UserRole.DEPARTMENT_ADMIN, UserRole.USER)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermission('procurement:read', 'procurement:*')
  list(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.suppliers.listSuppliers(user, search);
  }

  @Get(':id')
  @RequirePermission('procurement:read', 'procurement:*')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.suppliers.getSupplier(user, id);
  }

  @Post()
  @RequirePermission('procurement:write', 'procurement:*')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierDto,
    @Req() req: Request,
  ) {
    return this.suppliers.createSupplier(user, dto, reqMeta(req));
  }

  @Patch(':id')
  @RequirePermission('procurement:write', 'procurement:*')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @Req() req: Request,
  ) {
    return this.suppliers.updateSupplier(user, id, dto, reqMeta(req));
  }

  @Get(':id/contacts')
  @RequirePermission('procurement:read', 'procurement:*')
  listContacts(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.suppliers.listContacts(user, id);
  }

  @Post(':id/contacts')
  @RequirePermission('procurement:write', 'procurement:*')
  createContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateSupplierContactDto,
  ) {
    return this.suppliers.createContact(user, id, dto);
  }

  @Patch('contacts/:contactId')
  @RequirePermission('procurement:write', 'procurement:*')
  updateContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateSupplierContactDto,
  ) {
    return this.suppliers.updateContact(user, contactId, dto);
  }

  @Get(':id/threads')
  @RequirePermission('procurement:read', 'procurement:*')
  listThreads(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.suppliers.listThreads(user, id);
  }

  @Post(':id/threads')
  @RequirePermission('procurement:write', 'procurement:*')
  createThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateSupplierThreadDto,
    @Req() req: Request,
  ) {
    return this.suppliers.createThread(user, id, dto, reqMeta(req));
  }
}
