import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, TenantStatus } from '@velon/database';
import { AppModule } from '../src/app.module';
import { PASSWORD_RESET_GENERIC_MESSAGE } from '../src/auth/dto/password-reset.dto';
import { RedisService } from '../src/redis/redis.service';
import {
  seedPasswordResetOtp,
  seedPasswordResetVerification,
  verifyPasswordResetOtp,
} from './helpers/password-reset-otp';
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from './helpers/tenant-seed';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;
const prisma = new PrismaClient();

function body<T>(res: request.Response): T {
  return (res.body.data ?? res.body) as T;
}

describeIfDb('Auth hardening audit', () => {
  let app: INestApplication;
  let redis: RedisService;
  const tag = Date.now();
  const email = `auth-audit-${tag}@auth.test`;
  let currentPassword = 'AuditPassphrase1!';
  const newPassword = 'NewResetPass123!';

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://127.0.0.1:6379';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    redis = moduleRef.get(RedisService);
    await seedTenantUser({ email, companyName: `Audit Co ${tag}`, password: currentPassword });
  });

  afterAll(async () => {
    await cleanupTenantUser(email);
    await app?.close();
    await disconnectTestDb();
  });

  describe('Task 1 — Password reset enumeration', () => {
    it('returns identical message and only stores OTP for active accounts', async () => {
      const unknownEmail = `missing-${tag}@auth.test`;
      const otpKey = (addr: string) => `${'velon:password-reset:otp:'}${addr.trim().toLowerCase()}`;

      const unknown = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email: unknownEmail });
      expect(await redis.client.get(otpKey(unknownEmail))).toBeNull();

      const existing = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email });
      expect(await redis.client.get(otpKey(email))).toBeTruthy();
      await redis.client.del(otpKey(email));

      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { isActive: false },
      });
      const disabled = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email });
      expect(await redis.client.get(otpKey(email))).toBeNull();
      await prisma.user.update({ where: { email: email.toLowerCase() }, data: { isActive: true } });

      const membership = await prisma.tenantMembership.findFirstOrThrow({
        where: { user: { email: email.toLowerCase() } },
      });
      await prisma.tenant.update({
        where: { id: membership.tenantId },
        data: { status: TenantStatus.SUSPENDED },
      });
      const suspended = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email });
      await prisma.tenant.update({
        where: { id: membership.tenantId },
        data: { status: TenantStatus.TRIAL },
      });

      for (const res of [unknown, existing, disabled, suspended]) {
        expect(res.status).toBe(201);
        expect(body<{ message: string }>(res).message).toBe(PASSWORD_RESET_GENERIC_MESSAGE);
      }
    });
  });

  describe('Task 2 — OTP validation', () => {
    it('rejects invalid codes, replays, and enforces max attempts', async () => {
      const code = await seedPasswordResetOtp(prisma, redis, email);

      const bad = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/verify-otp')
        .send({ email, code: '000000' });
      expect(bad.status).toBe(400);

      const verificationToken = await verifyPasswordResetOtp(app, email, code);

      const replayOtp = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/verify-otp')
        .send({ email, code });
      expect(replayOtp.status).toBe(400);

      const first = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/complete')
        .send({ email, verificationToken, password: newPassword });
      expect(first.status).toBe(201);
      currentPassword = newPassword;

      const replayComplete = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/complete')
        .send({ email, verificationToken, password: 'AnotherPass123!' });
      expect(replayComplete.status).toBe(400);
    });

    it('locks out after five invalid OTP attempts', async () => {
      await seedPasswordResetOtp(prisma, redis, email);
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/password-reset/verify-otp')
          .send({ email, code: '000000' });
      }
      const locked = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/verify-otp')
        .send({ email, code: '000000' });
      expect(locked.status).toBe(400);
      expect(JSON.stringify(locked.body)).toMatch(/Too many OTP attempts/i);
    });
  });

  describe('Task 3 — Session invalidation after reset', () => {
    it('revokes refresh tokens; access JWT remains valid until expiry (documented gap)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: currentPassword });
      expect(loginRes.status).toBe(201);
      const session = body<{ accessToken: string; refreshToken: string }>(loginRes);

      const code = await seedPasswordResetOtp(prisma, redis, email);
      const verificationToken = await verifyPasswordResetOtp(app, email, code);
      const nextPass = 'UpdatedPass123!';
      const reset = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/complete')
        .send({ email, verificationToken, password: nextPass });
      expect(reset.status).toBe(201);
      currentPassword = nextPass;

      const refresh = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken });
      expect(refresh.status).toBe(401);

      const api = await request(app.getHttpServer())
        .get('/api/v1/workspace/context')
        .set('Authorization', `Bearer ${session.accessToken}`);
      expect(api.status).toBe(200);

      const newLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: nextPass });
      expect(newLogin.status).toBe(201);
    });
  });

  describe('Task 4 — Password policy', () => {
    it('rejects weak and short passwords on reset completion', async () => {
      const verificationToken = await seedPasswordResetVerification(redis, email);

      const short = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/complete')
        .send({ email, verificationToken, password: 'short' });
      expect(short.status).toBe(400);

      const verificationToken2 = await seedPasswordResetVerification(redis, email);
      const weak = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/complete')
        .send({ email, verificationToken: verificationToken2, password: 'password123' });
      expect(weak.status).toBe(400);
    });
  });

  describe('Task 5 — Production response shape', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('never returns devCode from signup or password reset OTP in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const signup = await request(app.getHttpServer())
        .post('/api/v1/auth/signup/request-otp')
        .send({ email: `prod-shape-${tag}@readiness.test`, companyName: 'Prod Corp' });
      expect(signup.body.devCode).toBeUndefined();
      expect(signup.body.data?.devCode).toBeUndefined();

      const reset = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email });
      expect(reset.body.devCode).toBeUndefined();
      expect(reset.body.data?.devCode).toBeUndefined();
    });

    it('password reset responses never include raw OTP hashes or verification tokens on request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ email });
      const payload = JSON.stringify(res.body);
      expect(payload).not.toMatch(/velon:password-reset:/);
      expect(payload).not.toMatch(/reset-password\?token=/);
      expect(payload).not.toMatch(/verificationToken/);
    });
  });
});
