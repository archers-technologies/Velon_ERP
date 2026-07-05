import { BadRequestException, Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@velon/database";
import { RequirePortalScope } from "../auth/decorators/portal-scope.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PortalScopeGuard } from "../auth/guards/portal-scope.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CmsService, SITE_CONTENT_KEYS, type SiteContentKey } from "./cms.service";

@ApiTags("cms")
@Controller()
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Get("public/site-content")
  getPublicContent() {
    return this.cms.getAll();
  }

  @Get("platform/site-content")
  @RequirePortalScope("platform")
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiBearerAuth()
  getAdminContent() {
    return this.cms.getAll();
  }

  @Patch("platform/site-content/:key")
  @RequirePortalScope("platform")
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  updateBlock(@Param("key") key: string, @Body() body: { data: unknown }) {
    if (!SITE_CONTENT_KEYS.includes(key as SiteContentKey)) {
      throw new BadRequestException(`Invalid content key: ${key}`);
    }
    return this.cms.upsertBlock(key as SiteContentKey, body.data as object);
  }
}
