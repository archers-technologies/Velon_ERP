import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import {
  issuePasswordResetVerificationToken,
  verifyPasswordResetVerificationToken,
} from '@velon/shared/password-reset-verification';
import { AuditService } from '../audit/audit.service';
import { formatMailProviderForLog } from '../common/mail-delivery.util';
import { getAuthOtpSecret } from '../config/env';
import { NotificationService } from '../email/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PASSWORD_RESET_GENERIC_MESSAGE } from './dto/password-reset.dto';
import { assertPasswordAllowed } from './password-policy.util';

const OTP_TTL_SEC = 10 * 60;
const VERIFICATION_TTL_SEC = 15 * 60;
const MAX_ATTEMPTS = 5;
const REDIS_OTP_PREFIX = 'velon:password-reset:otp:';
const REDIS_SESSION_PREFIX = 'velon:password-reset:session:';

type OtpRecord = {
  email: string;
  userId: string;
  otpHash: string;
  attempts: number;
  createdAt: string;
};

@Injectable()
export class PasswordResetService {
  private readonly log = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private redisKey(email: string): string {
    return `${REDIS_OTP_PREFIX}${this.normalizeEmail(email)}`;
  }

  private hashOtp(email: string, code: string): string {
    return createHash('sha256')
      .update(`${this.normalizeEmail(email)}:${code}:${getAuthOtpSecret()}`)
      .digest('hex');
  }

  private generateOtp(): string {
    return String(randomInt(100000, 1000000));
  }

  async requestReset(
    email: string,
  ): Promise<{ message: string; delivered?: boolean; devCode?: string }> {
    const normalized = this.normalizeEmail(email);
    const user = await this.prisma.client.user.findUnique({ where: { email: normalized } });

    if (user?.isActive) {
      const code = this.generateOtp();
      const record: OtpRecord = {
        email: normalized,
        userId: user.id,
        otpHash: this.hashOtp(normalized, code),
        attempts: 0,
        createdAt: new Date().toISOString(),
      };
      await this.redis.client.set(
        this.redisKey(normalized),
        JSON.stringify(record),
        'EX',
        OTP_TTL_SEC,
      );

      const mail = await this.deliverOtpEmail({ to: normalized, code });
      await this.audit.log({
        actorId: user.id,
        action: 'auth.password_reset_requested',
        entityType: 'user',
        entityId: user.id,
      });

      if (mail.delivered) {
        return { message: PASSWORD_RESET_GENERIC_MESSAGE, delivered: true };
      }
      if (process.env.NODE_ENV === 'production') {
        return { message: PASSWORD_RESET_GENERIC_MESSAGE, delivered: false };
      }
      return { message: PASSWORD_RESET_GENERIC_MESSAGE, delivered: false, devCode: mail.devCode };
    }

    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  async verifyResetOtp(input: {
    email: string;
    code: string;
  }): Promise<{ verificationToken: string }> {
    const email = this.normalizeEmail(input.email);
    const code = input.code.trim();
    const raw = await this.redis.client.get(this.redisKey(email));
    if (!raw) {
      throw new BadRequestException('Verification code not found. Request a new code.');
    }

    const doc = JSON.parse(raw) as OtpRecord;
    if (doc.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many OTP attempts. Request a new code.');
    }
    if (doc.otpHash !== this.hashOtp(email, code)) {
      doc.attempts += 1;
      await this.redis.client.set(this.redisKey(email), JSON.stringify(doc), 'EX', OTP_TTL_SEC);
      throw new BadRequestException('Invalid verification code.');
    }

    const user = await this.prisma.client.user.findUnique({ where: { id: doc.userId } });
    if (!user?.isActive) {
      await this.redis.client.del(this.redisKey(email));
      throw new BadRequestException('Verification code not found. Request a new code.');
    }

    await this.redis.client.del(this.redisKey(email));
    const verificationToken = issuePasswordResetVerificationToken(getAuthOtpSecret(), email);
    const sessionKey = `${REDIS_SESSION_PREFIX}${email}`;
    await this.redis.client.set(
      sessionKey,
      createHash('sha256').update(verificationToken).digest('hex'),
      'EX',
      VERIFICATION_TTL_SEC,
    );
    return { verificationToken };
  }

  async completeReset(input: { email: string; verificationToken: string; password: string }) {
    const email = this.normalizeEmail(input.email);
    const sessionKey = `${REDIS_SESSION_PREFIX}${email}`;
    const sessionHash = await this.redis.client.get(sessionKey);
    if (!sessionHash) {
      throw new BadRequestException(
        'Verification expired or invalid. Complete OTP verification and try again.',
      );
    }
    const tokenHash = createHash('sha256').update(input.verificationToken).digest('hex');
    if (sessionHash !== tokenHash) {
      throw new BadRequestException(
        'Verification expired or invalid. Complete OTP verification and try again.',
      );
    }

    const valid = verifyPasswordResetVerificationToken(
      getAuthOtpSecret(),
      input.verificationToken,
      email,
    );
    if (!valid) {
      throw new BadRequestException(
        'Verification expired or invalid. Complete OTP verification and try again.',
      );
    }

    const user = await this.prisma.client.user.findUnique({ where: { email } });
    if (!user?.isActive) {
      throw new BadRequestException(
        'Verification expired or invalid. Complete OTP verification and try again.',
      );
    }

    try {
      await assertPasswordAllowed(input.password);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid password.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.client.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      actorId: user.id,
      action: 'auth.password_reset_completed',
      entityType: 'user',
      entityId: user.id,
    });

    await this.redis.client.del(sessionKey);

    const userRecord = await this.prisma.client.user.findUnique({ where: { id: user.id } });
    const membership = await this.prisma.client.tenantMembership.findFirst({
      where: { userId: user.id, isActive: true },
      include: { tenant: { include: { workspace: true } } },
      orderBy: { createdAt: 'asc' },
    });

    void this.notifications
      .notifyPasswordChanged({
        userId: user.id,
        email: user.email,
        userName: userRecord?.name ?? user.email,
        tenantId: membership?.tenantId ?? null,
        workspaceName:
          membership?.tenant.workspace?.name ?? membership?.tenant.name ?? 'Velon ERP Platform',
      })
      .catch(() => undefined);

    return { ok: true as const };
  }

  private async deliverOtpEmail(input: {
    to: string;
    code: string;
  }): Promise<{ delivered: boolean; devCode?: string }> {
    this.log.log(`Password reset OTP email attempt for ${input.to}\n${formatMailProviderForLog()}`);

    const user = await this.prisma.client.user.findUnique({ where: { email: input.to } });
    const result = await this.notifications.notifyPasswordResetOtp({
      email: input.to,
      userName: user?.name ?? input.to,
      code: input.code,
    });

    if (result.delivered) return { delivered: true };

    const mailStatus = this.notifications.getMailConfigurationStatus();
    if (process.env.NODE_ENV !== 'production') {
      this.log.log(`[dev password reset OTP] ${input.to}: ${input.code}`);
      return { delivered: false, devCode: input.code };
    }

    if (!mailStatus.configured) {
      throw new ServiceUnavailableException(
        'Email delivery is not configured. Set RESEND_API_KEY + RESEND_FROM on the API service (recommended on Railway), or set MAIL_PROVIDER=smtp with SMTP credentials.',
      );
    }

    throw new ServiceUnavailableException(
      'Could not send verification email. Check mail provider credentials and try again.',
    );
  }
}
