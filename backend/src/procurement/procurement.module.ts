import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { ProcurementController } from './procurement.controller';
import { PROCUREMENT_REPOSITORIES } from './procurement.repositories';
import { ProcurementService } from './procurement.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [ProcurementController],
  providers: [
    ProcurementService,
    ...PROCUREMENT_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [ProcurementService],
})
export class ProcurementModule {}
