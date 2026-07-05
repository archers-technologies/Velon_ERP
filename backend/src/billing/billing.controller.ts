import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantPlan, UserRole } from '@velon/database';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePortalScope } from '../auth/decorators/portal-scope.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortalScopeGuard } from '../auth/guards/portal-scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import { getRazorpayPublicConfig } from '../config/razorpay.env';
import { BillingService } from './billing.service';
import {
  CancelCheckoutDto,
  ChangeTenantPlanDto,
  CreateCheckoutDto,
  ExtendTrialDto,
  GrantTrialDto,
  RejectPaymentDto,
  TenantChangePlanDto,
  UpdatePlanDefinitionDto,
  VerifyRazorpayPaymentDto,
} from './dto/billing.dto';
import { listEnabledPaymentProviders } from './providers';
import { RazorpayBillingService } from './razorpay-billing.service';
import { SubscriptionService } from './subscription.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly subscriptions: SubscriptionService,
    private readonly razorpay: RazorpayBillingService,
  ) {}

  @Get('payment-config')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard)
  @ApiBearerAuth()
  paymentConfig() {
    const razorpay = getRazorpayPublicConfig();
    return {
      bankTransfer: true,
      razorpay: {
        enabled: razorpay.enabled,
        keyId: razorpay.enabled ? razorpay.keyId : null,
        currency: razorpay.currency,
      },
    };
  }

  @Get('plans')
  getPlans() {
    return this.billing.getPlanCatalog();
  }

  @Get('plans/for-workspace')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard)
  @ApiBearerAuth()
  workspacePlans(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.getTenantPlanCatalog(user.tenantId!);
  }

  @Patch('platform/plans/:plan')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  updatePlan(
    @Param('plan') plan: TenantPlan,
    @Body() dto: UpdatePlanDefinitionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.billing.updatePlanDefinition(plan, dto, user.id);
  }

  @Get('providers')
  listProviders() {
    return listEnabledPaymentProviders().map((p) => ({ id: p.id }));
  }

  @Get('platform/subscriptions')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiBearerAuth()
  platformSubscriptions() {
    return this.billing.getPlatformSubscriptionOverview();
  }

  @Patch('platform/tenants/:tenantId/plan')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  changeTenantPlan(
    @Param('tenantId') tenantId: string,
    @Body() dto: ChangeTenantPlanDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.billing.changeTenantPlan(tenantId, dto.plan, user.id);
  }

  @Post('platform/tenants/:tenantId/reset')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  resetTenantSubscription(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.billing.resetTenantSubscription(tenantId, user.id);
  }

  @Post('platform/tenants/:tenantId/activate')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  activateSubscription(@Param('tenantId') tenantId: string) {
    return this.subscriptions.platformActivate(tenantId);
  }

  @Post('platform/tenants/:tenantId/suspend')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  suspendSubscription(@Param('tenantId') tenantId: string) {
    return this.subscriptions.platformSuspend(tenantId);
  }

  @Post('platform/tenants/:tenantId/trial')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  grantTrial(@Param('tenantId') tenantId: string, @Body() dto: GrantTrialDto) {
    return this.subscriptions.platformGrantTrial(tenantId, dto.days);
  }

  @Post('platform/tenants/:tenantId/trial/extend')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  extendTrial(@Param('tenantId') tenantId: string, @Body() dto: ExtendTrialDto) {
    return this.subscriptions.platformExtendTrial(tenantId, dto.days);
  }

  @Post('platform/payments/:paymentId/approve')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  approveBankTransfer(@Param('paymentId') paymentId: string, @CurrentUser() user: { id: string }) {
    return this.billing.approvePendingPayment(paymentId, user.id);
  }

  @Post('platform/payments/:paymentId/reject')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  rejectBankTransfer(
    @Param('paymentId') paymentId: string,
    @Body() dto: RejectPaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.billing.rejectPendingPayment(paymentId, user.id, dto.reason);
  }

  @Get('platform/payments/pending')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiBearerAuth()
  pendingPayments() {
    return this.billing.listPendingPayments();
  }

  @Get('platform/payments')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiBearerAuth()
  platformPayments() {
    return this.billing.listPlatformPayments();
  }

  @Get('subscription')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard)
  @ApiBearerAuth()
  tenantSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.getTenantSubscription(user.tenantId!);
  }

  @Get('invoices')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard)
  @ApiBearerAuth()
  tenantInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.listInvoices(user.tenantId!);
  }

  @Get('payments')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard)
  @ApiBearerAuth()
  tenantPayments(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.listPayments(user.tenantId!);
  }

  @Get('access')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard)
  @ApiBearerAuth()
  tenantAccess(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.getTenantAccessState(user.tenantId!);
  }

  @Patch('subscription/plan')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard)
  @Roles(UserRole.TENANT_OWNER)
  @ApiBearerAuth()
  tenantChangePlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: TenantChangePlanDto) {
    return this.subscriptions.changePlan(user.tenantId!, dto.plan, dto.billingInterval);
  }

  @Post('subscription/cancel')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard)
  @Roles(UserRole.TENANT_OWNER)
  @ApiBearerAuth()
  tenantCancel(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.cancelAtPeriodEnd(user.tenantId!);
  }

  @Post('subscription/resume')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard)
  @Roles(UserRole.TENANT_OWNER)
  @ApiBearerAuth()
  tenantResume(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.resumeSubscription(user.tenantId!);
  }

  @Post('checkout')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard)
  @Roles(UserRole.TENANT_OWNER)
  @ApiBearerAuth()
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCheckoutDto) {
    return this.subscriptions.createCheckout(
      user.tenantId!,
      dto.plan,
      dto.billingInterval,
      dto.provider,
      user.email,
      dto.idempotencyKey,
    );
  }

  @Post('checkout/cancel')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard)
  @Roles(UserRole.TENANT_OWNER)
  @ApiBearerAuth()
  cancelCheckout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CancelCheckoutDto) {
    return this.subscriptions.cancelCheckoutPayment(user.tenantId!, dto.orderId);
  }

  @Post('razorpay/verify')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard)
  @Roles(UserRole.TENANT_OWNER)
  @ApiBearerAuth()
  verifyRazorpay(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyRazorpayPaymentDto) {
    return this.razorpay.verifyCheckoutPayment(
      user.tenantId!,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
      user.id,
    );
  }
}
