import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenantContextInterceptor } from '../common/tenant-context.interceptor';
import { EmailModule } from '../email/email.module';
import { CrmCompanyAssetsController } from './crm-company-assets.controller';
import { CRM_COMPANY_ASSETS_REPOSITORIES } from './crm-company-assets.repositories';
import { CrmCompanyAssetsService } from './crm-company-assets.service';
import { CrmCustomerViewController } from './crm-customer-view.controller';
import { CrmPipelineController } from './crm-pipeline.controller';
import { CRM_PIPELINE_REPOSITORIES } from './crm-pipeline.repositories';
import { CrmPipelineService } from './crm-pipeline.service';
import { CrmQuotationController } from './crm-quotation.controller';
import { CRM_QUOTATION_REPOSITORIES } from './crm-quotation.repositories';
import { CrmQuotationService } from './crm-quotation.service';
import { CrmController } from './crm.controller';
import { CRM_REPOSITORIES } from './crm.repositories';
import { CrmService } from './crm.service';
import { ProposalPdfService } from './proposal-pdf.service';
import { QuotationDocumentPdfService } from './quotation-document-pdf.service';

@Module({
  imports: [AuditModule, AuthModule, EmailModule],
  controllers: [
    CrmController,
    CrmPipelineController,
    CrmQuotationController,
    CrmCompanyAssetsController,
    CrmCustomerViewController,
  ],
  providers: [
    CrmService,
    CrmPipelineService,
    CrmQuotationService,
    CrmCompanyAssetsService,
    ProposalPdfService,
    QuotationDocumentPdfService,
    ...CRM_REPOSITORIES,
    ...CRM_PIPELINE_REPOSITORIES,
    ...CRM_QUOTATION_REPOSITORIES,
    ...CRM_COMPANY_ASSETS_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class CrmModule {}
