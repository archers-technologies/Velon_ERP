import { createHash, randomInt } from "node:crypto";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@velon/database";
import { issuePasswordResetVerificationToken } from "../../../../packages/shared/src/password-reset-verification";
import { RedisService } from "../../src/redis/redis.service";

const OTP_KEY_PREFIX = "velon:password-reset:otp:";
const SESSION_KEY_PREFIX = "velon:password-reset:session:";

function body<T>(res: request.Response): T {
  return (res.body.data ?? res.body) as T;
}

function otpHash(email: string, code: string): string {
  const secret = process.env.AUTH_OTP_SECRET ?? "";
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${code}:${secret}`)
    .digest("hex");
}

export async function seedPasswordResetOtp(
  prisma: PrismaClient,
  redis: RedisService,
  email: string,
  code = String(randomInt(100000, 1000000)),
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUniqueOrThrow({ where: { email: normalized } });
  const record = {
    email: normalized,
    userId: user.id,
    otpHash: otpHash(normalized, code),
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await redis.client.set(`${OTP_KEY_PREFIX}${normalized}`, JSON.stringify(record), "EX", 600);
  return code;
}

export async function resolvePasswordResetOtp(
  redis: RedisService,
  email: string,
  devCode?: string,
): Promise<string> {
  if (devCode?.match(/^\d{6}$/)) return devCode;

  const stored = await redis.client.get(`${OTP_KEY_PREFIX}${email.trim().toLowerCase()}`);
  if (!stored) throw new Error("No password reset OTP in Redis");
  const record = JSON.parse(stored) as { otpHash: string };
  const secret = process.env.AUTH_OTP_SECRET ?? "";
  const normalized = email.trim().toLowerCase();

  for (let i = 100000; i < 1000000; i++) {
    const code = String(i);
    const hash = createHash("sha256").update(`${normalized}:${code}:${secret}`).digest("hex");
    if (hash === record.otpHash) return code;
  }
  throw new Error("Could not resolve password reset OTP from Redis");
}

export async function requestPasswordResetOtp(
  app: INestApplication,
  redis: RedisService,
  email: string,
): Promise<string> {
  await redis.client.del(`${OTP_KEY_PREFIX}${email.trim().toLowerCase()}`);

  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/password-reset/request")
    .send({ email });
  expect(res.status).toBe(201);
  const payload = body<{ devCode?: string }>(res);
  return resolvePasswordResetOtp(redis, email, payload.devCode);
}

export async function seedPasswordResetVerification(
  redis: RedisService,
  email: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const secret = process.env.AUTH_OTP_SECRET ?? "";
  const verificationToken = issuePasswordResetVerificationToken(secret, normalized);
  await redis.client.set(
    `${SESSION_KEY_PREFIX}${normalized}`,
    createHash("sha256").update(verificationToken).digest("hex"),
    "EX",
    900,
  );
  return verificationToken;
}

export async function verifyPasswordResetOtp(
  app: INestApplication,
  email: string,
  code: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/password-reset/verify-otp")
    .send({ email, code });
  expect(res.status).toBe(201);
  return body<{ verificationToken: string }>(res).verificationToken;
}
