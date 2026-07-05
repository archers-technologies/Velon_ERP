import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { IsVelonPassword } from '../validators/is-velon-password.decorator';

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

export class VerifyPasswordResetOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit verification code' })
  code!: string;
}

export class CompletePasswordResetDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(16)
  verificationToken!: string;

  @IsString()
  @MinLength(8)
  @IsVelonPassword()
  password!: string;
}

export const PASSWORD_RESET_GENERIC_MESSAGE =
  'If an account exists for this email, we have sent a verification code.';
