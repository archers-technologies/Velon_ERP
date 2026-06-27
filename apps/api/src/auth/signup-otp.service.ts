import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import { issueSignupVerificationToken } from "../../../../packages/shared/src/signup-verification";
import { getAuthOtpSecret } from "../config/env";
import { sendTransactionalMail } from "../common/mail-delivery.util";
import { RedisService } from "../redis/redis.service";

const OTP_TTL_SEC = 10 * 60;
const MAX_ATTEMPTS = 5;
const REDIS_KEY_PREFIX = "velon:signup:otp:";

type OtpRecord = {
  email: string;
  companyName: string;
  otpHash: string;
  attempts: number;
  createdAt: string;
};

@Injectable()
export class SignupOtpService {
  private readonly log = new Logger(SignupOtpService.name);

  constructor(private readonly redis: RedisService) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private redisKey(email: string): string {
    return `${REDIS_KEY_PREFIX}${this.normalizeEmail(email)}`;
  }

  private hashOtp(email: string, code: string): string {
    return createHash("sha256")
      .update(`${this.normalizeEmail(email)}:${code}:${getAuthOtpSecret()}`)
      .digest("hex");
  }

  private generateOtp(): string {
    return String(randomInt(100000, 1000000));
  }

  private async loadRecord(email: string): Promise<OtpRecord | null> {
    try {
      const raw = await this.redis.client.get(this.redisKey(email));
      if (!raw) return null;
      return JSON.parse(raw) as OtpRecord;
    } catch (err) {
      this.log.warn(`Redis OTP read failed: ${String(err)}`);
      throw new ServiceUnavailableException(
        "Verification service is temporarily unavailable. Try again shortly.",
      );
    }
  }

  private async saveRecord(email: string, record: OtpRecord): Promise<void> {
    try {
      await this.redis.client.set(
        this.redisKey(email),
        JSON.stringify(record),
        "EX",
        OTP_TTL_SEC,
      );
    } catch (err) {
      this.log.warn(`Redis OTP write failed: ${String(err)}`);
      throw new ServiceUnavailableException(
        "Verification service is temporarily unavailable. Try again shortly.",
      );
    }
  }

  private async deleteRecord(email: string): Promise<void> {
    try {
      await this.redis.client.del(this.redisKey(email));
    } catch {
      /* best-effort cleanup */
    }
  }

  async sendSignupOtp(input: {
    email: string;
    companyName: string;
  }): Promise<{ delivered: boolean; devCode?: string }> {
    const email = this.normalizeEmail(input.email);
    const companyName = input.companyName.trim();
    const code = this.generateOtp();
    const record: OtpRecord = {
      email,
      companyName,
      otpHash: this.hashOtp(email, code),
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    await this.saveRecord(email, record);
    const mail = await this.deliverOtpEmail({ to: email, businessName: companyName, code });
    this.log.log(`Signup OTP issued for ${email}`);
    if (mail.delivered) return { delivered: true };
    if (process.env.NODE_ENV === "production") {
      return { delivered: false };
    }
    return { delivered: false, devCode: mail.devCode };
  }

  async verifySignupOtp(input: {
    email: string;
    code: string;
  }): Promise<{ verificationToken: string }> {
    const email = this.normalizeEmail(input.email);
    const code = input.code.trim();
    const doc = await this.loadRecord(email);

    if (!doc) {
      throw new BadRequestException("Verification code not found. Request a new OTP.");
    }
    if (doc.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException("Too many OTP attempts. Request a new OTP.");
    }
    if (doc.otpHash !== this.hashOtp(email, code)) {
      doc.attempts += 1;
      await this.saveRecord(email, doc);
      throw new BadRequestException("Invalid verification code.");
    }

    await this.deleteRecord(email);
    const verificationToken = issueSignupVerificationToken(
      getAuthOtpSecret(),
      email,
      doc.companyName,
    );
    return { verificationToken };
  }

  private async deliverOtpEmail(input: {
    to: string;
    businessName: string;
    code: string;
  }): Promise<{ delivered: boolean; devCode?: string }> {
    try {
      const mail = await sendTransactionalMail({
        to: input.to,
        subject: "Verify your Velon-ERP trial workspace",
        text: `Your Velon-ERP verification code for ${input.businessName} is ${input.code}. It expires in 10 minutes.`,
        html: `<p>Your Velon-ERP verification code for <strong>${input.businessName}</strong> is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${input.code}</p><p>This code expires in 10 minutes.</p>`,
      });
      if (mail.delivered) return { delivered: true };
      if (process.env.NODE_ENV !== "production") {
        this.log.log(
          `[dev OTP skipped:${mail.skippedReason ?? "smtp_failed"}] ${input.to}: ${input.code}`,
        );
        return { delivered: false, devCode: input.code };
      }

      if (mail.skippedReason === "smtp_not_configured") {
        throw new ServiceUnavailableException(
          "Email OTP delivery is not configured. Set SMTP_HOST and SMTP_FROM on the API service.",
        );
      }
      if (mail.skippedReason === "smtp_send_failed") {
        throw new ServiceUnavailableException(
          "Could not send verification email. Check SMTP credentials and try again.",
        );
      }
      if (mail.skippedReason === "smtp_timeout") {
        throw new ServiceUnavailableException(
          "Email server timed out. On Railway + Hostinger use SMTP_PORT=587 and SMTP_SECURE=false.",
        );
      }
      throw new ServiceUnavailableException(
        "Email OTP delivery failed. Try again shortly.",
      );
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.log.warn(`SMTP OTP failed for ${input.to}: ${String(err)}`);
    }

    if (process.env.NODE_ENV === "production") {
      throw new ServiceUnavailableException(
        "Could not send verification email. Check SMTP credentials and try again.",
      );
    }

    this.log.log(`[dev OTP] ${input.to}: ${input.code}`);
    return { delivered: false, devCode: input.code };
  }
}
