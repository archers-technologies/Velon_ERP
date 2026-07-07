import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { TenantAdminModule } from '../tenant-admin/tenant-admin.module';
import { WorkspaceContextService } from './workspace-context.service';
import { WorkspaceDataService } from './workspace-data.service';
import { WorkspaceReportsService } from './workspace-reports.service';
import { WorkspaceController } from './workspace.controller';

@Module({
  imports: [AuditModule, TenantAdminModule, InventoryModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceContextService, WorkspaceDataService, WorkspaceReportsService],
  exports: [WorkspaceContextService],
})
export class WorkspaceModule {}
