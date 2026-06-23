import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuditModule } from "../audit/audit.module";
import { BillingModule } from "../billing/billing.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { PasswordResetService } from "./password-reset.service";
import { SignupOtpService } from "./signup-otp.service";
import { PermissionGuard } from "./guards/permission.guard";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-only-change-in-env",
    }),
    AuditModule,
    forwardRef(() => BillingModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, SignupOtpService, PasswordResetService, JwtStrategy, PermissionGuard],
  exports: [AuthService, JwtModule, PermissionGuard],
})
export class AuthModule {}
