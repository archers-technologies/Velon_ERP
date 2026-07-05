import { IsString, MinLength } from "class-validator";
import { IsVelonPassword } from "../validators/is-velon-password.decorator";

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @IsVelonPassword()
  newPassword!: string;
}
