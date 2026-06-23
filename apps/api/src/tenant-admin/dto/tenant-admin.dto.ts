import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { IndustryTemplate, UserRole } from "@velon/database";
import { IsVelonPassword } from "../../auth/validators/is-velon-password.decorator";

export class CreateDepartmentDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  managerId?: string | null;
}

export class CreateInvitationDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

export class AssignDepartmentDto {
  @IsOptional()
  @IsString()
  departmentId?: string | null;
}

export class UpdateCompanyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  legalName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  logoDataUrl?: string;

  @IsOptional()
  @IsEnum(IndustryTemplate)
  industry?: IndustryTemplate;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  language?: string;
}

export class AcceptInvitationDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsString()
  @MinLength(8)
  @IsVelonPassword()
  password!: string;
}

export class DeleteWorkspaceDto {
  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  confirmPhrase!: string;
}
