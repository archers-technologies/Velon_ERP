import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CrmQuotationStatus } from "@velon/database";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CrmQuotationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CrmQuotationStatus })
  @IsOptional()
  @IsEnum(CrmQuotationStatus)
  status?: CrmQuotationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  opportunityId?: string;
}

export class CreateCrmQuotationDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeOfWork?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliverables?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class UpdateCrmQuotationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeOfWork?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliverables?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateCrmQuotationItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class UpdateCrmQuotationItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class BulkAddCrmQuotationItemsDto {
  @ApiProperty({ type: [CreateCrmQuotationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCrmQuotationItemDto)
  items!: CreateCrmQuotationItemDto[];
}

export class QuotationActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class CreateQuotationRevisionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  revisionReason!: string;
}

export class CreateCrmProposalTemplateDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliverablesTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsTemplate?: string;
}

export class UpdateCrmProposalTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliverablesTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsTemplate?: string;
}

export class CustomerViewCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  comments!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorName?: string;
}
