import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { SeatsService } from './seats.service';
import { InvitationsPublicController, TenantAdminController } from './tenant-admin.controller';
import { TenantAdminService } from './tenant-admin.service';

@Module({
  imports: [AuditModule, AuthModule, EmailModule],
  controllers: [TenantAdminController, InvitationsPublicController],
  providers: [
    TenantAdminService,
    SeatsService,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [SeatsService],
})
export class TenantAdminModule {}
