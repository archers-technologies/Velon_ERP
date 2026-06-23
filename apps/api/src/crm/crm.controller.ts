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
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PortalScopeGuard } from "../auth/guards/portal-scope.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TenantScopeGuard } from "../auth/guards/tenant-scope.guard";
import { CrmService } from "./crm.service";
import {
  AssignCrmActivityDto,
  CreateCrmActivityDto,
  CreateCrmContactDto,
  CreateCrmCustomerDto,
  CreateCrmNoteDto,
  CrmActivityQueryDto,
  CrmContactQueryDto,
  CrmCustomerQueryDto,
  CrmNoteQueryDto,
  UpdateCrmActivityDto,
  UpdateCrmContactDto,
  UpdateCrmCustomerDto,
  UpdateCrmNoteDto,
} from "./dto/crm.dto";

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    ua: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
  };
}

@ApiTags("crm")
@Controller("crm")
@RequirePortalScope("tenant")
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@RequirePermission("crm:read", "crm:*")
@Roles(
  UserRole.TENANT_OWNER,
  UserRole.TENANT_ADMIN,
  UserRole.DEPARTMENT_ADMIN,
  UserRole.USER,
)
@ApiBearerAuth()
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("customers")
  listCustomers(@CurrentUser() user: AuthenticatedUser, @Query() query: CrmCustomerQueryDto) {
    return this.crm.listCustomers(user, query);
  }

  @Get("customers/:id")
  getCustomer(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.crm.getCustomer(user, id);
  }

  @Post("customers")
  @RequirePermission("crm:write", "crm:*")
  createCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmCustomerDto,
    @Req() req: Request,
  ) {
    return this.crm.createCustomer(user, dto, reqMeta(req));
  }

  @Patch("customers/:id")
  @RequirePermission("crm:write", "crm:*")
  updateCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCrmCustomerDto,
    @Req() req: Request,
  ) {
    return this.crm.updateCustomer(user, id, dto, reqMeta(req));
  }

  @Post("customers/:id/archive")
  @RequirePermission("crm:*")
  archiveCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.crm.archiveCustomer(user, id, reqMeta(req));
  }

  @Post("customers/:id/restore")
  @RequirePermission("crm:*")
  restoreCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.crm.restoreCustomer(user, id, reqMeta(req));
  }

  @Delete("customers/:id")
  @RequirePermission("crm:*")
  deleteCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.crm.deleteCustomer(user, id, reqMeta(req));
  }

  @Get("contacts")
  listContacts(@CurrentUser() user: AuthenticatedUser, @Query() query: CrmContactQueryDto) {
    return this.crm.listContacts(user, query);
  }

  @Get("contacts/:id")
  getContact(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.crm.getContact(user, id);
  }

  @Post("contacts")
  @RequirePermission("crm:write", "crm:*")
  createContact(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmContactDto,
    @Req() req: Request,
  ) {
    return this.crm.createContact(user, dto, reqMeta(req));
  }

  @Patch("contacts/:id")
  @RequirePermission("crm:write", "crm:*")
  updateContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCrmContactDto,
    @Req() req: Request,
  ) {
    return this.crm.updateContact(user, id, dto, reqMeta(req));
  }

  @Post("contacts/:id/archive")
  @RequirePermission("crm:write", "crm:*")
  archiveContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.crm.archiveContact(user, id, reqMeta(req));
  }

  @Post("contacts/:id/restore")
  @RequirePermission("crm:write", "crm:*")
  restoreContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.crm.restoreContact(user, id, reqMeta(req));
  }

  @Get("notes")
  listNotes(@CurrentUser() user: AuthenticatedUser, @Query() query: CrmNoteQueryDto) {
    return this.crm.listNotes(user, query);
  }

  @Post("notes")
  @RequirePermission("crm:read", "crm:*")
  createNote(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmNoteDto,
    @Req() req: Request,
  ) {
    return this.crm.createNote(user, dto, reqMeta(req));
  }

  @Patch("notes/:id")
  @RequirePermission("crm:read", "crm:*")
  updateNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCrmNoteDto,
    @Req() req: Request,
  ) {
    return this.crm.updateNote(user, id, dto, reqMeta(req));
  }

  @Delete("notes/:id")
  @RequirePermission("crm:read", "crm:*")
  deleteNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.crm.deleteNote(user, id, reqMeta(req));
  }

  @Get("activities")
  listActivities(@CurrentUser() user: AuthenticatedUser, @Query() query: CrmActivityQueryDto) {
    return this.crm.listActivities(user, query);
  }

  @Get("activities/:id")
  getActivity(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.crm.getActivity(user, id);
  }

  @Post("activities")
  @RequirePermission("crm:write", "crm:*")
  createActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmActivityDto,
    @Req() req: Request,
  ) {
    return this.crm.createActivity(user, dto, reqMeta(req));
  }

  @Patch("activities/:id")
  @RequirePermission("crm:write", "crm:*")
  updateActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCrmActivityDto,
    @Req() req: Request,
  ) {
    return this.crm.updateActivity(user, id, dto, reqMeta(req));
  }

  @Post("activities/:id/assign")
  @RequirePermission("crm:write", "crm:*")
  assignActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AssignCrmActivityDto,
    @Req() req: Request,
  ) {
    return this.crm.assignActivity(user, id, dto, reqMeta(req));
  }

  @Post("activities/:id/complete")
  @RequirePermission("crm:write", "crm:*")
  completeActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.crm.completeActivity(user, id, reqMeta(req));
  }

  @Post("activities/:id/cancel")
  @RequirePermission("crm:write", "crm:*")
  cancelActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.crm.cancelActivity(user, id, reqMeta(req));
  }
}
