import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@velon/database";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePortalScope } from "../auth/decorators/portal-scope.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PortalScopeGuard } from "../auth/guards/portal-scope.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateTenantDto, UpdateTenantDto } from "./dto/tenant.dto";
import { TenantsService } from "./tenants.service";

@ApiTags("tenants")
@Controller("tenants")
@RequirePortalScope("platform")
@UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  list() {
    return this.tenants.findAll();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: { id: string }) {
    return this.tenants.create(dto, user.id);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.tenants.update(id, dto, user.id);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.tenants.remove(id, user.id);
  }
}
