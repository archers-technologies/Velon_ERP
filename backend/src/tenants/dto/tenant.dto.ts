import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IndustryTemplate, TenantPlan, TenantStatus } from "@velon/database";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  country!: string;

  @ApiProperty({ enum: TenantPlan })
  @IsEnum(TenantPlan)
  plan!: TenantPlan;

  @ApiProperty({ enum: TenantStatus })
  @IsEnum(TenantStatus)
  status!: TenantStatus;

  @ApiProperty({ enum: IndustryTemplate })
  @IsEnum(IndustryTemplate)
  industryTemplate!: IndustryTemplate;

  @ApiProperty()
  @IsInt()
  @Min(0)
  users!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  mrr!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ enum: TenantPlan })
  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  users?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrr?: number;
}
