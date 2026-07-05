import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { SuppliersController } from './suppliers.controller';
import { SUPPLIER_REPOSITORIES } from './suppliers.repositories';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    ...SUPPLIER_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [SuppliersService],
})
export class SuppliersModule {}
