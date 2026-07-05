import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previewText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendTestEmailDto {
  @ApiProperty()
  @IsEmail()
  toEmail!: string;
}

export class UpdateEmailPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  billingAlertsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  securityAlertsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  productUpdatesOptIn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trainingAnnouncementsOptIn?: boolean;
}

export class UnsubscribePreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  productUpdatesOptIn?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trainingAnnouncementsOptIn?: boolean;
}
