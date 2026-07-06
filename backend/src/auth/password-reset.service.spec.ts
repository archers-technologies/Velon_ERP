import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { IDS } from '../../test/helpers/fixtures';
import {
  createMockAudit,
  createMockPrisma,
  createMockPrismaClient,
} from '../../test/helpers/mocks';
import * as mail from '../common/mail-delivery.util';
import { getAuthOtpSecret } from '../config/env';
import { PasswordResetService } from './password-reset.service';

jest.mock('../common/mail-delivery.util', () => ({
  sendTransactionalMail: jest.fn(),
  formatMailProviderForLog: jest.fn().mockReturnValue('mail=mock'),
}));

describe('PasswordResetService', () => {
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);
  const redisStore = new Map<string, string>();
  const redis = {
    client: {
      get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        redisStore.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
        return 1;
      }),
    },
  };
  const audit = createMockAudit();
  const notifications = {
    notifyPasswordResetOtp: jest.fn().mockResolvedValue({ delivered: true }),
    notifyPasswordChanged: jest.fn().mockResolvedValue(undefined),
    getMailConfigurationStatus: jest.fn().mockReturnValue({ configured: true }),
  };
  const service = new PasswordResetService(prisma, redis as never, audit as never, notifications as never);

  beforeEach(() => {
    jest.clearAllMocks();
    redisStore.clear();
    (mail.sendTransactionalMail as jest.Mock).mockResolvedValue({ delivered: true });
  });

  it('returns a generic message even when the email is unknown', async () => {
    client.user.findUnique.mockResolvedValue(null);
    const result = await service.requestReset('missing@example.test');
    expect(result.message).toMatch(/if an account exists/i);
    expect(redis.client.set).not.toHaveBeenCalled();
  });

  it('stores an OTP for active users without writing to the database password', async () => {
    client.user.findUnique.mockResolvedValue({
      id: IDS.user,
      email: 'user@example.test',
      isActive: true,
    });
    const result = await service.requestReset('user@example.test');
    expect(result.delivered).toBe(true);
    expect(redis.client.set).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.password_reset_requested' }),
    );
    expect(client.user.update).not.toHaveBeenCalled();
  });

  it('rejects invalid OTP codes', async () => {
    const email = 'user@example.test';
    const otpHash = createHash('sha256')
      .update(`${email}:123456:${getAuthOtpSecret()}`)
      .digest('hex');
    redisStore.set(
      `velon:password-reset:otp:${email}`,
      JSON.stringify({
        email,
        userId: IDS.user,
        otpHash,
        attempts: 0,
        createdAt: new Date().toISOString(),
      }),
    );

    await expect(service.verifyResetOtp({ email, code: '000000' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('issues a verification token for a valid OTP', async () => {
    const email = 'user@example.test';
    const code = '654321';
    const otpHash = createHash('sha256')
      .update(`${email}:${code}:${getAuthOtpSecret()}`)
      .digest('hex');
    redisStore.set(
      `velon:password-reset:otp:${email}`,
      JSON.stringify({
        email,
        userId: IDS.user,
        otpHash,
        attempts: 0,
        createdAt: new Date().toISOString(),
      }),
    );
    client.user.findUnique.mockResolvedValue({ id: IDS.user, isActive: true });

    const result = await service.verifyResetOtp({ email, code });
    expect(result.verificationToken).toBeTruthy();
    expect(redisStore.has(`velon:password-reset:otp:${email}`)).toBe(false);
  });
});
