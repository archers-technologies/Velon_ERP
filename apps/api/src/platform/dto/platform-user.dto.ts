import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { UserRole } from "@velon/database";
import { IsVelonPassword } from "../../auth/validators/is-velon-password.decorator";

const PLATFORM_ROLES = [UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT] as const;

export class CreatePlatformUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(8)
  @IsVelonPassword()
  password!: string;

  @IsEnum(PLATFORM_ROLES)
  role!: (typeof PLATFORM_ROLES)[number];
}
