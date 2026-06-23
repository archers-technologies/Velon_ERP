import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto, RequestSignupOtpDto, SignUpDto, VerifySignupOtpDto } from "./dto/login.dto";
import {
  CompletePasswordResetDto,
  RequestPasswordResetDto,
  VerifyPasswordResetOtpDto,
} from "./dto/password-reset.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { PasswordResetService } from "./password-reset.service";
import { SignupOtpService } from "./signup-otp.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly signupOtp: SignupOtpService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("signup/request-otp")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestSignupOtp(@Body() dto: RequestSignupOtpDto) {
    await this.auth.assertSignupEmailAvailable(dto.email);
    const result = await this.signupOtp.sendSignupOtp(dto);
    if (process.env.NODE_ENV === "production") {
      const { devCode: _omit, ...safe } = result;
      return safe;
    }
    return result;
  }

  @Post("signup/verify-otp")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifySignupOtp(@Body() dto: VerifySignupOtpDto) {
    return this.signupOtp.verifySignupOtp(dto);
  }

  @Post("signup")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  signUp(@Body() dto: SignUpDto) {
    return this.auth.signUp(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logout(@CurrentUser() user: { id: string }, @Body() body: { refreshToken?: string }) {
    return this.auth.logout(user.id, body?.refreshToken);
  }

  @Post("password-reset/request")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    const result = await this.passwordReset.requestReset(dto.email);
    if (process.env.NODE_ENV === "production") {
      const { devCode: _omit, ...safe } = result;
      return safe;
    }
    return result;
  }

  @Post("password-reset/verify-otp")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyPasswordResetOtp(@Body() dto: VerifyPasswordResetOtpDto) {
    return this.passwordReset.verifyResetOtp(dto);
  }

  @Post("password-reset/complete")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  completePasswordReset(@Body() dto: CompletePasswordResetDto) {
    return this.passwordReset.completeReset(dto);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
