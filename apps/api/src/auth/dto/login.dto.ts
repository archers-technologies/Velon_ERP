import { ApiProperty } from "@nestjs/swagger";
import { IndustryTemplate } from "@velon/database";
import { VELON_CONTACT_EMAIL } from "@velon/shared";
import { IsEmail, IsEnum, IsString, Matches, MinLength } from "class-validator";
import { IsVelonPassword } from "../validators/is-velon-password.decorator";

export class LoginDto {
  @ApiProperty({ example: VELON_CONTACT_EMAIL })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class SignUpDto {
  @ApiProperty({ description: "Legal company name" })
  @IsString()
  @MinLength(2)
  companyName!: string;

  @ApiProperty({ description: "Company contact email (also used for login)" })
  @IsEmail()
  companyEmail!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  companyPhone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  country!: string;

  @ApiProperty({ enum: IndustryTemplate })
  @IsEnum(IndustryTemplate)
  industry!: IndustryTemplate;

  @ApiProperty({ description: "Full name of the account owner" })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({
    description:
      "Password — minimum 8 characters with uppercase, lowercase, number, and symbol",
  })
  @IsString()
  @MinLength(8)
  @IsVelonPassword()
  password!: string;

  @ApiProperty({ description: "HMAC token issued after email OTP verification" })
  @IsString()
  @MinLength(16)
  verificationToken!: string;
}

export class RequestSignupOtpDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  companyName!: string;
}

export class VerifySignupOtpDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: "6-digit verification code" })
  @IsString()
  @Matches(/^\d{6}$/, { message: "Enter the 6-digit OTP" })
  code!: string;
}
