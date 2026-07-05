import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTenantResourceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  /** Ignored if present — tenantId is always derived from JWT. */
  @ApiProperty({ required: false, deprecated: true })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
