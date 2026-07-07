import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { REPORT_DATE_PRESETS } from '../report-date-range.util';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ReportsQueryDto {
  @ApiPropertyOptional({ enum: REPORT_DATE_PRESETS })
  @IsOptional()
  @IsIn([...REPORT_DATE_PRESETS])
  preset?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Warehouse / branch filter' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}
