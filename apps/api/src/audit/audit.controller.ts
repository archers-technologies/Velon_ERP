import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@velon/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@Controller("audit")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get("logs")
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  list() {
    return this.audit.listRecent();
  }
}
