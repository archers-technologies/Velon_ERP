import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PosSaleLineDto {
  @IsOptional()
  @IsString()
  inventoryId?: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(1)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CommitPosSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleLineDto)
  lines!: PosSaleLineDto[];

  @IsIn(['paid', 'due'])
  kind!: 'paid' | 'due';

  @IsOptional()
  @IsString()
  customerName?: string;
}
