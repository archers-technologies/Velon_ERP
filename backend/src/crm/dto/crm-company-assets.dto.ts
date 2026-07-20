import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { CompanyLibraryAssetCategory } from '@velon/database';

export class CreateCompanyLibraryAssetDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: CompanyLibraryAssetCategory })
  @IsEnum(CompanyLibraryAssetCategory)
  category!: CompanyLibraryAssetCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  mimeType!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  fileName!: string;

  @ApiProperty({ description: 'Base64-encoded file content' })
  @IsString()
  @MinLength(1)
  fileBase64!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  contentJson?: Record<string, unknown>;
}

export class CompanyLibraryAssetQueryDto {
  @ApiPropertyOptional({ enum: CompanyLibraryAssetCategory })
  @IsOptional()
  @IsEnum(CompanyLibraryAssetCategory)
  category?: CompanyLibraryAssetCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateCrmContentBlockDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsObject()
  contentJson!: Record<string, unknown>;
}

export class CrmContentBlockQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
