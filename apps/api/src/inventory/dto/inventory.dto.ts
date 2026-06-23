import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  InventoryAbcClass,
  InventoryProductStatus,
  InventoryUom,
  InventoryVelocity,
} from "@velon/database";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateInventoryCategoryDto {
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
  parentId?: string;
}

export class UpdateInventoryCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateInventoryProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: InventoryUom })
  @IsOptional()
  @IsEnum(InventoryUom)
  uom?: InventoryUom;

  @ApiPropertyOptional({ enum: InventoryProductStatus })
  @IsOptional()
  @IsEnum(InventoryProductStatus)
  status?: InventoryProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageDataUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ enum: InventoryAbcClass })
  @IsOptional()
  @IsEnum(InventoryAbcClass)
  abcClass?: InventoryAbcClass;

  @ApiPropertyOptional({ enum: InventoryVelocity })
  @IsOptional()
  @IsEnum(InventoryVelocity)
  velocity?: InventoryVelocity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  batchTracked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantParent?: string;

  /** Workspace UI: warehouse/site name for initial stock */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  site?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  safetyStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;
}

export class UpdateInventoryProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: InventoryUom })
  @IsOptional()
  @IsEnum(InventoryUom)
  uom?: InventoryUom;

  @ApiPropertyOptional({ enum: InventoryProductStatus })
  @IsOptional()
  @IsEnum(InventoryProductStatus)
  status?: InventoryProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageDataUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ enum: InventoryAbcClass })
  @IsOptional()
  @IsEnum(InventoryAbcClass)
  abcClass?: InventoryAbcClass;

  @ApiPropertyOptional({ enum: InventoryVelocity })
  @IsOptional()
  @IsEnum(InventoryVelocity)
  velocity?: InventoryVelocity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  batchTracked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantParent?: string;
}

export class CreateInventoryWarehouseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerName?: string;
}

export class UpdateInventoryWarehouseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdjustInventoryStockDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty()
  @IsInt()
  delta!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferInventoryStockDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsString()
  fromWarehouseId!: string;

  @ApiProperty()
  @IsString()
  toWarehouseId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateStockLevelsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  safetyStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  site?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ enum: InventoryAbcClass })
  @IsOptional()
  @IsEnum(InventoryAbcClass)
  abcClass?: InventoryAbcClass;

  @ApiPropertyOptional({ enum: InventoryVelocity })
  @IsOptional()
  @IsEnum(InventoryVelocity)
  velocity?: InventoryVelocity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  batchTracked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantParent?: string;
}
