import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { TenantContextInterceptor } from "../common/tenant-context.interceptor";
import { InvitationMailer } from "./invitation-mailer";
import { InvitationsPublicController, TenantAdminController } from "./tenant-admin.controller";
import { TenantAdminService } from "./tenant-admin.service";
import { SeatsService } from "./seats.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [TenantAdminController, InvitationsPublicController],
  providers: [
    TenantAdminService,
    SeatsService,
    InvitationMailer,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [SeatsService],
})
export class TenantAdminModule {}
