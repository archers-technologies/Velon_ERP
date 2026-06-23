import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { TenantContextInterceptor } from "../common/tenant-context.interceptor";
import { SalesController } from "./sales.controller";
import { SALES_REPOSITORIES } from "./sales.repositories";
import { SalesService } from "./sales.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    ...SALES_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [SalesService],
})
export class SalesModule {}
