import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { HealthModule } from "./health/health.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PlatformModule } from "./platform/platform.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { MongoModule } from "./mongo/mongo.module";
import { TenantsModule } from "./tenants/tenants.module";
import { WorkspaceModule } from "./workspace/workspace.module";
import { TenantResourcesModule } from "./tenant-resources/tenant-resources.module";
import { TenantAdminModule } from "./tenant-admin/tenant-admin.module";
import { BillingModule } from "./billing/billing.module";
import { CmsModule } from "./cms/cms.module";
import { CrmModule } from "./crm/crm.module";
import { InventoryModule } from "./inventory/inventory.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { ProcurementModule } from "./procurement/procurement.module";
import { SalesModule } from "./sales/sales.module";
import { validateEnvironment } from "./config/env";
import { CommonModule } from "./common/common.module";
import { ApiResponseFilter } from "./common/api-response.filter";
import { ApiResponseInterceptor } from "./common/api-response.interceptor";
import { SubscriptionGuard } from "./auth/guards/subscription.guard";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CommonModule,
    PrismaModule,
    RedisModule,
    MongoModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    PlatformModule,
    WorkspaceModule,
    TenantResourcesModule,
    TenantAdminModule,
    CrmModule,
    InventoryModule,
    SuppliersModule,
    ProcurementModule,
    SalesModule,
    BillingModule,
    CmsModule,
    AuditModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_FILTER, useClass: ApiResponseFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule {}
