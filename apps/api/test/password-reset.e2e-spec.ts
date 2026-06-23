import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { PrismaClient } from "@velon/database";
import { AppModule } from "../src/app.module";
import { RedisService } from "../src/redis/redis.service";
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
} from "./helpers/password-reset-otp";
import { cleanupTenantUser, disconnectTestDb, seedTenantUser } from "./helpers/tenant-seed";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;
const prisma = new PrismaClient();

function body<T>(res: request.Response): T {
  return (res.body.data ?? res.body) as T;
}

describeIfDb("Password reset OTP flow", () => {
  let app: INestApplication;
  let redis: RedisService;
  const email = `pwd-reset-${Date.now()}@auth.test`;
  const oldPassword = "OldPassphrase123!";
  const newPassword = "NewResetPass123!";

  beforeAll(async () => {
    if (!process.env.REDIS_URL) process.env.REDIS_URL = "redis://127.0.0.1:6379";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    redis = moduleRef.get(RedisService);

    await seedTenantUser({ email, companyName: "Reset Test Co", password: oldPassword });
  });

  afterAll(async () => {
    await cleanupTenantUser(email);
    await app?.close();
    await disconnectTestDb();
  });

  it("returns the same generic message for unknown and known emails", async () => {
    const known = await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset/request")
      .send({ email });
    const unknown = await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset/request")
      .send({ email: `missing-${Date.now()}@auth.test` });

    expect(known.status).toBe(201);
    expect(unknown.status).toBe(201);
    expect(body<{ message: string }>(known).message).toBe(body<{ message: string }>(unknown).message);
  });

  it("completes reset via OTP and allows login with new password", async () => {
    const code = await requestPasswordResetOtp(app, redis, email);
    const verificationToken = await verifyPasswordResetOtp(app, email, code);

    const complete = await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset/complete")
      .send({ email, verificationToken, password: newPassword });
    expect(complete.status).toBe(201);

    const oldLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: oldPassword });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: newPassword });
    expect(newLogin.status).toBe(201);
    expect(body<{ accessToken: string }>(newLogin).accessToken).toBeTruthy();
  });
});
