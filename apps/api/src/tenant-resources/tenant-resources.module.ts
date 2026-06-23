import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditModule } from "../audit/audit.module";
import { TenantContextInterceptor } from "../common/tenant-context.interceptor";
import { TENANT_REPOSITORIES } from "../common/repositories/tenant.repositories";
import { WorkspaceModule } from "../workspace/workspace.module";
import { TenantResourcesController } from "./tenant-resources.controller";
import { TenantResourcesService } from "./tenant-resources.service";

@Module({
  imports: [AuditModule, WorkspaceModule],
  controllers: [TenantResourcesController],
  providers: [
    TenantResourcesService,
    ...TENANT_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class TenantResourcesModule {}
