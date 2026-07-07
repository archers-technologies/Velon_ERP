import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { InventoryUom } from '@velon/database';

export class PurchaseRequestItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ enum: InventoryUom })
  @IsOptional()
  uom?: InventoryUom;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedUnitPrice?: number;
}

export class CreatePurchaseRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseRequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemDto)
  items!: PurchaseRequestItemDto[];
}

export class PurchaseOrderItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  supplierId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
}

export class ApproveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class RejectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class ReceivePurchaseOrderLineDto {
  @ApiProperty()
  @IsString()
  orderItemId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD for batch-tracked products' })
  @IsOptional()
  @IsString()
  mfgDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD for batch-tracked products' })
  @IsOptional()
  @IsString()
  expiryDate?: string;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty({ type: [ReceivePurchaseOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderLineDto)
  lines!: ReceivePurchaseOrderLineDto[];
}
