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
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
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
  AdjustInventoryStockDto,
  CreateInventoryCategoryDto,
  CreateInventoryProductDto,
  CreateInventoryWarehouseDto,
  TransferInventoryStockDto,
  UpdateInventoryCategoryDto,
  UpdateInventoryProductDto,
  UpdateInventoryWarehouseDto,
  UpdateStockLevelsDto,
} from "./dto/inventory.dto";
import { InventoryService } from "./inventory.service";

function reqMeta(req: Request) {
  return {
    ip: req.ip,
    ua: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
  };
}

@ApiTags("inventory")
@Controller("inventory")
@RequirePortalScope("tenant")
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@Roles(
  UserRole.TENANT_OWNER,
  UserRole.TENANT_ADMIN,
  UserRole.DEPARTMENT_ADMIN,
  UserRole.USER,
)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("categories")
  @RequirePermission("inventory:read", "inventory:*")
  listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.listCategories(user);
  }

  @Post("categories")
  @RequirePermission("inventory:write", "inventory:*")
  createCategory(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryCategoryDto) {
    return this.inventory.createCategory(user, dto);
  }

  @Patch("categories/:id")
  @RequirePermission("inventory:write", "inventory:*")
  updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateInventoryCategoryDto,
  ) {
    return this.inventory.updateCategory(user, id, dto);
  }

  @Delete("categories/:id")
  @RequirePermission("inventory:write", "inventory:*")
  deleteCategory(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.inventory.deleteCategory(user, id);
  }

  @Get("products")
  @RequirePermission("inventory:read", "inventory:*")
  listProducts(@CurrentUser() user: AuthenticatedUser, @Query("search") search?: string) {
    return this.inventory.listProducts(user, search);
  }

  @Get("products/:id")
  @RequirePermission("inventory:read", "inventory:*")
  getProduct(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.inventory.getProduct(user, id);
  }

  @Post("products")
  @RequirePermission("inventory:write", "inventory:*")
  createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInventoryProductDto,
    @Req() req: Request,
  ) {
    return this.inventory.createProduct(user, dto, reqMeta(req));
  }

  @Patch("products/:id")
  @RequirePermission("inventory:write", "inventory:*")
  updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateInventoryProductDto,
    @Req() req: Request,
  ) {
    return this.inventory.updateProduct(user, id, dto, reqMeta(req));
  }

  @Get("warehouses")
  @RequirePermission("inventory:read", "inventory:*")
  listWarehouses(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.listWarehouses(user);
  }

  @Post("warehouses")
  @RequirePermission("inventory:write", "inventory:*")
  createWarehouse(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryWarehouseDto) {
    return this.inventory.createWarehouse(user, dto);
  }

  @Patch("warehouses/:id")
  @RequirePermission("inventory:write", "inventory:*")
  updateWarehouse(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateInventoryWarehouseDto,
  ) {
    return this.inventory.updateWarehouse(user, id, dto);
  }

  @Get("stock")
  @RequirePermission("inventory:read", "inventory:*")
  listStock(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.listStock(user);
  }

  @Post("stock/adjust")
  @RequirePermission("inventory:write", "inventory:*")
  adjustStock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AdjustInventoryStockDto,
    @Req() req: Request,
  ) {
    return this.inventory.adjustStock(user, dto, reqMeta(req));
  }

  @Post("stock/transfer")
  @RequirePermission("inventory:write", "inventory:*")
  transferStock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TransferInventoryStockDto,
    @Req() req: Request,
  ) {
    return this.inventory.transferStock(user, dto, reqMeta(req));
  }

  @Patch("stock/:id")
  @RequirePermission("inventory:write", "inventory:*")
  updateStockRow(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateStockLevelsDto,
    @Req() req: Request,
  ) {
    return this.inventory.updateStockRow(user, id, dto, reqMeta(req));
  }
}
