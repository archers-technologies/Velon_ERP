import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { HrController } from './hr.controller';
import { HR_REPOSITORIES } from './hr.repositories';
import { HrService } from './hr.service';
import { PayslipPdfService } from './payslip-pdf.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [HrController],
  providers: [
    HrService,
    PayslipPdfService,
    ...HR_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [HrService],
})
export class HrModule {}
