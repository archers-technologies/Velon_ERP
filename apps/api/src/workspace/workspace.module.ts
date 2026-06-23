import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { TenantAdminModule } from "../tenant-admin/tenant-admin.module";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceContextService } from "./workspace-context.service";
import { WorkspaceDataService } from "./workspace-data.service";

@Module({
  imports: [AuditModule, TenantAdminModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceContextService, WorkspaceDataService],
  exports: [WorkspaceContextService],
})
export class WorkspaceModule {}
