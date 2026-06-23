import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@velon/database";
import type { Request } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePortalScope } from "../auth/decorators/portal-scope.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PortalScopeGuard } from "../auth/guards/portal-scope.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TenantScopeGuard } from "../auth/guards/tenant-scope.guard";
import {
  AcceptInvitationDto,
  AssignDepartmentDto,
  CreateDepartmentDto,
  CreateInvitationDto,
  UpdateCompanyProfileDto,
  UpdateDepartmentDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceDto,
  DeleteWorkspaceDto,
} from "./dto/tenant-admin.dto";
import { TenantAdminService } from "./tenant-admin.service";

function reqMeta(req: Request, appOrigin?: string) {
  return {
    ip: req.ip,
    ua: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    appOrigin: appOrigin ?? (typeof req.headers.origin === "string" ? req.headers.origin : undefined),
  };
}

@ApiTags("tenant-admin")
@Controller("tenant-admin")
@RequirePortalScope("tenant")
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard)
@Roles(UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN)
@ApiBearerAuth()
export class TenantAdminController {
  constructor(private readonly admin: TenantAdminService) {}

  @Get("overview")
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.getAdminOverview(user);
  }

  @Get("seats")
  seats(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.getAdminOverview(user).then((o) => o.seats);
  }

  @Patch("company-profile")
  updateCompanyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyProfileDto,
    @Req() req: Request,
  ) {
    return this.admin.updateCompanyProfile(user, dto, reqMeta(req));
  }

  @Patch("workspace")
  updateWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkspaceDto,
    @Req() req: Request,
  ) {
    return this.admin.updateWorkspace(user, dto, reqMeta(req));
  }

  @Delete("workspace")
  deleteWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteWorkspaceDto,
    @Req() req: Request,
  ) {
    return this.admin.deleteWorkspace(user, dto, reqMeta(req));
  }

  @Get("departments")
  listDepartments(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.listDepartments(user);
  }

  @Post("departments")
  createDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDepartmentDto,
    @Req() req: Request,
  ) {
    return this.admin.createDepartment(user, dto, reqMeta(req));
  }

  @Patch("departments/:id")
  updateDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: Request,
  ) {
    return this.admin.updateDepartment(user, id, dto, reqMeta(req));
  }

  @Delete("departments/:id")
  deleteDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.admin.deleteDepartment(user, id, reqMeta(req));
  }

  @Get("members")
  listMembers(@CurrentUser() user: AuthenticatedUser, @Query("search") search?: string) {
    return this.admin.listMembers(user, search);
  }

  @Patch("members/:id/role")
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: Request,
  ) {
    return this.admin.updateMemberRole(user, id, dto, reqMeta(req));
  }

  @Patch("members/:id/department")
  assignDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AssignDepartmentDto,
  ) {
    return this.admin.setMemberDepartment(user, id, dto);
  }

  @Post("members/:id/disable")
  disableMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.admin.disableMember(user, id, reqMeta(req));
  }

  @Post("members/:id/enable")
  enableMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.admin.enableMember(user, id, reqMeta(req));
  }

  @Delete("members/:id")
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.admin.removeMember(user, id, reqMeta(req));
  }

  @Get("invitations")
  listInvitations(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.listInvitations(user);
  }

  @Post("invitations")
  createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
    @Req() req: Request,
  ) {
    return this.admin.createInvitation(user, dto, reqMeta(req));
  }

  @Post("invitations/:id/revoke")
  revokeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.admin.revokeInvitation(user, id, reqMeta(req));
  }

  @Post("invitations/:id/resend")
  resendInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.admin.resendInvitation(user, id, reqMeta(req));
  }

  @Get("audit-logs")
  auditLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.listAuditLogs(user);
  }
}

@ApiTags("invitations")
@Controller("invitations")
export class InvitationsPublicController {
  constructor(private readonly admin: TenantAdminService) {}

  @Get(":token")
  preview(@Param("token") token: string) {
    return this.admin.previewInvitation(token);
  }

  @Post("accept")
  accept(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    return this.admin.acceptInvitation(dto, reqMeta(req));
  }
}
