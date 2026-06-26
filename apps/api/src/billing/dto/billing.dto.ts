import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { BillingInterval, PaymentProvider, TenantPlan } from "@velon/database";

export class ChangeTenantPlanDto {
  @IsEnum(TenantPlan)
  plan!: TenantPlan;
}

export class TenantChangePlanDto {
  @IsEnum(TenantPlan)
  plan!: TenantPlan;

  @IsOptional()
  @IsEnum(BillingInterval)
  billingInterval?: BillingInterval;
}

export class CreateCheckoutDto {
  @IsEnum(TenantPlan)
  plan!: TenantPlan;

  @IsEnum(BillingInterval)
  billingInterval!: BillingInterval;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsString()
  idempotencyKey!: string;
}

export class ExtendTrialDto {
  @IsInt()
  @Min(1)
  days!: number;
}

export class GrantTrialDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;
}

export class RejectPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class VerifyRazorpayPaymentDto {
  @IsString()
  razorpay_order_id!: string;

  @IsString()
  razorpay_payment_id!: string;

  @IsString()
  razorpay_signature!: string;
}

export class CancelCheckoutDto {
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class PlatformSubscriptionActionDto {
  @IsString()
  tenantId!: string;
}

class PlanModulesDto {
  @IsOptional()
  @IsBoolean()
  hrm?: boolean;

  @IsOptional()
  @IsBoolean()
  crm?: boolean;

  @IsOptional()
  @IsBoolean()
  finance?: boolean;

  @IsOptional()
  @IsBoolean()
  inventory?: boolean;

  @IsOptional()
  @IsBoolean()
  manufacturing?: boolean;
}

export class UpdatePlanDefinitionDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  indiaMonthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  indiaAnnualPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  globalMonthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  globalAnnualPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  seatLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  storageLimitGb?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  invoiceLimitMo?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  branchLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanModulesDto)
  modules?: PlanModulesDto;
}
