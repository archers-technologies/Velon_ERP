import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { CRM_REPOSITORIES } from '../crm/crm.repositories';
import { EmailModule } from '../email/email.module';
import { InventoryModule } from '../inventory/inventory.module';
import { InvoicePdfService } from './invoice-pdf.service';
import { INVOICE_REPOSITORIES } from './invoice.repositories';
import { InvoiceService } from './invoice.service';
import { SalesController } from './sales.controller';
import { SALES_REPOSITORIES } from './sales.repositories';
import { SalesService } from './sales.service';

@Module({
  imports: [AuditModule, AuthModule, EmailModule, InventoryModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    InvoiceService,
    InvoicePdfService,
    ...SALES_REPOSITORIES,
    ...INVOICE_REPOSITORIES,
    ...CRM_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [SalesService, InvoiceService],
})
export class SalesModule {}
