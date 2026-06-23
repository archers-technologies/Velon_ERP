import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { TenantContextInterceptor } from "../common/tenant-context.interceptor";
import { InventoryController } from "./inventory.controller";
import { INVENTORY_REPOSITORIES } from "./inventory.repositories";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    ...INVENTORY_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
