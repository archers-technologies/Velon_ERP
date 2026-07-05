import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@velon/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePortalScope } from '../auth/decorators/portal-scope.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortalScopeGuard } from '../auth/guards/portal-scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePlatformUserDto } from './dto/platform-user.dto';
import { PlatformService } from './platform.service';

@ApiTags('platform')
@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('sync')
  sync() {
    return this.platform.getSyncState();
  }

  @Get('overview')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiBearerAuth()
  overview() {
    return this.platform.getOverview();
  }

  @Get('diagnostics')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  diagnostics() {
    return this.platform.getDiagnostics();
  }

  @Get('users')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  users() {
    return this.platform.listPlatformStaff();
  }

  @Post('users')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  createUser(@Body() dto: CreatePlatformUserDto, @CurrentUser() user: { id: string }) {
    return this.platform.createPlatformUser(dto, user.id);
  }

  @Patch('users/:id/status')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  setUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: { id: string },
  ) {
    return this.platform.setPlatformUserActive(id, body.isActive, user.id);
  }

  @Delete('users/:id')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  deleteUser(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.platform.deletePlatformUser(id, user.id);
  }

  @Post('cleanup-demo-data')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  cleanupDemoData(
    @Query('dryRun') dryRun: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    return this.platform.cleanupDemoData(user.id, dryRun === 'true');
  }
}
