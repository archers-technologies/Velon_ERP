import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { RedisService } from "../src/redis/redis.service";
import { disconnectTestDb } from "./helpers/tenant-seed";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("Auth signup OTP (Phase 2D.1)", () => {
  let app: INestApplication;
  let redis: RedisService;
  const email = `signup-otp-${Date.now()}@auth.test`;
  const companyName = "OTP Test Corp";
  let devCode = "";

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
  });

  afterAll(async () => {
    await redis.client.del(`velon:signup:otp:${email}`);
    await app?.close();
    await disconnectTestDb();
  });

  it("issues OTP via Redis and returns dev code when SMTP unset", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/signup/request-otp")
      .send({ email, companyName });
    expect(res.status).toBe(201);
    const body = res.body.data ?? res.body;
    expect(body.delivered).toBe(false);
    expect(typeof body.devCode).toBe("string");
    expect(body.devCode).toMatch(/^\d{6}$/);
    devCode = body.devCode;

    const stored = await redis.client.get(`velon:signup:otp:${email}`);
    expect(stored).toBeTruthy();
  });

  it("verifies OTP and returns signup verification token", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/signup/verify-otp")
      .send({ email, code: devCode });
    expect(res.status).toBe(201);
    const body = res.body.data ?? res.body;
    expect(typeof body.verificationToken).toBe("string");
    expect(body.verificationToken.length).toBeGreaterThan(16);

    const stored = await redis.client.get(`velon:signup:otp:${email}`);
    expect(stored).toBeNull();
  });

  it("rejects invalid OTP", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/signup/request-otp")
      .send({ email, companyName })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/signup/verify-otp")
      .send({ email, code: "000000" });
    expect(res.status).toBe(400);
  });
});
