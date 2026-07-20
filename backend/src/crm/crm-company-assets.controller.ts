import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
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
import { CrmCompanyAssetsService } from './crm-company-assets.service';
import {
  CompanyLibraryAssetQueryDto,
  CreateCompanyLibraryAssetDto,
  CreateCrmContentBlockDto,
  CrmContentBlockQueryDto,
} from './dto/crm-company-assets.dto';

@ApiTags('crm')
@Controller('crm')
@RequirePortalScope('tenant')
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@RequirePermission('crm:read', 'crm:*')
@Roles(UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN, UserRole.DEPARTMENT_ADMIN, UserRole.USER)
@ApiBearerAuth()
export class CrmCompanyAssetsController {
  constructor(private readonly companyAssets: CrmCompanyAssetsService) {}

  @Get('company-assets')
  listAssets(@CurrentUser() user: AuthenticatedUser, @Query() query: CompanyLibraryAssetQueryDto) {
    return this.companyAssets.listAssets(user, query);
  }

  @Post('company-assets')
  @RequirePermission('crm:write', 'crm:*')
  createAsset(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCompanyLibraryAssetDto) {
    return this.companyAssets.createAsset(user, dto);
  }

  @Delete('company-assets/:id')
  @RequirePermission('crm:write', 'crm:*')
  deleteAsset(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.companyAssets.deleteAsset(user, id);
  }

  @Get('company-assets/:id/download')
  async downloadAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } = await this.companyAssets.downloadAsset(user, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Get('content-blocks')
  listContentBlocks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CrmContentBlockQueryDto,
  ) {
    return this.companyAssets.listContentBlocks(user, query);
  }

  @Post('content-blocks')
  @RequirePermission('crm:write', 'crm:*')
  createContentBlock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmContentBlockDto,
  ) {
    return this.companyAssets.createContentBlock(user, dto);
  }

  @Delete('content-blocks/:id')
  @RequirePermission('crm:write', 'crm:*')
  deleteContentBlock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.companyAssets.deleteContentBlock(user, id);
  }
}
