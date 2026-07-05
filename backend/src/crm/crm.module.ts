import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { TenantContextInterceptor } from "../common/tenant-context.interceptor";
import { CRM_PIPELINE_REPOSITORIES } from "./crm-pipeline.repositories";
import { CrmPipelineController } from "./crm-pipeline.controller";
import { CrmPipelineService } from "./crm-pipeline.service";
import { CrmCustomerViewController } from "./crm-customer-view.controller";
import { CRM_QUOTATION_REPOSITORIES } from "./crm-quotation.repositories";
import { CrmQuotationController } from "./crm-quotation.controller";
import { CrmQuotationService } from "./crm-quotation.service";
import { ProposalPdfService } from "./proposal-pdf.service";
import { CRM_REPOSITORIES } from "./crm.repositories";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [
    CrmController,
    CrmPipelineController,
    CrmQuotationController,
    CrmCustomerViewController,
  ],
  providers: [
    CrmService,
    CrmPipelineService,
    CrmQuotationService,
    ProposalPdfService,
    ...CRM_REPOSITORIES,
    ...CRM_PIPELINE_REPOSITORIES,
    ...CRM_QUOTATION_REPOSITORIES,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class CrmModule {}
